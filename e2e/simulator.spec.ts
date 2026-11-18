import { calculateDraw } from '../src/domain/calculations.ts'
import { formatProbability } from '../src/domain/format.ts'
import { test, expect } from '@playwright/test'
import { initialSimulation } from '../src/features/simulator/model.ts'
const key = 'codmcalc.simulation.v1'
const settingsKey = 'codmcalc.settings.v1'
import { createDefaultConfigs } from '../src/data/defaults.ts'

test('长按不足1.5秒取消、连续长按仅领取一次、上限和键盘领取', async ({ page }) => {
  await page.clock.install(); await page.goto('./'); await page.getByRole('button', { name: '模拟抽奖', exact: true }).click()
  await expect(page.getByLabel('使命卡片余额')).toHaveText('0 / 600')
  await page.getByRole('button', { name: '获取使命卡片' }).click()
  const hold = page.getByRole('button', { name: '连续长按1.5秒领取卡片' })
  await expect(hold).toHaveText('')
  await expect(page.locator('.sim-hold-progress')).toHaveText('按住领取 0%')
  await hold.hover(); await page.mouse.down(); await page.clock.runFor(1400); await page.mouse.up()
  await expect(page.getByLabel('使命卡片余额')).toHaveText('0 / 600')
  await hold.hover(); await page.mouse.down(); await page.clock.runFor(1600)
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('本次获得')
  const balance = await page.getByLabel('使命卡片余额').innerText(); const n = Number(balance.split(' /')[0]); expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(20)
  await page.clock.runFor(5000); await expect(page.getByLabel('使命卡片余额')).toHaveText(balance); await page.mouse.up()
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key, state: { ...initialSimulation(), balance: 599 } })
  await page.reload(); await page.getByRole('button', { name: '模拟抽奖', exact: true }).click(); await page.getByRole('button', { name: '获取使命卡片' }).click()
  await hold.focus(); await page.keyboard.down('Space'); await page.clock.runFor(1600); await page.keyboard.up('Space')
  await expect(page.getByLabel('使命卡片余额')).toHaveText('600 / 600'); await expect(hold).toBeDisabled()
})

test('八类价格、550扣卡、动画中刷新恢复相同结果、重置不退款与配置联动', async ({ page }) => {
  await page.clock.install()
  await page.addInitScript(({ key, state, settingsKey, configs }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state)); if (!localStorage.getItem(settingsKey)) localStorage.setItem(settingsKey, JSON.stringify({ version: 1, configs })) }, { key, state: { ...initialSimulation(), balance: 600 }, settingsKey, configs: createDefaultConfigs().map(c => c.typeId === 'legendary_weapon' ? { ...c, roundCosts: [550, ...c.roundCosts.slice(1)] } : c) })
  await page.goto('./'); await page.getByRole('button', { name: '模拟抽奖', exact: true }).click()
  const select = page.getByLabel('模拟转盘类型'); await expect(select.locator('option')).toHaveCount(8)
  for (const c of createDefaultConfigs()) {
    await select.selectOption(c.typeId)
    await expect(page.getByRole('button', { name: `抽奖，消耗${c.typeId === 'legendary_weapon' ? 550 : c.roundCosts[0]}张使命卡片` })).toBeEnabled()
  }
  await select.selectOption('legendary_weapon')
  await page.getByRole('button', { name: '抽奖，消耗550张使命卡片' }).click()
  await expect(page.getByLabel('模拟抽奖舞台')).toHaveAttribute('aria-busy', 'true'); await expect(select).toBeDisabled()
  await expect(page.getByRole('button', { name: '设置', exact: true })).toBeDisabled()
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  expect(saved.balance).toBe(50); expect(saved.pools.legendary_weapon).toHaveLength(1)
  await page.reload(); await page.getByRole('button', { name: '模拟抽奖', exact: true }).click()
  await expect(page.getByLabel('模拟抽奖舞台')).toHaveAttribute('aria-busy', 'true')
  await page.clock.runFor(10000)
  await expect(page.getByRole('button', { name: '收下奖品' })).toBeVisible()
  const win = saved.pools.legendary_weapon[0]
  const rank = Number(win.prizeId.split('_').at(-1))
  await expect(page.locator(`.sim-prize[data-rank="${rank}"]`)).toHaveAttribute('data-highlighted', 'true')
  await expect(page.getByLabel('使命卡片余额')).toHaveText('50 / 600')
  await page.getByRole('button', { name: '收下奖品' }).click()
  page.once('dialog', d => d.accept()); await page.getByRole('button', { name: '重置奖池' }).click()
  await expect(page.getByLabel('当前模拟记录')).toContainText('已抽 0 / 10 次'); await expect(page.getByLabel('使命卡片余额')).toHaveText('50 / 600')
  await expect(page.getByRole('button', { name: '抽奖，消耗550张使命卡片' })).toBeDisabled()
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.locator('.price-table-wrap').getByLabel('传说武器转盘 第1抽', { exact: true }).fill('7')
  await page.getByRole('button', { name: '保存设置', exact: true }).click(); await page.getByRole('button', { name: '模拟抽奖', exact: true }).click()
  await expect(page.getByRole('button', { name: '抽奖，消耗7张使命卡片' })).toBeEnabled()
})

