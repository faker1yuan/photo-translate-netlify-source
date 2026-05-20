import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera,
  CheckCircle2,
  CircleX,
  Image as ImageIcon,
  Languages,
  LoaderCircle,
  RefreshCcw,
  ScanText,
  Upload,
  Wand2,
} from 'lucide-react'
import './App.css'
import { SAMPLE_IMAGE_SIZE, sampleImageUrl, sampleRegions } from './sampleData'
import { translateBatch } from './services/translate'
import {
  languageOptions,
  targetLanguageOptions,
  type AppPhase,
  type ImageSize,
  type OverlayMode,
  type TranslationProvider,
  type TranslationRegion,
} from './types'

const initialSize: ImageSize = { width: 0, height: 0 }
const overlayPlacementPadding = 8
const overlayCollisionGap = 6

type OverlayLayout = {
  id: string
  text: string
  index: number
  compact: boolean
  x: number
  y: number
  width: number
  height: number
}

type LayoutRect = {
  x: number
  y: number
  width: number
  height: number
}

type OcrModule = typeof import('./services/ocr')

function App() {
  const [sourceLang, setSourceLang] = useState(languageOptions[0].code)
  const [targetLang, setTargetLang] = useState(targetLanguageOptions[0].code)
  const [phase, setPhase] = useState<AppPhase>('empty')
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [imageName, setImageName] = useState('')
  const [imageSize, setImageSize] = useState<ImageSize>(initialSize)
  const [renderedImageSize, setRenderedImageSize] = useState<ImageSize>(initialSize)
  const [regions, setRegions] = useState<TranslationRegion[]>([])
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('translated')
  const [progress, setProgress] = useState(0)
  const [statusLine, setStatusLine] = useState('等待图片')
  const [errorMessage, setErrorMessage] = useState('')
  const [provider, setProvider] = useState<TranslationProvider>('none')

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const ocrModulePromiseRef = useRef<Promise<OcrModule> | null>(null)
  const runIdRef = useRef(0)

  const selectedSource = useMemo(
    () => languageOptions.find((item) => item.code === sourceLang) ?? languageOptions[0],
    [sourceLang],
  )

  const selectedTarget = useMemo(
    () =>
      targetLanguageOptions.find((item) => item.code === targetLang) ??
      targetLanguageOptions[0],
    [targetLang],
  )

  const isBusy = phase === 'ocr' || phase === 'translating'
  const hasImage = Boolean(imageSrc)
  const translatedCount = regions.filter((item) => item.translatedText).length
  const confidenceAverage =
    regions.length === 0
      ? 0
      : Math.round(
          regions.reduce((total, item) => total + Math.max(item.confidence, 0), 0) /
            regions.length,
        )
  const overlayLayouts = useMemo(
    () => createOverlayLayouts(regions, imageSize, renderedImageSize, overlayMode),
    [regions, imageSize, renderedImageSize, overlayMode],
  )

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      void ocrModulePromiseRef.current?.then((ocrModule) => ocrModule.terminateOcrWorker())

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const image = imageRef.current
    if (!imageSrc || !image) {
      setRenderedImageSize(initialSize)
      return
    }

    const updateRenderedSize = () => {
      setRenderedImageSize({
        width: image.clientWidth,
        height: image.clientHeight,
      })
    }

    updateRenderedSize()
    const observer = new ResizeObserver(updateRenderedSize)
    observer.observe(image)
    window.addEventListener('resize', updateRenderedSize)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateRenderedSize)
    }
  }, [imageSrc])

  useEffect(() => {
    if (ocrModulePromiseRef.current) {
      void ocrModulePromiseRef.current.then((ocrModule) => ocrModule.terminateOcrWorker())
    }
  }, [sourceLang])

  const resetResult = () => {
    setRegions([])
    setProgress(0)
    setProvider('none')
    setErrorMessage('')
  }

  const loadOcrModule = () => {
    ocrModulePromiseRef.current ??= import('./services/ocr')
    return ocrModulePromiseRef.current
  }

  const cancelActiveProcessing = () => {
    if (!isBusy) {
      return
    }

    runIdRef.current += 1
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setPhase(imageSrc ? 'ready' : 'empty')
    setStatusLine('已取消识别')
    setProgress(0)
    setErrorMessage('')
    void ocrModulePromiseRef.current?.then((ocrModule) => ocrModule.terminateOcrWorker())
  }

  const loadFile = (file: File) => {
    cancelActiveProcessing()

    if (!file.type.startsWith('image/')) {
      setErrorMessage('请选择图片文件。')
      setPhase('error')
      return
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
    }

    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    setImageSrc(url)
    setImageName(file.name)
    setImageSize(initialSize)
    setRenderedImageSize(initialSize)
    setPhase('ready')
    setStatusLine('图片已载入')
    resetResult()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      loadFile(file)
    }
    event.currentTarget.value = ''
  }

  const loadSample = () => {
    cancelActiveProcessing()

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }

    setImageSrc(sampleImageUrl)
    setImageName('示例图片')
    setImageSize(SAMPLE_IMAGE_SIZE)
    setRenderedImageSize(initialSize)
    setRegions(sampleRegions)
    setOverlayMode('translated')
    setPhase('translated')
    setProvider('demo')
    setProgress(100)
    setStatusLine(`识别 ${sampleRegions.length} 处文字`)
    setErrorMessage('')
  }

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget
    const width = image.naturalWidth || imageSize.width
    const height = image.naturalHeight || imageSize.height
    if (width && height) {
      setImageSize({ width, height })
    }
    setRenderedImageSize({
      width: image.clientWidth,
      height: image.clientHeight,
    })
  }

  const startTranslate = async () => {
    const imageElement = imageRef.current
    if (!imageElement || !imageSrc) {
      setErrorMessage('请先拍照或选择一张图片。')
      setPhase('error')
      return
    }

    if (!imageSize.width || !imageSize.height) {
      setErrorMessage('图片还没有完成载入，请稍后再试。')
      setPhase('error')
      return
    }

    const runId = runIdRef.current + 1
    runIdRef.current = runId
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    const isCurrentRun = () => runIdRef.current === runId && !abortController.signal.aborted

    try {
      resetResult()
      setPhase('ocr')
      setProgress(2)
      setStatusLine('正在加载 OCR（图片文字识别）代码')

      const ocrModule = await loadOcrModule()
      if (!isCurrentRun()) {
        return
      }

      const detected = await ocrModule.recognizeImage({
        image: imageElement,
        imageSize,
        lang: selectedSource.ocrCode,
        onProgress: (next) => {
          if (isCurrentRun()) {
            setProgress(next.progress)
            setStatusLine(next.label)
          }
        },
        signal: abortController.signal,
      })

      if (!isCurrentRun()) {
        return
      }

      if (detected.length === 0) {
        setPhase('error')
        setStatusLine('未识别到文字')
        setErrorMessage('这张图片没有找到可用文字。可以换一张更清晰、文字更大的图片。')
        return
      }

      setRegions(detected)
      setPhase('translating')
      setProgress(92)
      setStatusLine('正在翻译识别结果')

      const translated = await translateBatch({
        texts: detected.map((item) => item.originalText),
        source: selectedSource.translateCode,
        target: selectedTarget.translateCode,
        signal: abortController.signal,
      })

      if (!isCurrentRun()) {
        return
      }

      setRegions(
        detected.map((item, index) => ({
          ...item,
          translatedText: translated.texts[index] ?? item.originalText,
        })),
      )
      setProvider(translated.provider)
      setPhase('translated')
      setProgress(100)
      setStatusLine(`识别 ${detected.length} 处文字`)
      setOverlayMode('translated')
    } catch (error) {
      if (
        runIdRef.current === runId &&
        (abortController.signal.aborted ||
          (error instanceof Error &&
            (error.name === 'OcrCancelledError' || error.name === 'AbortError')))
      ) {
        setPhase(imageSrc ? 'ready' : 'empty')
        setProgress(0)
        setStatusLine('已取消识别')
        setErrorMessage('')
        return
      }

      if (runIdRef.current !== runId) {
        return
      }

      const message = error instanceof Error ? error.message : '处理失败，请稍后再试。'
      setPhase('error')
      setStatusLine('处理失败')
      setErrorMessage(message)
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null
      }
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Languages size={20} strokeWidth={2.4} />
          </span>
          <div>
            <h1>拍照翻译</h1>
            <p>已对齐到图片位置</p>
          </div>
        </div>

        <div className="language-controls" aria-label="语言设置">
          <label>
            <span>原文</span>
            <select
              value={sourceLang}
              onChange={(event) => setSourceLang(event.target.value)}
              disabled={isBusy}
            >
              {languageOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>译文</span>
            <select
              value={targetLang}
              onChange={(event) => setTargetLang(event.target.value)}
              disabled={isBusy}
            >
              {targetLanguageOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <section className="workspace">
        <div className="canvas-panel">
          <div className="canvas-toolbar">
            <div>
              <p className="eyebrow">{statusLine}</p>
              <h2>{imageName || '等待图片'}</h2>
            </div>
            <div className="mode-switch" aria-label="覆盖显示模式">
              <button
                type="button"
                className={overlayMode === 'original' ? 'active' : ''}
                onClick={() => setOverlayMode('original')}
                disabled={regions.length === 0}
              >
                原文
              </button>
              <button
                type="button"
                className={overlayMode === 'translated' ? 'active' : ''}
                onClick={() => setOverlayMode('translated')}
                disabled={regions.length === 0}
              >
                译文
              </button>
            </div>
          </div>

          <div className={`image-stage ${hasImage ? 'has-image' : ''}`}>
            {imageSrc ? (
              <div className="image-frame">
                <img ref={imageRef} src={imageSrc} alt="待翻译图片" onLoad={handleImageLoad} />
                <div className="overlay-layer" aria-label="图片上的翻译覆盖层">
                  {overlayLayouts.map((layout) => (
                    <div
                      className={`text-overlay ${layout.compact ? 'compact' : ''}`}
                      data-overlay-id={layout.id}
                      data-overlay-index={layout.index + 1}
                      key={layout.id}
                      style={{
                        left: `${layout.x}px`,
                        top: `${layout.y}px`,
                        width: `${layout.width}px`,
                        minHeight: `${layout.height}px`,
                      }}
                    >
                      <span className="overlay-text">{layout.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <ScanText size={42} strokeWidth={1.8} />
                <h2>等待图片</h2>
                <p>拍照或选图后开始</p>
              </div>
            )}
          </div>

          {(phase === 'ocr' || phase === 'translating') && (
            <div className="progress-row" aria-live="polite">
              <LoaderCircle className="spin" size={18} />
              <div className="progress-track">
                <span style={{ width: `${progress}%` }} />
              </div>
              <strong>{Math.round(progress)}%</strong>
            </div>
          )}

          {errorMessage && (
            <div className="message error" role="alert">
              {errorMessage}
            </div>
          )}

          <div className="action-strip">
            <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={isBusy}>
              <Camera size={18} />
              拍照
            </button>
            <button type="button" onClick={() => uploadInputRef.current?.click()} disabled={isBusy}>
              <Upload size={18} />
              选图
            </button>
            <button type="button" className="primary" onClick={startTranslate} disabled={!hasImage || isBusy}>
              {isBusy ? <LoaderCircle className="spin" size={18} /> : <Wand2 size={18} />}
              开始翻译
            </button>
            {isBusy && (
              <button type="button" className="danger" onClick={cancelActiveProcessing}>
                <CircleX size={18} />
                取消
              </button>
            )}
            <button type="button" className="ghost" onClick={loadSample} disabled={isBusy}>
              <ImageIcon size={18} />
              试用示例
            </button>
          </div>

          <input
            ref={cameraInputRef}
            className="hidden-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
          />
          <input
            ref={uploadInputRef}
            className="hidden-input"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>

        <aside className="result-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">已对齐到图片位置</p>
              <h2>翻译结果</h2>
            </div>
            <span className="count-pill">识别 {regions.length} 处文字</span>
          </div>

          <div className="stats-row">
            <div>
              <strong>{translatedCount}</strong>
              <span>已翻译</span>
            </div>
            <div>
              <strong>{confidenceAverage || '-'}</strong>
              <span>识别可信度</span>
            </div>
          </div>

          <div className={`provider-note ${provider === 'api' ? 'success' : ''}`}>
            {provider === 'api' ? (
              <>
                <CheckCircle2 size={16} />
                已调用 DeepSeek 翻译接口
              </>
            ) : provider === 'demo' ? (
              <>
                <RefreshCcw size={16} />
                当前为演示译文，未配置真实翻译接口
              </>
            ) : (
              <>
                <ScanText size={16} />
                等待识别与翻译
              </>
            )}
          </div>
        </aside>
      </section>
    </main>
  )
}

const createOverlayLayouts = (
  regions: TranslationRegion[],
  imageSize: ImageSize,
  renderedImageSize: ImageSize,
  overlayMode: OverlayMode,
): OverlayLayout[] => {
  if (!imageSize.width || !imageSize.height || !renderedImageSize.width || !renderedImageSize.height) {
    return []
  }

  const placed: LayoutRect[] = []
  const scaleX = renderedImageSize.width / imageSize.width
  const scaleY = renderedImageSize.height / imageSize.height

  return regions.map((region, index) => {
    const text =
      overlayMode === 'translated' ? region.translatedText || '翻译中' : region.originalText
    const renderedBox = {
      x: region.box.x * scaleX,
      y: region.box.y * scaleY,
      width: region.box.width * scaleX,
      height: region.box.height * scaleY,
    }
    const width = estimateOverlayWidth(text, renderedImageSize)
    const height = estimateOverlayHeight(text, width)
    const compact = width < 96 || height < 26
    const candidates = createPlacementCandidates(renderedBox, { width, height }, renderedImageSize)
    const best = pickBestPlacement(candidates, placed, renderedBox)

    placed.push(expandRect(best, overlayCollisionGap))

    return {
      id: region.id,
      text,
      index,
      compact,
      ...best,
    }
  })
}

const estimateOverlayWidth = (text: string, renderedImageSize: ImageSize) => {
  const textUnits = Array.from(text).reduce((total, char) => {
    if (/\s/.test(char)) {
      return total + 0.35
    }
    if (/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(char)) {
      return total + 1
    }
    if (/[0-9.,:;/$€¥￥-]/.test(char)) {
      return total + 0.55
    }
    return total + 0.68
  }, 0)

  const ideal = 16 + textUnits * 11.2
  const maxWidth = Math.min(renderedImageSize.width * 0.34, 190)

  return clamp(ideal, 58, Math.max(58, maxWidth))
}

const estimateOverlayHeight = (text: string, width: number) => {
  const usableWidth = Math.max(1, width - 10)
  const renderedTextWidth = Array.from(text).reduce((total, char) => {
    if (/\s/.test(char)) {
      return total + 3.4
    }
    if (/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(char)) {
      return total + 10.5
    }
    return total + 6.3
  }, 0)
  const lines = Math.min(2, Math.max(1, Math.ceil(renderedTextWidth / usableWidth)))

  return lines === 1 ? 22 : 36
}

const createPlacementCandidates = (
  box: LayoutRect,
  size: Pick<LayoutRect, 'width' | 'height'>,
  imageSize: ImageSize,
) => {
  const gap = Math.max(overlayCollisionGap, imageSize.width * 0.006)
  const shifts = [
    { x: box.x, y: box.y - size.height - gap },
    { x: box.x, y: box.y + box.height + gap },
    { x: box.x + box.width + gap, y: box.y },
    { x: box.x - size.width - gap, y: box.y },
    { x: box.x + box.width + gap, y: box.y - size.height * 0.45 },
    { x: box.x - size.width - gap, y: box.y - size.height * 0.45 },
    { x: box.x + box.width + gap, y: box.y + box.height - size.height * 0.55 },
    { x: box.x - size.width - gap, y: box.y + box.height - size.height * 0.55 },
    { x: box.x, y: box.y },
  ]
  const scanOffsets = [-2, -1, 1, 2].flatMap((step) => [
    { x: box.x + step * size.width * 0.42, y: box.y },
    { x: box.x, y: box.y + step * size.height * 0.8 },
  ])

  return [...shifts, ...scanOffsets].map((candidate) =>
    clampRect({ ...candidate, ...size }, imageSize),
  )
}

const pickBestPlacement = (
  candidates: LayoutRect[],
  placed: LayoutRect[],
  anchor: LayoutRect,
): LayoutRect => {
  let best = candidates[0]
  let bestScore = Number.POSITIVE_INFINITY

  for (const candidate of candidates) {
    const overlapArea = placed.reduce((total, rect) => total + intersectionArea(candidate, rect), 0)
    const distance = Math.abs(candidate.x - anchor.x) + Math.abs(candidate.y - anchor.y)
    const score = overlapArea * 1000 + distance

    if (score < bestScore) {
      best = candidate
      bestScore = score
    }

    if (overlapArea === 0) {
      break
    }
  }

  return best
}

const clampRect = (rect: LayoutRect, imageSize: ImageSize): LayoutRect => {
  const padding = Math.min(overlayPlacementPadding, imageSize.width * 0.012)
  const width = Math.min(rect.width, imageSize.width - padding * 2)
  const height = Math.min(rect.height, imageSize.height - padding * 2)

  return {
    x: clamp(rect.x, padding, imageSize.width - width - padding),
    y: clamp(rect.y, padding, imageSize.height - height - padding),
    width,
    height,
  }
}

const expandRect = (rect: LayoutRect, amount: number): LayoutRect => ({
  x: rect.x - amount,
  y: rect.y - amount,
  width: rect.width + amount * 2,
  height: rect.height + amount * 2,
})

const intersectionArea = (first: LayoutRect, second: LayoutRect) => {
  const width = Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x))
  const height = Math.max(0, Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y))

  return width * height
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export default App
