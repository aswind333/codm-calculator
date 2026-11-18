import { test, expect } from '@playwright/test'
import { initialSimulation } from '../src/features/simulator/model'
const key = 'codmcalc.simulation.v1'

test.describe('触控设备方向适配', () => {
  test.use({ hasTouch: true })
  for (const viewport of [
    { width: 390, height: 844 }, { width: 375, height: 812 },
    { width: 844, height: 390 }, { width: 812, height: 375 },
    { width: 667, height: 375 }, { width: 768, height: 1024 },
  ]) test(`${viewport.width}x${viewport.height} 提示、左右布局与可操作性`, async ({ page }, info) => {
    await page.setViewportSize(viewport)
    await page.goto('./')
    await page.getByRole('button', { name: '模拟抽奖', exact: true }).click()
    expect(await page.evaluate(() => matchMedia('(pointer: coarse) and (hover: none)').matches)).toBe(true)
    const phonePortrait = viewport.width < 600 && viewport.height > viewport.width
    const stage = page.getByRole('region', { name: '模拟抽奖舞台' })
    const hint = page.getByRole('region', { name: '横屏提示' })
    if (phonePortrait) {
      await expect(hint).toBeVisible()
      await expect(stage).toBeHidden()
      await expect(page.getByRole('button', { name: '获取使命卡片' })).toHaveCount(0)
      await expect(page.getByRole('button', { name: /抽奖，消耗/ })).toHaveCount(0)
      const box = await hint.boundingBox()
      expect(box!.y + box!.height).toBeLessThan(viewport.height)
      await page.getByRole('button', { name: '规则说明', exact: true }).click()
      await expect(page.getByRole('button', { name: '三步使用教程' })).toBeVisible()
      await page.getByRole('button', { name: '模拟抽奖', exact: true }).click()
    } else {
      await expect(hint).toBeHidden()
      await expect(stage).toBeVisible()
      for (const type of ['legendary_weapon', 'seven_draw']) {
        await page.getByLabel('模拟转盘类型').selectOption(type)
        await expect(page.locator('.sim-prize')).toHaveCount(10)
        await expect(page.locator('.sim-empty')).toHaveCount(type === 'seven_draw' ? 3 : 0)
        const left = await page.locator('.sim-side-0').boundingBox()
        const right = await page.locator('.sim-side-1').boundingBox()
        expect(left!.y).toBe(right!.y)
        expect(left!.height).toBe(right!.height)
        expect(right!.x).toBeGreaterThan(left!.x + left!.width)
        for (const card of await page.locator('.sim-prize:not(.sim-empty)').all()) {
          const fits = await card.evaluate(el => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1)
          expect(fits).toBe(true)
          await expect(card.locator('.sim-probability')).toBeVisible()
        }
        const draw = await page.locator('.sim-draw').boundingBox(), box = await stage.boundingBox()
        expect(draw!.height).toBeGreaterThanOrEqual(44)
        expect(draw!.x + draw!.width / 2).toBeCloseTo(box!.x + box!.width / 2, 1)
        expect(draw!.y + draw!.height).toBeLessThanOrEqual(box!.y + box!.height)
        if (viewport.width >= 812 && viewport.height < 500) expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height)
      }
      await page.getByRole('button', { name: '获取使命卡片' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.getByRole('button', { name: '关闭', exact: true }).click()
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath('orientation.png'), fullPage: true })
  })

  test('动画中旋转保留同一奖池DOM、结果、余额和记录；不提前结束', async ({ page }) => {
    await page.setViewportSize({ width: 812, height: 375 })
    const state = { ...initialSimulation(), balance: 600, selected: 'seven_draw' as const }
    state.pools.seven_draw = [{ prizeId: 'seven_draw:prize_7', name: '七等奖', cost: 3 }]
    await page.addInitScript(({ key, state }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state))
    }, { key, state })
    await page.goto('./'); await page.getByRole('button', { name: '模拟抽奖', exact: true }).click()
    const arena = await page.locator('.sim-arena').elementHandle()
    const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
    await page.getByRole('button', { name: '抽奖，消耗7张使命卡片' }).click()
    await expect(page.getByLabel('模拟抽奖舞台')).toHaveAttribute('aria-busy', 'true')
    const pending = await saved()
    expect(pending.balance).toBe(593)
    expect(pending.pools.seven_draw).toHaveLength(2)
    await page.setViewportSize({ width: 375, height: 812 })
    await expect(page.getByRole('heading', { name: '请横屏体验模拟抽奖' })).toBeVisible()
    expect(await arena!.evaluate(el => el === document.querySelector('.sim-arena'))).toBe(true)
    expect((await saved()).pending).toEqual(pending.pending)
    await page.setViewportSize({ width: 812, height: 375 })
    expect(await arena!.evaluate(el => el === document.querySelector('.sim-arena'))).toBe(true)
    await expect(page.locator('.sim-draw')).toBeDisabled()
    await expect(page.getByRole('button', { name: '收下奖品' })).toBeVisible({ timeout: 15000 })
    const result = await saved()
    expect(result.balance).toBe(593)
    expect(result.selected).toBe('seven_draw')
    expect(result.pending.id).toBe(pending.pending.id)
    expect(result.pending.prizeId).toBe(pending.pending.prizeId)
    expect(result.pools).toEqual(pending.pools)
    await expect(page.locator('.sim-lit')).toContainText('第 2 抽获得')
    await page.getByRole('button', { name: '收下奖品' }).click()
    await expect.poll(async () => (await saved()).pending).toBeNull()
    await page.reload(); await page.getByRole('button', { name: '模拟抽奖', exact: true }).click()
    await expect(page.getByLabel('使命卡片余额')).toHaveText('593 / 600')
    await expect(page.getByLabel('模拟转盘类型')).toHaveValue('seven_draw')
    expect((await saved()).pools).toEqual(result.pools)
    // Rotation dismisses a transient acquisition modal without changing the draw.
    await page.getByRole('button', { name: '获取使命卡片' }).click()
    await page.setViewportSize({ width: 375, height: 812 })
    await expect(page.locator('dialog')).not.toHaveAttribute('open', '')
    await page.getByRole('button', { name: '抽奖分析', exact: true }).click()
    await expect(page.getByRole('main', { name: '抽奖分析', exact: true })).toBeVisible()
  })
})

for (const viewport of [{ width: 375, height: 812 }, { width: 1280, height: 720 }, { width: 1920, height: 1080 }]) test(`鼠标设备 ${viewport.width}x${viewport.height} 不出现旋转提示`, async ({ page }) => {
  await page.setViewportSize(viewport); await page.goto('./')
  await page.getByRole('button', { name: '模拟抽奖', exact: true }).click()
  await expect(page.getByRole('region', { name: '横屏提示' })).toBeHidden()
  await expect(page.getByLabel('模拟抽奖舞台')).toBeVisible()
  await expect(page.getByRole('button', { name: '获取使命卡片' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
