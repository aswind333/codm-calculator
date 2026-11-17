import { afterEach, expect, it, vi } from 'vitest'
import { browserStorage } from './browserStorage'
import { loadSettings, saveSettings } from './storage'
import { createDefaultConfigs } from '../data/defaults'

afterEach(() => vi.unstubAllGlobals())
it('浏览器适配器实际转发读写，版本化设置可恢复', () => {
  const values = new Map<string, string>()
  vi.stubGlobal('window', { localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
  } })
  const configs = createDefaultConfigs(); configs[0].roundCosts[0] = 17
  expect(saveSettings(browserStorage, configs).ok).toBe(true)
  expect(loadSettings(browserStorage).configs[0].roundCosts[0]).toBe(17)
})
it('localStorage 属性访问本身抛 SecurityError 时也安全处理', () => {
  vi.stubGlobal('window', { get localStorage() { throw new Error('SecurityError') } })
  expect(loadSettings(browserStorage).warning).toBeTruthy()
  expect(saveSettings(browserStorage, createDefaultConfigs()).ok).toBe(false)
})
