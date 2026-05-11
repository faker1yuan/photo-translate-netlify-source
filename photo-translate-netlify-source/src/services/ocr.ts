import { createWorker, PSM } from 'tesseract.js'
import type { ImageSize, OcrProgress, TranslationRegion } from '../types'

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
}

const progressLabels: Record<string, string> = {
  'loading tesseract core': '加载 OCR（图片文字识别）引擎',
  'loading language traineddata': '加载识别语言包',
  'initializing tesseract': '初始化 OCR（图片文字识别）',
  'recognizing text': '正在识别图片文字',
}

export const recognizeImage = async ({
  image,
  imageSize,
  lang,
  onProgress,
}: RecognizeImageParams): Promise<TranslationRegion[]> => {
  const worker = await createWorker(lang, 1, {
    logger: (message) => {
      const label = progressLabels[message.status] ?? message.status
      const progress = Math.min(90, Math.max(4, Math.round(message.progress * 90)))
      onProgress({ progress, label })
    },
  })

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: '1',
      user_defined_dpi: '300',
    })

    const result = await worker.recognize(image, {}, { blocks: true, text: true })
    const page = result.data as OcrPage
    return extractLines(page, imageSize)
  } finally {
    await worker.terminate()
  }
}

const extractLines = (page: OcrPage, imageSize: ImageSize): TranslationRegion[] => {
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
      const x = clamp(line.bbox.x0, 0, imageSize.width)
      const y = clamp(line.bbox.y0, 0, imageSize.height)
      const right = clamp(line.bbox.x1, x + 1, imageSize.width)
      const bottom = clamp(line.bbox.y1, y + 1, imageSize.height)

      return {
        id: `ocr-${index}-${x}-${y}`,
        originalText: line.text,
        translatedText: '',
        confidence: line.confidence,
        box: {
          x,
          y,
          width: Math.max(1, right - x),
          height: Math.max(1, bottom - y),
        },
      }
    })
}

const normaliseText = (text: string) => text.replace(/\s+/g, ' ').trim()

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
