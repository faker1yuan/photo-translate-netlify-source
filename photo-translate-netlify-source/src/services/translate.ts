import type { TranslationProvider } from '../types'

type TranslateBatchParams = {
  texts: string[]
  source: string
  target: string
  signal?: AbortSignal
}

type TranslateBatchResult = {
  texts: string[]
  provider: TranslationProvider
}

export const translateBatch = async ({
  texts,
  source,
  target,
  signal,
}: TranslateBatchParams): Promise<TranslateBatchResult> => {
  if (texts.length === 0) {
    return { texts: [], provider: 'none' }
  }

  if (source === target) {
    return { texts, provider: 'api' }
  }

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts,
        source,
        target,
      }),
      signal,
    })

    const data = (await response.json().catch(() => null)) as {
      translations?: string[]
      configured?: boolean
      error?: string
    } | null

    if (!response.ok) {
      if (response.status === 404 || data?.configured === false) {
        return {
          texts: texts.map((text) => demoTranslate(text, target)),
          provider: 'demo',
        }
      }

      throw new Error(data?.error ?? `翻译接口返回错误：${response.status}`)
    }

    if (!Array.isArray(data?.translations) || data.translations.length !== texts.length) {
      throw new Error('翻译接口返回格式不正确。')
    }

    return { texts: data.translations, provider: 'api' }
  } catch (error) {
    if (error instanceof TypeError) {
      return {
        texts: texts.map((text) => demoTranslate(text, target)),
        provider: 'demo',
      }
    }

    throw error
  }
}

const dictionary: Record<string, string> = {
  'city cafe': '城市咖啡馆',
  'open': '营业',
  "today's menu": '今日菜单',
  menu: '菜单',
  latte: '拿铁',
  sandwich: '三明治',
  'orange juice': '橙汁',
  'special offer': '特别优惠',
  'buy 2 drinks, get 1 free': '买 2 杯饮品，送 1 杯',
  coffee: '咖啡',
  hotel: '酒店',
  airport: '机场',
  station: '车站',
  exit: '出口',
  entrance: '入口',
  warning: '警告',
  notice: '通知',
  receipt: '收据',
  total: '合计',
}

const demoTranslate = (text: string, target: string) => {
  if (target !== 'zh') {
    return `演示译文：${text}`
  }

  const normalised = text.toLowerCase().replace(/\s+/g, ' ').trim()
  if (dictionary[normalised]) {
    return dictionary[normalised]
  }

  const replaced = Object.entries(dictionary).reduce((next, [from, to]) => {
    const pattern = new RegExp(`\\b${escapeRegExp(from)}\\b`, 'gi')
    return next.replace(pattern, to)
  }, text)

  return replaced === text ? `演示译文：${text}` : replaced
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
