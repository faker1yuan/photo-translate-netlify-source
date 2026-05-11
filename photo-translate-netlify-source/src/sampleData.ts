import type { ImageSize, TranslationRegion } from './types'

export const SAMPLE_IMAGE_SIZE: ImageSize = { width: 1080, height: 1440 }

const sampleSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440" viewBox="0 0 1080 1440">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f8fafc"/>
      <stop offset="1" stop-color="#e2e8f0"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1440" fill="#cbd5e1"/>
  <rect x="114" y="88" width="852" height="1264" rx="32" fill="url(#paper)" stroke="#94a3b8" stroke-width="4"/>
  <rect x="164" y="158" width="752" height="232" rx="20" fill="#0f766e"/>
  <text x="206" y="270" font-family="Arial, sans-serif" font-size="76" font-weight="700" fill="#ffffff">CITY CAFE</text>
  <text x="210" y="334" font-family="Arial, sans-serif" font-size="38" fill="#ccfbf1">OPEN 8 AM - 9 PM</text>
  <text x="164" y="500" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#0f172a">TODAY'S MENU</text>
  <line x1="164" y1="536" x2="916" y2="536" stroke="#94a3b8" stroke-width="3"/>
  <text x="188" y="640" font-family="Arial, sans-serif" font-size="48" fill="#111827">Latte</text>
  <text x="750" y="640" font-family="Arial, sans-serif" font-size="48" fill="#111827">$4.50</text>
  <text x="188" y="742" font-family="Arial, sans-serif" font-size="48" fill="#111827">Sandwich</text>
  <text x="750" y="742" font-family="Arial, sans-serif" font-size="48" fill="#111827">$8.90</text>
  <text x="188" y="844" font-family="Arial, sans-serif" font-size="48" fill="#111827">Orange Juice</text>
  <text x="750" y="844" font-family="Arial, sans-serif" font-size="48" fill="#111827">$5.20</text>
  <rect x="164" y="956" width="752" height="220" rx="22" fill="#ecfeff" stroke="#67e8f9" stroke-width="3"/>
  <text x="206" y="1044" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="#155e75">SPECIAL OFFER</text>
  <text x="206" y="1128" font-family="Arial, sans-serif" font-size="38" fill="#164e63">Buy 2 drinks, get 1 free</text>
</svg>
`

export const sampleImageUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sampleSvg)}`

export const sampleRegions: TranslationRegion[] = [
  {
    id: 'sample-1',
    originalText: 'CITY CAFE',
    translatedText: '城市咖啡馆',
    confidence: 98,
    box: { x: 196, y: 200, width: 430, height: 92 },
  },
  {
    id: 'sample-2',
    originalText: 'OPEN 8 AM - 9 PM',
    translatedText: '营业 8:00 - 21:00',
    confidence: 96,
    box: { x: 202, y: 294, width: 380, height: 52 },
  },
  {
    id: 'sample-3',
    originalText: "TODAY'S MENU",
    translatedText: '今日菜单',
    confidence: 97,
    box: { x: 156, y: 452, width: 420, height: 68 },
  },
  {
    id: 'sample-4',
    originalText: 'Latte $4.50',
    translatedText: '拿铁 4.50 美元',
    confidence: 93,
    box: { x: 178, y: 590, width: 690, height: 66 },
  },
  {
    id: 'sample-5',
    originalText: 'Sandwich $8.90',
    translatedText: '三明治 8.90 美元',
    confidence: 92,
    box: { x: 178, y: 692, width: 690, height: 66 },
  },
  {
    id: 'sample-6',
    originalText: 'Buy 2 drinks, get 1 free',
    translatedText: '买 2 杯饮品，送 1 杯',
    confidence: 95,
    box: { x: 196, y: 1088, width: 590, height: 60 },
  },
]
