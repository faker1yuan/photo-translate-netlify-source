export const DEFAULT_BASE_URL = 'https://api.deepseek.com'
export const DEFAULT_MODEL = 'deepseek-v4-flash'
export const MAX_TEXTS = 80
export const MAX_TEXT_LENGTH = 2400

export const translateWithDeepSeek = async ({ apiKey, baseUrl, model, source, target, texts }) => {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            '你是图片 OCR 后处理里的专业翻译服务。只返回 JSON，格式必须是 {"translations":["译文1","译文2"]}。translations 的数量、顺序必须和输入 texts 完全一致。不要解释，不要添加 Markdown。保留数字、价格、时间、专有名词和换行含义。已经是目标语言的文本保持自然表达。',
        },
        {
          role: 'user',
          content: JSON.stringify({
            source,
            target,
            texts,
          }),
        },
      ],
      thinking: { type: 'disabled' },
      response_format: { type: 'json_object' },
      stream: false,
      temperature: 0,
    }),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw httpError(
      data?.error?.message || data?.message || `DeepSeek 接口返回错误：${response.status}`,
      response.status,
    )
  }

  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw httpError('DeepSeek 接口没有返回可解析的翻译内容。', 502)
  }

  const parsed = parseJsonContent(content)
  const translations = parsed?.translations

  if (!Array.isArray(translations) || translations.some((item) => typeof item !== 'string')) {
    throw httpError('DeepSeek 返回格式不正确：缺少 translations 字符串数组。', 502)
  }

  if (translations.length !== texts.length) {
    throw httpError('DeepSeek 返回译文数量和原文数量不一致。', 502)
  }

  return translations
}

export const normaliseTexts = (texts) => {
  if (!Array.isArray(texts)) {
    throw httpError('texts 必须是字符串数组。', 400)
  }

  if (texts.length > MAX_TEXTS) {
    throw httpError(`一次最多翻译 ${MAX_TEXTS} 段文字。`, 400)
  }

  return texts.map((text) => {
    if (typeof text !== 'string') {
      throw httpError('texts 里只能包含字符串。', 400)
    }

    const trimmed = text.trim()
    if (trimmed.length > MAX_TEXT_LENGTH) {
      throw httpError(`单段文字不能超过 ${MAX_TEXT_LENGTH} 个字符。`, 400)
    }

    return trimmed
  })
}

export const normaliseLanguage = (value, fallback) =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback

export const httpError = (message, statusCode) => Object.assign(new Error(message), { statusCode })

export const getErrorStatusCode = (error) =>
  Number.isInteger(error?.statusCode) ? error.statusCode : 500

const parseJsonContent = (content) => {
  try {
    return JSON.parse(content)
  } catch {
    const start = content.indexOf('{')
    const end = content.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) {
      throw httpError('DeepSeek 返回内容不是 JSON。', 502)
    }

    return JSON.parse(content.slice(start, end + 1))
  }
}
