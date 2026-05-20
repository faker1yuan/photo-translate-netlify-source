import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

const tesseractFiles = [
  {
    from: 'node_modules/tesseract.js/dist/worker.min.js',
    to: 'public/ocr/tesseract/worker.min.js',
  },
]

const coreFiles = [
  'tesseract-core.js',
  'tesseract-core.wasm',
  'tesseract-core.wasm.js',
  'tesseract-core-lstm.js',
  'tesseract-core-lstm.wasm',
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-simd.js',
  'tesseract-core-simd.wasm',
  'tesseract-core-simd.wasm.js',
  'tesseract-core-simd-lstm.js',
  'tesseract-core-simd-lstm.wasm',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-relaxedsimd.js',
  'tesseract-core-relaxedsimd.wasm',
  'tesseract-core-relaxedsimd.wasm.js',
  'tesseract-core-relaxedsimd-lstm.js',
  'tesseract-core-relaxedsimd-lstm.wasm',
  'tesseract-core-relaxedsimd-lstm.wasm.js',
].map((fileName) => ({
  from: `node_modules/tesseract.js-core/${fileName}`,
  to: `public/ocr/tesseract-core/${fileName}`,
}))

for (const asset of [...tesseractFiles, ...coreFiles]) {
  await mkdir(path.dirname(asset.to), { recursive: true })
  await copyFile(asset.from, asset.to)
}

await mkdir('public/ocr/lang', { recursive: true })

console.log('OCR（图片文字识别）核心资源已准备完成。')
