import {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  getErrorStatusCode,
  normaliseLanguage,
  normaliseTexts,
  translateWithDeepSeek,
} from '../../server/deepseekCore.js'

declare const Netlify: {
  env: {
    get(name: string): string | undefined
  }
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return jsonResponse({}, 204)
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: '只支持 POST 请求。' }, 405)
  }

  try {
    const apiKey = getEnv('DEEPSEEK_API_KEY')

    if (!apiKey) {
      return jsonResponse(
        {
          error: '还没有配置 DEEPSEEK_API_KEY。',
          configured: false,
        },
        501,
      )
    }

    const payload = await readJson(req)
    const texts = normaliseTexts(payload.texts)
    const source = normaliseLanguage(payload.source, 'auto')
    const target = normaliseLanguage(payload.target, 'zh')

    if (texts.length === 0) {
      return jsonResponse({ translations: [], provider: 'deepseek' })
    }

    const model = getEnv('DEEPSEEK_MODEL') || DEFAULT_MODEL
    const translations = await translateWithDeepSeek({
      apiKey,
      baseUrl: getEnv('DEEPSEEK_API_BASE_URL') || DEFAULT_BASE_URL,
      model,
      source,
      target,
      texts,
    })

    return jsonResponse({
      translations,
      provider: 'deepseek',
      model,
    })
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : '翻译失败。',
        configured: true,
      },
      getErrorStatusCode(error),
    )
  }
}

export const config = {
  path: '/api/translate',
}

type TranslateRequestPayload = {
  texts?: unknown
  source?: unknown
  target?: unknown
}

const readJson = async (req: Request): Promise<TranslateRequestPayload> => {
  try {
    return (await req.json()) as TranslateRequestPayload
  } catch {
    throw Object.assign(new Error('请求 JSON 格式不正确。'), { statusCode: 400 })
  }
}

const getEnv = (name: string) => {
  const value = Netlify.env.get(name)
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
