// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RealApp from '../../App'

// S3 interaction fixtures deliberately use an isolated storage adapter.
function App() { return <RealApp storage={{ getItem: () => null, setItem: () => {} }} /> }
import { CalculatorView } from './CalculatorView'
import { createDefaultConfig, DEFAULT_CONFIGS } from '../../data/defaults'
import { calculateDraw } from '../../domain/calculations'
import { formatAmount, formatProbability } from '../../domain/format'

afterEach(cleanup)
const card = (name: string) => screen.getByRole('button', { name })
const summary = () => screen.getByRole('region', { name: '轮次与费用' })
const row = (name: string) => screen.getByRole('row', { name: new RegExp(`^${name} `) })
function expectCost(label: string, text: string) {
  expect(within(summary()).getByText(label).nextElementSibling?.textContent).toBe(text)
}

describe('S3 计算主页交互', () => {
  it('默认传说武器，全部十件结果可见；说明迁移到规则页且返回保留已抽记录', async () => {
    const user = userEvent.setup(); render(<App />)
    expect((screen.getByLabelText('转盘类型') as HTMLSelectElement).value).toBe('legendary_weapon')
    expect(screen.getByText('第1抽 / 共10抽')).toBeTruthy()
    const select = within(summary()).getByRole('combobox', { name: '转盘类型' })
    expect(within(select).getAllByRole('option').map(option => option.getAttribute('value'))).toEqual(DEFAULT_CONFIGS.map(config => config.typeId))
    expect(within(select).getByRole('option', { name: '七抽（通用）' })).toBeTruthy()
    expect(screen.queryByRole('group', { name: '转盘模式' })).toBeNull()
    expect(screen.queryByText(/已抽取 \d+ \/ \d+ 件|固定权重 · 不放回抽取|费用按当前配置计算，不是实际支付流水/)).toBeNull()
    expect(screen.getAllByRole('row')).toHaveLength(11)
    expectCost('此前已花费', '0 使命卡片')
    expectCost('下一抽需要', '3 使命卡片')
    expect(screen.queryByText(/每100%概率等效卡片数仅用于比较当前单轮性价比/)).toBeNull()
    expect(screen.queryByText('可自定义概率 ↑')).toBeNull()
    await user.click(card('六等奖'))
    await user.click(card('规则说明'))
    expect(screen.getByRole('main', { name: '规则说明' })).toBeTruthy()
    await user.click(card('性价比计算与解释'))
    expect(screen.getByText(/每100%概率等效卡片数仅用于比较当前单轮性价比/)).toBeTruthy()
    await user.click(card('概率计算'))
    expect(card('六等奖').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('第2抽 / 共10抽')).toBeTruthy()
    expect(screen.queryByText(/每100%概率等效卡片数仅用于比较当前单轮性价比/)).toBeNull()
  })
  it('国服案例：六、七等奖已抽；再次点击撤销', async () => {
    const user = userEvent.setup(); render(<App />)
    await user.click(card('六等奖')); await user.click(card('七等奖'))
    expect(card('六等奖').getAttribute('aria-pressed')).toBe('true')
    expect(within(card('六等奖')).getByText('1')).toBeTruthy()
    expect(screen.getByText('第3抽 / 共10抽')).toBeTruthy()
    expectCost('此前已花费', '8 使命卡片'); expectCost('下一抽需要', '10 使命卡片')
    expectCost('完成本轮后累计', '18 使命卡片'); expectCost('全抽总费用', '888 使命卡片')
    expect(within(row('一等奖')).getByText('0.096%')).toBeTruthy()
    expect(within(row('二等奖')).getByText('1.497%')).toBeTruthy()
    expect(row('二等奖').textContent).toContain('668.000')
    expect(screen.getAllByRole('row')).toHaveLength(11)
    expect(within(row('六等奖')).getAllByRole('cell').map(cell => cell.textContent)).toEqual(['—', '—', '—'])
    await user.click(card('六等奖'))
    expect(card('六等奖').getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByText('第2抽 / 共10抽')).toBeTruthy()
    expect(screen.getAllByRole('row')).toHaveLength(11)
  })
  it('七十抽切换、类型隔离、清空仅当前类型', async () => {
    const user = userEvent.setup(); render(<App />)
    await user.click(card('六等奖'))
    await user.selectOptions(screen.getByLabelText('转盘类型'), 'mythic_character')
    expect(card('六等奖').getAttribute('aria-pressed')).toBe('false')
    expectCost('下一抽需要', '5 使命卡片')
    await user.click(card('一等奖'))
    await user.selectOptions(screen.getByLabelText('转盘类型'), 'seven_draw')
    expect(screen.getAllByRole('row')).toHaveLength(8)
    await user.click(card('七等奖'))
    expect(within(row('二等奖')).getByText('3.125%')).toBeTruthy()
    expect(row('二等奖').textContent).toContain('224.000')
    await user.selectOptions(screen.getByLabelText('转盘类型'), 'mythic_character')
    expect((screen.getByLabelText('转盘类型') as HTMLSelectElement).value).toBe('mythic_character')
    expect(card('一等奖').getAttribute('aria-pressed')).toBe('true')
    await user.click(card('清空已抽记录'))
    expect(card('一等奖').getAttribute('aria-pressed')).toBe('false')
    await user.selectOptions(screen.getByLabelText('转盘类型'), 'legendary_weapon')
    expect(card('六等奖').getAttribute('aria-pressed')).toBe('true')
    await user.selectOptions(screen.getByLabelText('转盘类型'), 'seven_draw')
    expect(card('七等奖').getAttribute('aria-pressed')).toBe('true')
  })
  it.each(['十抽转盘', '七抽转盘'])('%s 最后一件与全部完成，可撤销恢复', async mode => {
    const user = userEvent.setup(); render(<App />)
    await user.selectOptions(screen.getByLabelText('转盘类型'), mode === '十抽转盘' ? 'legendary_weapon' : 'seven_draw')
    const names = ['二等奖','三等奖','四等奖','五等奖','六等奖','七等奖', ...(mode === '十抽转盘' ? ['八等奖','九等奖','十等奖'] : [])]
    for (const name of names) await user.click(card(name))
    expect(screen.getAllByRole('row')).toHaveLength(mode === '十抽转盘' ? 11 : 8)
    expect(within(row('一等奖')).getByText('100.000%')).toBeTruthy()
    await user.click(card('一等奖'))
    expect(screen.getByText('转盘已全部抽完')).toBeTruthy()
    expect(screen.getByRole('table')).toBeTruthy()
    expect(screen.queryByText('下一抽需要')).toBeNull()
    expect(screen.queryByText('完成本轮后累计')).toBeNull()
    expectCost('全抽总费用', mode === '十抽转盘' ? '888 使命卡片' : '698 使命卡片')
    await user.click(card('一等奖'))
    expect(within(row('一等奖')).getByText('100.000%')).toBeTruthy()
  })
  it('键盘 Enter 和空格可标记及撤销', async () => {
    const user = userEvent.setup(); render(<App />)
    card('一等奖').focus()
    await user.keyboard('{Enter}')
    expect(card('一等奖').getAttribute('aria-pressed')).toBe('true')
    await user.keyboard(' ')
    expect(card('一等奖').getAttribute('aria-pressed')).toBe('false')
  })
  it('八种类型显示与 S2 计算一致', async () => {
    const user = userEvent.setup(); render(<App />)
    for (const config of DEFAULT_CONFIGS) {
      await user.selectOptions(screen.getByLabelText('转盘类型'), config.typeId)
      await user.click(card('二等奖'))
      const result = calculateDraw(config, [config.prizes[1].prizeId])
      for (const item of result.rows) {
        const name = config.prizes.find(p => p.prizeId === item.prizeId)!.name
        expect(row(name).textContent).toContain(formatProbability(item.probability).text)
        expect(row(name).textContent).toContain(formatAmount(item.equivalentCost, 'equivalent'))
      }
      expectCost('下一抽需要', `${formatAmount(result.costs!.next, 'cards')} 使命卡片`)
    }
  })
})

