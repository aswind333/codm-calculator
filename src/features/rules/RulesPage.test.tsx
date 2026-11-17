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
  expect(main.getByText('1.497%')).toBeTruthy()
  await user.click(main.getByRole('button', { name: '七抽转盘' }))
  expect(main.getByText('3.125%')).toBeTruthy()
  expect(main.getByText('10 ÷ 0.05 = 200.000卡')).toBeTruthy()
  expect(main.getByText(/本网站为非官方玩家工具/)).toBeTruthy()
  expect(main.getByText(/不代表实际保底价格或真实期望总花费/)).toBeTruthy()
  await user.click(screen.getByRole('button', { name: '设置' }))
  expect(screen.getByRole('heading', { name: '自定义转盘设置' })).toBeTruthy()
  await user.click(screen.getByRole('button', { name: '规则说明' }))
  await user.click(screen.getByRole('button', { name: '返回概率计算' }))
  expect((screen.getByLabelText('转盘类型') as HTMLSelectElement).value).toBe('mythic_character')
  expect(screen.getByRole('button', { name: '六等奖' }).getAttribute('aria-pressed')).toBe('true')
})
it('六个 FAQ 的按钮关联、鼠标及键盘开关正常', async () => {
  const user = userEvent.setup(); render(<RulesPage onReturn={() => {}} />)
  const faq = screen.getByRole('region', { name: 'FAQ 常见问题' })
  const buttons = within(faq).getAllByRole('button')
  expect(buttons).toHaveLength(6)
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
