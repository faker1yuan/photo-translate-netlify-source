import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const languages = ['eng', 'chi_sim', 'jpn', 'kor', 'fra', 'spa', 'deu']
const targetDir = path.resolve('public/ocr/lang')
const packageBaseUrl = 'https://cdn.jsdelivr.net/npm/@tesseract.js-data'

await mkdir(targetDir, { recursive: true })

for (const lang of languages) {
  const targetPath = path.join(targetDir, `${lang}.traineddata.gz`)

  if (await hasExistingPack(targetPath)) {
    console.log(`已存在：${targetPath}`)
    continue
  }

  const url = `${packageBaseUrl}/${lang}/4.0.0_best_int/${lang}.traineddata.gz`
  console.log(`正在下载 ${lang} 语言包...`)
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`下载 ${lang} 语言包失败，状态码：${response.status}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length < 1024) {
    throw new Error(`${lang} 语言包大小异常，已停止写入。`)
  }

  await writeFile(targetPath, buffer)
  console.log(`已保存：${targetPath}`)
}

console.log('OCR（图片文字识别）语言包已准备完成。')

async function hasExistingPack(filePath) {
  try {
    const file = await stat(filePath)
    return file.size > 1024
  } catch {
    return false
  }
}
