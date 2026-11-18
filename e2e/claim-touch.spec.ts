import { test, expect } from '@playwright/test'

test('Chromium原生触摸：领取、松手、取消、多指和页面切出', async ({ browser, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP 原生触摸输入仅用于 Chromium')
  const context = await browser.newContext({ hasTouch: true, viewport: { width: 812, height: 375 } })
  const page = await context.newPage()
  try {
    await page.clock.install()
    await page.goto('http://127.0.0.1:4179/codmpayking/')
    await page.getByRole('button', { name: '模拟抽奖', exact: true }).click()
    await page.getByRole('button', { name: '获取使命卡片' }).click()
    const hold = page.getByRole('button', { name: '连续长按1.5秒领取卡片' })
    const box = (await hold.boundingBox())!
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 }
    const cdp = await context.newCDPSession(page)
    const start = () => cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
    const end = (type: 'touchEnd' | 'touchCancel' = 'touchEnd') => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [] })
    const balance = page.getByLabel('使命卡片余额')
    await start(); await page.clock.runFor(1400); await end(); await page.clock.runFor(500)
    await expect(balance).toHaveText('0 / 600')
    await start(); await page.clock.runFor(500); await end('touchCancel'); await page.clock.runFor(1600)
    await expect(balance).toHaveText('0 / 600')
    await start(); await page.clock.runFor(200)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point, { ...point, x: point.x + 10, id: 2 }] })
    await page.clock.runFor(1600); await end()
    await expect(balance).toHaveText('0 / 600')
    await start(); await page.clock.runFor(200)
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
    await page.clock.runFor(1600); await end()
    await expect(balance).toHaveText('0 / 600')
    await start(); await page.clock.runFor(1600)
    await expect(page.getByRole('dialog').getByRole('status')).toContainText('本次获得')
    const earned = await balance.innerText()
    expect(Number(earned.split(' /')[0])).toBeGreaterThanOrEqual(1)
    expect(Number(earned.split(' /')[0])).toBeLessThanOrEqual(20)
    await page.clock.runFor(5000); await expect(balance).toHaveText(earned); await end()
    await expect(page.locator('.sim-hold-progress')).toHaveText('按住领取 0%')
  } finally { await context.close() }
})