for (const width of [375, 430, 768, 1280, 1440]) test(`七抽空位、免费单奖池、零剩余权重及${width}px布局`, async ({ page }, info) => {
  test.setTimeout(90000)
  await page.clock.install(); await page.setViewportSize({ width, height: 900 })
  const configs = createDefaultConfigs().map(c => c.typeId === 'seven_draw' ? { ...c, roundCosts: c.roundCosts.map(() => 0), prizes: c.prizes.map((p, i) => ({ ...p, weightPercent: i === 0 ? 100 : 0 })) } : c)
  await page.addInitScript(({ settingsKey, configs }) => localStorage.setItem(settingsKey, JSON.stringify({ version: 1, configs })), { settingsKey, configs })
  await page.goto('./'); await page.getByRole('button', { name: '模拟抽奖', exact: true }).click(); await page.getByLabel('模拟转盘类型').selectOption('seven_draw')
  await expect(page.locator('.sim-empty')).toHaveCount(3)
  await expect(page.locator('.sim-stage .sim-toolbar select')).toHaveCount(1)
  await expect(page.locator('.sim-stage .sim-toolbar-left').getByRole('button', { name: '重置奖池' })).toHaveCount(1)
  await expect(page.locator('.sim-stage .sim-wallet')).toHaveCount(1)
  await expect(page.locator('#simulator-main > .sim-toolbar')).toHaveCount(0)
  const panelBox = await page.locator('.sim-stage').boundingBox(), buttonBox = await page.locator('.sim-draw').boundingBox()
  expect(Math.abs(panelBox!.x + panelBox!.width / 2 - buttonBox!.x - buttonBox!.width / 2)).toBeLessThan(.1)
  const headerBox = await page.locator('.sim-toolbar').boundingBox(), arenaBox = await page.locator('.sim-arena').boundingBox()
  expect(headerBox!.y + headerBox!.height).toBeLessThan(arenaBox!.y)

  const small = await page.locator('.sim-prize[data-rank="3"]').boundingBox(); const large = await page.locator('.sim-prize[data-rank="1"]').boundingBox(); expect(large!.height).toBeGreaterThan(small!.height)
  const rightMajor = await page.locator('.sim-prize[data-rank="2"]').boundingBox(); expect(Math.abs(large!.y - rightMajor!.y)).toBeLessThan(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath(`simulator-${width}.png`), fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: '抽奖，消耗0张使命卡片' }).click()
  await page.clock.runFor(10000); await page.getByRole('button', { name: '收下奖品' }).click()
  await expect(page.locator('.sim-prize[data-rank="1"]')).toContainText('第 1 抽获得')
  await expect(page.getByText('剩余权重为零或配置无效，请调整并保存设置或重置奖池')).toBeVisible()
  await expect(page.getByRole('button', { name: '抽奖，消耗0张使命卡片' })).toBeDisabled()
  await expect(page.getByLabel('使命卡片余额')).toHaveText('0 / 600')
  await page.getByRole('button', { name: '抽奖分析', exact: true }).click(); await expect(page.getByRole('button', { name: '一等奖', exact: true })).toHaveAttribute('aria-pressed', 'false')
})

