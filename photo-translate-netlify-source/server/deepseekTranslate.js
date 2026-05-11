import {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  getErrorStatusCode,
  httpError,
  normaliseLanguage,
  normaliseTexts,
  translateWithDeepSeek,
} from './deepseekCore.js'

export const createDeepSeekMiddleware = (env) => async (req, res, next) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {})
    return
  }

  if (req.method !== 'POST') {
    next()
    return
  }

  await handleDeepSeekTranslateRequest(req, res, env)
}

export const handleDeepSeekTranslateRequest = async (req, res, env = {}) => {
  try {
    const apiKey = getEnv(env, 'DEEPSEEK_API_KEY')

    if (!apiKey) {
      sendJson(res, 501, {
        error: '还没有配置 DEEPSEEK_API_KEY。',
        configured: false,
      })
      return
    }

    const payload = await readJson(req)
    const texts = normaliseTexts(payload.texts)
    const source = normaliseLanguage(payload.source, 'auto')
    const target = normaliseLanguage(payload.target, 'zh')

    if (texts.length === 0) {
      sendJson(res, 200, { translations: [], provider: 'deepseek' })
      return
    }

    const translations = await translateWithDeepSeek({
      apiKey,
      baseUrl: getEnv(env, 'DEEPSEEK_API_BASE_URL') || DEFAULT_BASE_URL,
      model: getEnv(env, 'DEEPSEEK_MODEL') || DEFAULT_MODEL,
      source,
      target,
      texts,
    })

    sendJson(res, 200, {
      translations,
      provider: 'deepseek',
      model: getEnv(env, 'DEEPSEEK_MODEL') || DEFAULT_MODEL,
    })
  } catch (error) {
    const statusCode = getErrorStatusCode(error)
    sendJson(res, statusCode, {
      error: error instanceof Error ? error.message : '翻译失败。',
      configured: true,
    })
  }
}

const readJson = async (req) => {
  const chunks = []
  let size = 0

  for await (const chunk of req) {
    size += chunk.length
    if (size > 1024 * 1024) {
      throw httpError('请求内容太大。', 413)
    }
    chunks.push(chunk)
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  } catch {
    throw httpError('请求 JSON 格式不正确。', 400)
  }
}

const getEnv = (env, key) => {
  const value = env[key]
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

const sendJson = (res, statusCode, data) => {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}
