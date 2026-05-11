import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { createReadStream, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleDeepSeekTranslateRequest } from './server/deepseekTranslate.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, 'dist')
const env = {
  ...(await loadEnvFile(path.join(__dirname, '.env'))),
  ...(await loadEnvFile(path.join(__dirname, '.env.local'))),
  ...process.env,
}

const port = Number(env.PORT || 4173)

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

  if (url.pathname === '/api/translate') {
    await handleDeepSeekTranslateRequest(req, res, env)
    return
  }

  await serveStatic(url.pathname, res)
})

server.listen(port, () => {
  console.log(`Photo Translate server: http://localhost:${port}`)
})

async function serveStatic(pathname, res) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname
  const safePath = path.normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, '')
  const filePath = path.join(distDir, safePath)

  if (!filePath.startsWith(distDir) || !existsSync(filePath)) {
    const indexPath = path.join(distDir, 'index.html')
    if (!existsSync(indexPath)) {
      sendText(res, 404, 'dist 不存在。请先运行 npm run build。')
      return
    }
    streamFile(indexPath, res)
    return
  }

  streamFile(filePath, res)
}

function streamFile(filePath, res) {
  res.statusCode = 200
  res.setHeader('Content-Type', contentType(filePath))
  createReadStream(filePath).pipe(res)
}

function sendText(res, statusCode, text) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end(text)
}

function contentType(filePath) {
  const ext = path.extname(filePath)
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
  }

  return types[ext] || 'application/octet-stream'
}

async function loadEnvFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8')
    const result = {}

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        continue
      }

      const index = trimmed.indexOf('=')
      const key = trimmed.slice(0, index).trim()
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')
      result[key] = value
    }

    return result
  } catch {
    return {}
  }
}