test('完整七抽无重复、类型记录隔离、终局与重置', async ({ page }) => {
  await page.clock.install()
  const configs = createDefaultConfigs().map(c => ({ ...c, roundCosts: c.roundCosts.map(() => 0) }))
  await page.addInitScript(({ settingsKey, configs }) => localStorage.setItem(settingsKey, JSON.stringify({ version: 1, configs })), { settingsKey, configs })
  await page.goto('./'); await page.getByRole('button', { name: '模拟抽奖', exact: true }).click()
  await page.getByLabel('模拟转盘类型').selectOption('seven_draw')
  for (let i = 0; i < 7; i++) {
    await page.getByRole('button', { name: '抽奖，消耗0张使命卡片' }).click()
    await page.clock.runFor(10000)
    await page.getByRole('button', { name: '收下奖品' }).click()
    await expect(page.getByLabel('当前模拟记录')).toContainText(`已抽 ${i + 1} / 7 次`)
  }
  await expect(page.getByRole('button', { name: '奖池已抽完', exact: true })).toBeDisabled()
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  expect(new Set(saved.pools.seven_draw.map((w: { prizeId: string }) => w.prizeId)).size).toBe(7)
  await page.getByLabel('模拟转盘类型').selectOption('legendary_weapon')
  await expect(page.getByLabel('当前模拟记录')).toContainText('已抽 0 / 10 次')
  await page.getByLabel('模拟转盘类型').selectOption('seven_draw')
  await expect(page.getByLabel('当前模拟记录')).toContainText('已抽 7 / 7 次')
  await expect(page.locator('#simulator-main')).not.toContainText(/NaN|Infinity/)
})

test('写入失败不扣卡、不出奖；快速点击与多标签页不重复扣卡', async ({ page, context }) => {
  await page.clock.install()
  await page.goto('./')
  await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key, state: { ...initialSimulation(), balance: 600 } })
  await page.reload(); await page.getByRole('button', { name: '模拟抽奖', exact: true }).click()
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'codmcalc.simulation.v1') throw new DOMException('存储空间不足', 'QuotaExceededError')
      original.call(this, key, value)
    }
  })
  await page.getByRole('button', { name: '抽奖，消耗3张使命卡片' }).click()
  await expect(page.getByRole('alert')).toContainText('操作未完成')
  await expect(page.getByLabel('使命卡片余额')).toHaveText('600 / 600')
  await expect(page.getByLabel('当前模拟记录')).toContainText('已抽 0 / 10 次')
  await page.reload(); await page.getByRole('button', { name: '模拟抽奖', exact: true }).click()
  const other = await context.newPage(); await other.clock.install(); await other.goto('./'); await other.getByRole('button', { name: '模拟抽奖', exact: true }).click()
  const clickTwice = () => {
    const button = document.querySelector<HTMLButtonElement>('.sim-draw')!
    button.click(); button.click()
  }
  await Promise.all([page.evaluate(clickTwice), other.evaluate(clickTwice)])
  await expect(other.getByLabel('使命卡片余额')).toHaveText('597 / 600')
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  expect(saved.balance).toBe(597); expect(saved.pools.legendary_weapon).toHaveLength(1)
  await other.close()
})

test('本轮概率跟随剩余奖池，动画不提前透露结果，精简文案与导航图标', async ({ page }) => {
  await page.clock.install()
  const config = createDefaultConfigs().find(c => c.typeId === 'legendary_weapon')!
  const state = { ...initialSimulation(), balance: 600 }
  state.pools.legendary_weapon = [5, 6].map((index, i) => ({ prizeId: config.prizes[index].prizeId, name: config.prizes[index].name, cost: config.roundCosts[i] }))
  await page.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key, state })
  await page.goto('./'); await page.getByRole('button', { name: '模拟抽奖', exact: true }).click()
  const main = page.locator('#simulator-main')
  await expect(main.getByText('第3抽 / 共10抽', { exact: true })).toBeVisible()
  await expect(main).not.toContainText('VIRTUAL DRAW'); await expect(main).not.toContainText('你的搭档，正在路上')
  await expect(page.getByRole('button', { name: '抽奖分析', exact: true }).locator('svg')).toHaveCount(1)
  await expect(page.getByRole('button', { name: '规则说明', exact: true }).locator('svg')).toHaveCount(1)
  await expect(page.locator('.sim-character svg text')).toHaveText('?')
  await expect(page.locator('.sim-wallet')).toContainText('使命卡片')
  await expect(page.locator('.sim-prize[data-rank="1"]')).toContainText('0.096%')
  await expect(page.locator('.sim-prize[data-rank="2"]')).toContainText('1.497%')
  await expect(page.locator('.sim-prize[data-rank="6"] .sim-probability')).toHaveCount(0)
  await page.getByRole('button', { name: '抽奖，消耗10张使命卡片' }).click()
  await expect(page.locator('.sim-prize[data-rank="2"]')).toContainText('1.497%')
  await page.clock.runFor(10000)
  await expect(page.getByRole('button', { name: '收下奖品' })).toBeVisible()
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
  const result = calculateDraw(config, saved.pools.legendary_weapon.map((w: { prizeId: string }) => w.prizeId))
  for (const row of result.rows) {
    const rank = config.prizes.findIndex(p => p.prizeId === row.prizeId) + 1
    await expect(page.locator(`.sim-prize[data-rank="${rank}"] .sim-probability`)).toHaveText(formatProbability(row.probability).text)
  }
})