describe('异常状态呈现（通过配置注入验证，不提供设置入口）', () => {
  const callbacks = { onToggle: () => {}, onClear: () => {} }
  it('剩余总权重为零时显示错误，不显示100%或无效数值', () => {
    const config = createDefaultConfig('seven_draw')
    config.prizes.forEach((p, i) => { p.weightPercent = i === 0 ? 100 : 0 })
    render(<CalculatorView config={config} drawnIds={[config.prizes[0].prizeId]} {...callbacks} />)
    expect(screen.getByRole('alert').textContent).toContain('剩余奖品总权重为0')
    expect(screen.getByRole('table')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|100.000%/)
  })
  it('无效配置显示错误，费用不冒充有效结果', () => {
    const config = createDefaultConfig('seven_draw'); config.prizes[0].weightPercent = -1
    render(<CalculatorView config={config} drawnIds={[]} {...callbacks} />)
    expect(screen.getByRole('alert').textContent).toContain('配置或已抽记录无效')
    expect(screen.queryByRole('region', { name: '轮次与费用' })).toBeNull()
  })
  it('缺价仍显示概率与待设置价格', () => {
    const config = createDefaultConfig('seven_draw'); config.roundCosts = []
    render(<CalculatorView config={config} drawnIds={[]} {...callbacks} />)
    expect(row('二等奖').textContent).toContain('1.250%')
    expect(row('二等奖').textContent).toContain('待设置价格')
  })
  it('数值超出范围时显示错误', () => {
    const config = createDefaultConfig('seven_draw'); config.prizes[0].weightPercent = Number.MIN_VALUE; config.prizes[1].weightPercent += .08
    render(<CalculatorView config={config} drawnIds={[]} {...callbacks} />)
    expect(screen.getByRole('alert').textContent).toContain('数值超出计算范围')
  })
})

