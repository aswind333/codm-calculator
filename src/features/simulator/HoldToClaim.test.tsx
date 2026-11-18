// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { HoldToClaim } from './HoldToClaim'
afterEach(cleanup)
it('仅领取按钮阻止原生触摸默认行为和菜单，不影响外部区域', () => {
  render(<><HoldToClaim disabled={false} onClaim={vi.fn()} /><p data-testid="outside">外部文字</p></>)
  const button = screen.getByRole('button')
  for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'contextmenu']) {
    const event = new Event(type, { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'touches', { value: [{ clientX: 0, clientY: 0 }] })
    button.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    const outside = new Event(type, { bubbles: true, cancelable: true })
    screen.getByTestId('outside').dispatchEvent(outside)
    expect(outside.defaultPrevented).toBe(false)
  }
})
it('卸载后清理按钮的原生事件监听器', () => {
  const view = render(<HoldToClaim disabled={false} onClaim={vi.fn()} />)
  const button = screen.getByRole('button')
  view.unmount()
  const event = new Event('contextmenu', { cancelable: true })
  button.dispatchEvent(event)
  expect(event.defaultPrevented).toBe(false)
})