for (const viewport of [{ width: 1366, height: 768 }, { width: 1440, height: 900 }]) test(`紧凑舞台首屏、历史轮次及刷新恢复 ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
  await page.setViewportSize(viewport)
  const config = createDefaultConfigs().find(c => c.typeId === 'legendary_weapon')!
  const state = initialSimulation()
  state.pools.legendary_weapon = [5, 6].map((index, i) => ({ prizeId: config.prizes[index].prizeId, name: config.prizes[index].name, cost: config.roundCosts[i] }))
  await page.addInitScript(({ key, state }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state)) }, { key, state })
  await page.goto('./'); await page.getByRole('button', { name: '模拟抽奖', exact: true }).click()
  await expect(page.locator('#simulator-main h1, .sim-record')).toHaveCount(0)
  const stage = await page.locator('.sim-stage').boundingBox()
  expect(stage!.height).toBeLessThanOrEqual(580)
  expect(stage!.y + stage!.height).toBeLessThanOrEqual(viewport.height)
  const button = await page.locator('.sim-draw').boundingBox(), round = await page.locator('.sim-round').boundingBox(), summary = await page.locator('.sim-summary').boundingBox()
  expect(round!.x + round!.width).toBeLessThan(button!.x)
  expect(summary!.x).toBeGreaterThan(button!.x + button!.width)
  expect(Math.abs(stage!.x + stage!.width / 2 - button!.x - button!.width / 2)).toBeLessThan(.1)
  const select = await page.locator('.sim-type').boundingBox(), wallet = await page.locator('.sim-wallet').boundingBox()
  expect(Math.abs(select!.y + select!.height / 2 - wallet!.y - wallet!.height / 2)).toBeLessThan(1)
  await expect(page.locator('.sim-stage').getByLabel('当前模拟记录')).toContainText('累计消耗 8 张')
  await expect(page.locator('.sim-prize[data-rank="6"]')).toContainText('第 1 抽获得')
  await expect(page.locator('.sim-prize[data-rank="7"]')).toContainText('第 2 抽获得')
  const boxes = await page.locator('.sim-side-0 .sim-prize').evaluateAll(nodes => nodes.map(n => { const r = n.getBoundingClientRect(); return { top: r.top, bottom: r.bottom } }))
  for (let i = 1; i < boxes.length; i++) expect(boxes[i].top).toBeGreaterThan(boxes[i - 1].bottom)
  await page.screenshot({ path: info.outputPath('compact-simulator.png'), fullPage: true })
  await page.reload(); await page.getByRole('button', { name: '模拟抽奖', exact: true }).click()
  await expect(page.locator('.sim-prize[data-rank="7"]')).toContainText('第 2 抽获得')
  await expect(page.getByLabel('当前模拟记录')).toContainText('累计消耗 8 张')
  page.once('dialog', d => d.accept()); await page.getByRole('button', { name: '重置奖池' }).click()
  await expect(page.getByLabel('当前模拟记录')).toContainText('累计消耗 0 张')
  await expect(page.locator('.sim-obtained')).toHaveCount(0)
})

for (const width of [375, 1366]) test(`抽奖全部阶段无布局跳动 ${width}px`, async ({ page }, info) => {
  test.setTimeout(90000)
  await page.clock.install(); await page.setViewportSize({ width, height: 900 })
  const configs = createDefaultConfigs().map(c => c.typeId === 'legendary_weapon' ? { ...c, roundCosts: c.roundCosts.map(() => 1) } : c)
  const state = { ...initialSimulation(), balance: 1 }
  await page.addInitScript(({ key, state, settingsKey, configs }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state))
    localStorage.setItem(settingsKey, JSON.stringify({ version: 1, configs }))
  }, { key, state, settingsKey, configs })
  await page.goto('./'); await page.getByRole('button', { name: '模拟抽奖', exact: true }).click()
  const draw = page.locator('.sim-draw')
  const geometry = () => page.locator('.sim-stage, .sim-prize, .sim-character, .sim-draw').evaluateAll(nodes => nodes.map(n => { const r = n.getBoundingClientRect(); return [r.x, r.y + scrollY, r.width, r.height] }))
  const before = await geometry()
  const stable = async () => {
    const after = await geometry()
    const panel = after[0], button = after.at(-1)!
    expect(Math.abs(panel[0] + panel[2] / 2 - button[0] - button[2] / 2)).toBeLessThan(.1)
    expect(after.length).toBe(before.length)
    after.forEach((rect, i) => rect.forEach((n, j) => expect(Math.abs(n - before[i][j])).toBeLessThan(.1)))
  }
  const finishAnimation = async () => {
    // Advance in frames with rendering checkpoints, not one clock jump past React's effects.
    for (let elapsed = 0; elapsed < 10000; elapsed += 500) {
      await page.clock.runFor(500); await stable()
      if (await draw.textContent() === '收下奖品') break
    }
    await expect(draw).toHaveText('收下奖品'); await stable()
  }
  await expect(draw).toBeEnabled(); await draw.click()
  await expect(page.getByLabel('模拟抽奖舞台')).toHaveAttribute('aria-busy', 'true')
  await expect(draw).toBeDisabled(); await expect(draw).toHaveText('▣1')
  await expect(page.locator('#simulator-main')).not.toContainText('动画播放中')
  await stable()
  await finishAnimation()
  await expect(page.locator('.sim-controls')).not.toContainText('下一抽')
  await draw.click(); await stable()
  await expect(draw).toBeDisabled(); await expect(draw).toHaveClass(/sim-insufficient/)
  await expect(draw.locator('.sim-cost')).toHaveCSS('color', 'rgb(165, 25, 40)')
  await expect(page.getByLabel('使命卡片余额')).toHaveText('0 / 600')
  await expect(page.locator('#simulator-main')).not.toContainText('卡片不足，')
  await page.getByRole('button', { name: '获取使命卡片' }).click()
  const hold = page.getByRole('button', { name: '连续长按1.5秒领取卡片' })
  await hold.focus(); await page.keyboard.down('Space'); await page.clock.runFor(1600); await page.keyboard.up('Space')
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('本次获得')
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await expect(draw).toBeEnabled(); await expect(draw).not.toHaveClass(/sim-insufficient/); await stable()
  // Top up through the real claim UI, keeping the fake animation clock in one document.
  while (Number((await page.getByLabel('使命卡片余额').innerText()).split(' /')[0]) < 9) {
    await page.getByRole('button', { name: '获取使命卡片' }).click()
    await hold.focus(); await page.keyboard.down('Space'); await page.clock.runFor(1600); await page.keyboard.up('Space')
    await expect(page.getByRole('dialog').getByRole('status')).toContainText('本次获得')
    await page.getByRole('button', { name: '关闭', exact: true }).click()
    await stable()
  }
  for (let i = 1; i < 10; i++) {
    await draw.click(); await expect(page.getByLabel('模拟抽奖舞台')).toHaveAttribute('aria-busy', 'true'); await stable(); await expect(draw).toBeDisabled()
    await finishAnimation()
    const paid = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).balance, key)
    await draw.click(); await stable()
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).balance, key)).toBe(paid)
  }
  await expect(draw).toHaveText('奖池已抽完'); await expect(draw).toBeDisabled()
  await page.screenshot({ path: info.outputPath(`stable-complete-${width}.png`), fullPage: true })
})
