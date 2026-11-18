// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'
import { RulesPage } from './RulesPage'
import { createDefaultConfigs } from '../../data/defaults'
import { saveSettings } from '../../storage/storage'
afterEach(cleanup)
it('默认案例与用户设置隔离，切换案例和三页导航保留主计算状态', async () => {
  const data = new Map<string, string>()
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
  const configs = createDefaultConfigs()
  configs[3].prizes[1].weightPercent += 1; configs[3].prizes[9].weightPercent -= 1
  saveSettings(storage, configs)
  const user = userEvent.setup(); render(<App storage={storage} />)
  await user.selectOptions(screen.getByLabelText('转盘类型'), 'mythic_character')
  await user.click(screen.getByRole('button', { name: '六等奖' }))
  await user.click(screen.getByRole('button', { name: '规则说明' }))
  const main = within(screen.getByRole('main'))
  await user.click(main.getByRole('button', { name: '概率计算规则与实例' }))
  expect(main.getByText('1.497%')).toBeTruthy()
  await user.click(main.getByRole('button', { name: '七抽转盘' }))
  expect(main.getByText('3.125%')).toBeTruthy()
  await user.click(main.getByRole('button', { name: '性价比计算与解释' }))
  expect(main.getByText('10 ÷ 0.05 = 200.000卡')).toBeTruthy()
  expect(screen.getByRole('contentinfo').textContent).toBe('非官方玩家工具 · 设置与记录仅保存在当前设备浏览器。实际转盘价格、奖品概率和活动规则请以游戏内说明为准。')
  expect(main.getByText(/不代表实际保底价格或真实期望总花费/)).toBeTruthy()
  await user.click(screen.getByRole('button', { name: '设置' }))
  expect(screen.getByRole('main', { name: '设置' })).toBeTruthy()
  await user.click(screen.getByRole('button', { name: '规则说明' }))
  await user.click(screen.getByRole('button', { name: '抽奖分析' }))
  expect((screen.getByLabelText('转盘类型') as HTMLSelectElement).value).toBe('mythic_character')
  expect(screen.getByRole('button', { name: '六等奖' }).getAttribute('aria-pressed')).toBe('true')
})
it('两个 FAQ 的按钮关联、鼠标及键盘开关正常', async () => {
  const user = userEvent.setup(); render(<RulesPage />)
  const faq = screen.getByRole('region', { name: 'FAQ 常见问题' })
  const buttons = within(faq).getAllByRole('button')
  expect(buttons).toHaveLength(2)
  for (const button of buttons) {
    expect(button.getAttribute('aria-expanded')).toBe('false')
    await user.click(button)
    const answer = document.getElementById(button.getAttribute('aria-controls')!)!
    expect(answer.hidden).toBe(false)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    await user.keyboard('{Enter}')
    expect(answer.hidden).toBe(true)
    await user.keyboard(' ')
    expect(answer.hidden).toBe(false)
  }
})

it('规则页解释性价比指数的公式、基准、示例与限制', async () => {
  render(<RulesPage />)
  await userEvent.click(screen.getByRole('button', { name: '性价比计算与解释' }))
  expect(screen.getByRole('heading', { name: '性价比指数' })).toBeTruthy()
  expect(screen.getByText('75 ÷ 60 = 1.25×')).toBeTruthy()
  expect(screen.getByText(/第一抽基准不随奖品剔除而改变/)).toBeTruthy()
  expect(screen.getByText(/性价比指数 =（当前中奖概率/)).toBeTruthy()
  expect(screen.getByText(/不代表实际所需抽数，也不保证中奖/)).toBeTruthy()
})

it('主规则默认收起、单项展开、支持键盘且再次进入不记忆状态', async () => {
  const user = userEvent.setup()
  render(<App storage={{ getItem: () => null, setItem: () => {} }} />)
  await user.click(screen.getByRole('button', { name: '规则说明' }))
  const titles = ['三步使用教程', '概率计算规则与实例', '性价比计算与解释']
  const triggers = titles.map(name => screen.getByRole('button', { name }))
  const body = (button: HTMLElement) => document.getElementById(button.getAttribute('aria-controls')!)!
  for (const trigger of triggers) {
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(body(trigger).getAttribute('aria-hidden')).toBe('true')
    expect(body(trigger).hasAttribute('inert')).toBe(true)
  }
  expect(screen.queryByRole('button', { name: '返回概率计算' })).toBeNull()
  expect(screen.getAllByRole('contentinfo')).toHaveLength(1)
  expect(screen.queryByText(/本网站为非官方玩家工具/)).toBeNull()
  triggers[0].focus(); await user.keyboard('{Enter}')
  expect(triggers[0].getAttribute('aria-expanded')).toBe('true')
  expect(body(triggers[0]).hasAttribute('inert')).toBe(false)
  expect(within(body(triggers[0])).getByText('在抽奖分析页面的『转盘类型』下拉菜单中选择对应转盘。')).toBeTruthy()
  expect(within(body(triggers[0])).getByText(/模拟抽奖使用最近成功保存的价格与概率/)).toBeTruthy()
  expect(within(body(triggers[0])).getByText(/点击保存设置/)).toBeTruthy()
  triggers[1].focus(); await user.keyboard(' ')
  expect(triggers[0].getAttribute('aria-expanded')).toBe('false')
  expect(triggers[1].getAttribute('aria-expanded')).toBe('true')
  await user.click(triggers[2])
  expect(triggers[1].getAttribute('aria-expanded')).toBe('false')
  await user.click(triggers[2])
  expect(triggers.every(button => button.getAttribute('aria-expanded') === 'false')).toBe(true)
  const faq = within(screen.getByRole('region', { name: 'FAQ 常见问题' }))
  expect(faq.getAllByRole('button').map(button => button.textContent?.replace('+', ''))).toEqual(['为什么抽走不同奖品，下一抽概率不同？', '为什么要先获取卡片后才能抽奖呢？'])
  await user.click(faq.getByRole('button', { name: /为什么要先获取/ }))
  expect(faq.getByText('谁知号上卡，片片皆辛苦。')).toBeTruthy()
  await user.click(triggers[0])
  await user.click(screen.getByRole('button', { name: '抽奖分析' }))
  await user.click(screen.getByRole('button', { name: '规则说明' }))
  expect(screen.getByRole('button', { name: titles[0] }).getAttribute('aria-expanded')).toBe('false')
})
