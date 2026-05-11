export type AppPhase = 'empty' | 'ready' | 'ocr' | 'translating' | 'translated' | 'error'

export type OverlayMode = 'original' | 'translated'

export type TranslationProvider = 'none' | 'api' | 'demo'

export type ImageSize = {
  width: number
  height: number
}

export type RegionBox = {
  x: number
  y: number
  width: number
  height: number
}

export type TranslationRegion = {
  id: string
  originalText: string
  translatedText: string
  confidence: number
  box: RegionBox
}

export type OcrProgress = {
  progress: number
  label: string
}

export type LanguageOption = {
  code: string
  label: string
  ocrCode: string
  translateCode: string
}

export type TargetLanguageOption = {
  code: string
  label: string
  translateCode: string
}

export const languageOptions: LanguageOption[] = [
  { code: 'eng', label: '英语', ocrCode: 'eng', translateCode: 'en' },
  { code: 'chi_sim', label: '简体中文', ocrCode: 'chi_sim', translateCode: 'zh' },
  { code: 'jpn', label: '日语', ocrCode: 'jpn', translateCode: 'ja' },
  { code: 'kor', label: '韩语', ocrCode: 'kor', translateCode: 'ko' },
  { code: 'fra', label: '法语', ocrCode: 'fra', translateCode: 'fr' },
  { code: 'spa', label: '西班牙语', ocrCode: 'spa', translateCode: 'es' },
  { code: 'deu', label: '德语', ocrCode: 'deu', translateCode: 'de' },
]

export const targetLanguageOptions: TargetLanguageOption[] = [
  { code: 'zh', label: '简体中文', translateCode: 'zh' },
  { code: 'en', label: '英语', translateCode: 'en' },
  { code: 'ja', label: '日语', translateCode: 'ja' },
  { code: 'ko', label: '韩语', translateCode: 'ko' },
  { code: 'fr', label: '法语', translateCode: 'fr' },
  { code: 'es', label: '西班牙语', translateCode: 'es' },
  { code: 'de', label: '德语', translateCode: 'de' },
]