it('标记顺序连续、撤销重排且表格等级顺序不变；数值单元格不触发标记', async () => {
  const user = userEvent.setup(); render(<App />)
  for (const name of ['五等奖', '二等奖', '八等奖']) await user.click(card(name))
  expect(within(card('五等奖')).getByText('1')).toBeTruthy()
  expect(within(card('二等奖')).getByText('2')).toBeTruthy()
  expect(within(card('八等奖')).getByText('3')).toBeTruthy()
  await user.click(card('二等奖'))
  expect(within(card('八等奖')).getByText('2')).toBeTruthy()
  await user.click(card('二等奖'))
  expect(within(card('二等奖')).getByText('3')).toBeTruthy()
  expect(screen.getAllByRole('row').slice(1).map(r => within(r).getByRole('button').getAttribute('aria-label'))).toEqual(DEFAULT_CONFIGS.find(c => c.typeId === 'legendary_weapon')!.prizes.map(p => p.name))
  await user.click(within(row('一等奖')).getAllByRole('cell')[0])
  expect(card('一等奖').getAttribute('aria-pressed')).toBe('false')
  expect(screen.getByRole('heading', { name: '抽奖计算' })).toBeTruthy()
  expect(document.querySelector('.prize-grid')).toBeNull()
})

it('指数列使用当前有效配置，已抽与终局为破折号，清空恢复基准', async () => {
  const user = userEvent.setup()
  const config = createDefaultConfig('legendary_weapon')
  const callbacks = { onToggle: () => {}, onClear: () => {} }
  const view = render(<CalculatorView config={config} drawnIds={[]} {...callbacks} />)
  expect(screen.getAllByRole('columnheader').map(th => th.textContent)).toEqual(['奖品', '下一抽概率', '100%概率等效卡片数', '性价比指数'])
  expect(screen.getAllByText('1.00×')).toHaveLength(10)
  const ids = [config.prizes[5].prizeId, config.prizes[6].prizeId]
  view.rerender(<CalculatorView config={config} drawnIds={ids} {...callbacks} />)
  expect(within(row('二等奖')).getAllByRole('cell')[2].textContent).toBe('0.36×')
  expect(within(row('六等奖')).getAllByRole('cell')[2].textContent).toBe('—')
  config.roundCosts[0] = 6
  view.rerender(<CalculatorView config={config} drawnIds={ids} {...callbacks} />)
  expect(within(row('二等奖')).getAllByRole('cell')[2].textContent).toBe('0.72×')
  config.roundCosts[2] = 0
  view.rerender(<CalculatorView config={config} drawnIds={ids} {...callbacks} />)
  expect(within(row('二等奖')).getAllByRole('cell')[2].textContent).toBe('—')
  view.rerender(<CalculatorView config={config} drawnIds={config.prizes.map(p => p.prizeId)} {...callbacks} />)
  expect(screen.queryByText(/×/)).toBeNull()
  view.unmount()
  render(<App />)
  await user.click(card('六等奖'))
  await user.click(card('清空已抽记录'))
  expect(screen.getAllByText('1.00×')).toHaveLength(10)
  await user.selectOptions(screen.getByLabelText('转盘类型'), 'seven_draw')
  expect(screen.getAllByText('1.00×')).toHaveLength(7)
})
