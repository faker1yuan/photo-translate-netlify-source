export const ocrAssetPaths = {
  workerPath: '/ocr/tesseract/worker.min.js',
  corePath: '/ocr/tesseract-core',
  langPath: '/ocr/lang',
} as const

export const supportedOcrLanguages = ['eng', 'chi_sim', 'jpn', 'kor', 'fra', 'spa', 'deu'] as const

export type SupportedOcrLanguage = (typeof supportedOcrLanguages)[number]

export const getOcrLanguagePackPath = (lang: string) =>
  `${ocrAssetPaths.langPath}/${lang}.traineddata.gz`
