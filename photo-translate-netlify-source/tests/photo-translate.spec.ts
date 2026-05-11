import { expect, test, type Page } from '@playwright/test'

test.use({
  browserName: 'chromium',
  channel: 'msedge',
  viewport: { width: 1440, height: 1000 },
})

test('sample workflow renders aligned translation overlays', async ({ page }) => {
  const relevantLogs: string[] = []

  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      relevantLogs.push(`${message.type()}: ${message.text()}`)
    }
  })

  page.on('pageerror', (error) => {
    relevantLogs.push(`pageerror: ${error.message}`)
  })

  await page.goto('http://localhost:5173/')
  await expect(page.getByRole('heading', { name: '拍照翻译' })).toBeVisible()
  await expect(page.getByRole('button', { name: '开始翻译' })).toBeDisabled()

  await page.getByRole('button', { name: '试用示例' }).click()
  await expect(page.locator('.text-overlay')).toHaveCount(6)
  await expect(page.locator('.text-overlay .marker')).toHaveCount(0)
  await expect(page.getByLabel('原文和译文列表')).toHaveCount(0)
  await expectOverlayIndexes(page, 6)
  await expectOverlaysDoNotOverlap(page)
  await expect(page.getByLabel('图片上的翻译覆盖层').getByText('城市咖啡馆')).toBeVisible()
  await expect(page.getByText('识别 6 处文字').first()).toBeVisible()
  await page.screenshot({ path: '/tmp/photo-translate-sample-desktop.png', fullPage: false })

  await page.getByRole('button', { name: '原文' }).click()
  await expect(page.getByLabel('图片上的翻译覆盖层').getByText('CITY CAFE')).toBeVisible()

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('button', { name: '译文' })).toBeVisible()
  await expect(page.locator('.text-overlay')).toHaveCount(6)
  await expect(page.locator('.text-overlay .marker')).toHaveCount(0)
  await expectOverlaysDoNotOverlap(page)
  await page.screenshot({ path: '/tmp/photo-translate-sample-mobile.png', fullPage: false })

  expect(relevantLogs).toEqual([])
})

const expectOverlayIndexes = async (page: Page, count: number) => {
  for (let index = 1; index <= count; index += 1) {
    await expect(page.locator(`.text-overlay[data-overlay-index="${index}"]`)).toHaveCount(1)
  }
}

const expectOverlaysDoNotOverlap = async (page: Page) => {
  const overlaps = await page.locator('.text-overlay').evaluateAll((elements) => {
    const rects = elements.map((element) => {
      const rect = element.getBoundingClientRect()

      return {
        index: element.getAttribute('data-overlay-index'),
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      }
    })
    const collisions: string[] = []

    for (let firstIndex = 0; firstIndex < rects.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < rects.length; secondIndex += 1) {
        const first = rects[firstIndex]
        const second = rects[secondIndex]
        const width = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left))
        const height = Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top))

        if (width * height > 1) {
          collisions.push(`${first.index}-${second.index}`)
        }
      }
    }

    return collisions
  })

  expect(overlaps).toEqual([])
}
