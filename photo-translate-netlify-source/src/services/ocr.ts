import { createWorker, OEM, PSM } from 'tesseract.js'
import type { ImageSize, OcrProgress, TranslationRegion } from '../types'
import { getOcrLanguagePackPath, ocrAssetPaths } from './ocrAssets'

type BBox = {
  x0: number
  y0: number
  x1: number
  y1: number
}

type OcrLine = {
  text: string
  confidence: number
  bbox: BBox
}

type OcrPage = {
  blocks: Array<{
    paragraphs: Array<{
      lines: OcrLine[]
    }>
  }> | null
  text: string
}

type RecognizeImageParams = {
  image: HTMLImageElement
  imageSize: ImageSize
  lang: string
  onProgress: (progress: OcrProgress) => void
  signal?: AbortSignal
}

type OcrInput = {
  image: HTMLImageElement | HTMLCanvasElement
  imageSize: ImageSize
}

const progressLabels: Record<string, string> = {
  'loading tesseract core': '加载 OCR（图片文字识别）引擎',
  'loading language traineddata': '加载识别语言包',
  'initializing tesseract': '初始化 OCR（图片文字识别）',
  'recognizing text': '正在识别图片文字',
}

const maxOcrImageEdge = 2200

type TesseractWorker = Awaited<ReturnType<typeof createWorker>>

let activeProgressHandler: ((progress: OcrProgress) => void) | null = null
let currentWorker: { lang: string; worker: TesseractWorker } | null = null
let workerVersion = 0

export class OcrCancelledError extends Error {
  constructor() {
    super('识别已取消。')
    this.name = 'OcrCancelledError'
  }
}

export const isOcrCancelError = (error: unknown) =>
  error instanceof OcrCancelledError ||
  (error instanceof DOMException && error.name === 'AbortError')

export const terminateOcrWorker = async () => {
  workerVersion += 1
  const workerToTerminate = currentWorker?.worker
  currentWorker = null
  activeProgressHandler = null

  if (workerToTerminate) {
    await workerToTerminate.terminate().catch(() => undefined)
  }
}

export const recognizeImage = async ({
  image,
  imageSize,
  lang,
  onProgress,
  signal,
}: RecognizeImageParams): Promise<TranslationRegion[]> => {
  throwIfCancelled(signal)
  activeProgressHandler = onProgress
  onProgress({ progress: 4, label: '准备 OCR（图片文字识别）资源' })

  try {
    const ocrInput = createOcrInput(image, imageSize)
    if (ocrInput.image !== image) {
      onProgress({ progress: 8, label: '正在压缩大图，提升识别速度' })
    }

    const worker = await getReusableWorker(lang, signal)
    throwIfCancelled(signal)
    onProgress({ progress: 18, label: 'OCR（图片文字识别）资源已就绪' })

    const result = await raceWithCancel(
      worker.recognize(ocrInput.image, {}, { blocks: true, text: true }),
      signal,
    )
    const page = result.data as OcrPage
    throwIfCancelled(signal)
    return extractLines(page, ocrInput.imageSize, imageSize)
  } finally {
    activeProgressHandler = null
  }
}

const getReusableWorker = async (lang: string, signal?: AbortSignal) => {
  throwIfCancelled(signal)

  if (currentWorker?.lang === lang) {
    return currentWorker.worker
  }

  if (currentWorker) {
    await terminateOcrWorker()
  }

  const versionAtStart = workerVersion
  await ensureLanguagePackAvailable(lang, signal)

  const worker = await createWorker(lang, OEM.LSTM_ONLY, {
    ...ocrAssetPaths,
    workerBlobURL: false,
    gzip: true,
    logger: (message) => {
      const label = progressLabels[message.status] ?? message.status
      const progress = Math.min(88, Math.max(8, Math.round(message.progress * 80) + 8))
      activeProgressHandler?.({ progress, label })
    },
  })

  try {
    throwIfCancelled(signal)

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: '1',
      user_defined_dpi: '300',
    })

    if (versionAtStart === workerVersion) {
      currentWorker = { lang, worker }
      return worker
    }

    await worker.terminate().catch(() => undefined)
    throw new OcrCancelledError()
  } catch (error) {
    await worker.terminate().catch(() => undefined)
    throw error
  }
}

const ensureLanguagePackAvailable = async (lang: string, signal?: AbortSignal) => {
  const languagePackPath = getOcrLanguagePackPath(lang)
  const response = await fetch(languagePackPath, {
    method: 'HEAD',
    cache: 'force-cache',
    signal,
  })

  const contentType = response.headers.get('Content-Type') ?? ''
  if (!response.ok || contentType.includes('text/html')) {
    throw new Error(
      `本地 OCR（图片文字识别）语言包缺失：${languagePackPath}。请先把对应语言包放到 public/ocr/lang/。`,
    )
  }
}

const createOcrInput = (image: HTMLImageElement, imageSize: ImageSize): OcrInput => {
  const maxEdge = Math.max(imageSize.width, imageSize.height)
  if (maxEdge <= maxOcrImageEdge) {
    return { image, imageSize }
  }

  const scale = maxOcrImageEdge / maxEdge
  const width = Math.max(1, Math.round(imageSize.width * scale))
  const height = Math.max(1, Math.round(imageSize.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d', { alpha: false })
  if (!context) {
    return { image, imageSize }
  }

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, width, height)

  return {
    image: canvas,
    imageSize: { width, height },
  }
}

const extractLines = (
  page: OcrPage,
  ocrImageSize: ImageSize,
  originalImageSize: ImageSize,
): TranslationRegion[] => {
  const lines =
    page.blocks?.flatMap((block) =>
      block.paragraphs.flatMap((paragraph) =>
        paragraph.lines.map((line) => ({
          ...line,
          text: normaliseText(line.text),
        })),
      ),
    ) ?? []

  return lines
    .filter((line) => line.text.length > 1 && line.confidence >= 35)
    .map((line, index) => {
      const scaleX = originalImageSize.width / ocrImageSize.width
      const scaleY = originalImageSize.height / ocrImageSize.height
      const ocrX = clamp(line.bbox.x0, 0, ocrImageSize.width)
      const ocrY = clamp(line.bbox.y0, 0, ocrImageSize.height)
      const ocrRight = clamp(line.bbox.x1, ocrX + 1, ocrImageSize.width)
      const ocrBottom = clamp(line.bbox.y1, ocrY + 1, ocrImageSize.height)
      const x = ocrX * scaleX
      const y = ocrY * scaleY
      const right = ocrRight * scaleX
      const bottom = ocrBottom * scaleY

      return {
        id: `ocr-${index}-${Math.round(x)}-${Math.round(y)}`,
        originalText: line.text,
        translatedText: '',
        confidence: line.confidence,
        box: {
          x: Math.round(x),
          y: Math.round(y),
          width: Math.max(1, Math.round(right - x)),
          height: Math.max(1, Math.round(bottom - y)),
        },
      }
    })
}

const normaliseText = (text: string) => text.replace(/\s+/g, ' ').trim()

const raceWithCancel = async <T>(task: Promise<T>, signal?: AbortSignal): Promise<T> => {
  if (!signal) {
    return task
  }

  throwIfCancelled(signal)

  return new Promise<T>((resolve, reject) => {
    const abort = () => {
      void terminateOcrWorker()
      reject(new OcrCancelledError())
    }

    signal.addEventListener('abort', abort, { once: true })

    task
      .then(resolve)
      .catch(reject)
      .finally(() => {
        signal.removeEventListener('abort', abort)
      })
  })
}

const throwIfCancelled = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new OcrCancelledError()
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
