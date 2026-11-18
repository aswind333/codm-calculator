import { describe, expect, it } from 'vitest'
import { createDefaultConfigs } from '../data/defaults'
import { DRAWN_KEY, loadDrawn, loadSettings, saveDrawn, saveSettings, SETTINGS_KEY } from './storage'
import { fromDraft, parseNumber, toDraft } from '../features/settings/draft'
import { validateConfigs } from '../domain/validation'

function memory() {
  const values = new Map<string, string>()
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
}
describe('版本化本地存储', () => {
  it('默认回退、新副本、保存恢复、两个键独立', () => {
    const store = memory(); const c = loadSettings(store).configs
    c[0].roundCosts[0] = 25
    expect(loadSettings(store).configs[0].roundCosts[0]).toBe(3)
    expect(saveSettings(store, c).ok).toBe(true)
    const records = { legendary_vehicle: [c[0].prizes[0].prizeId] }
    expect(saveDrawn(store, records, c).ok).toBe(true)
    expect(loadSettings(store).configs[0].roundCosts[0]).toBe(25)
    expect(loadDrawn(store, c).records).toEqual(records)
    expect(store.values.size).toBe(2)
    expect(JSON.parse(store.getItem(SETTINGS_KEY)!)).toMatchObject({ version: 1 })
  })
  it.each(['{broken', 'null', '{}', '{"version":2,"configs":[]}', '{"version":1,"configs":[]}'])('损坏或不兼容设置安全回退 %s', raw => {
    const store = memory(); store.setItem(SETTINGS_KEY, raw)
    const result = loadSettings(store)
    expect(result.warning).toBeTruthy(); expect(result.configs).toEqual(createDefaultConfigs())
    expect(store.getItem(SETTINGS_KEY)).toBe(raw)
  })
  it('读取失败、写入失败，旧数据不被替换', () => {
    const store = memory(); saveSettings(store, createDefaultConfigs())
    const previous = store.getItem(SETTINGS_KEY)
    const broken = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('quota') } }
    expect(loadSettings(broken).warning).toBeTruthy()
    expect(loadDrawn(broken, createDefaultConfigs()).warning).toBeTruthy()
    expect(saveSettings(broken, createDefaultConfigs()).ok).toBe(false)
    expect(saveDrawn(broken, {}, createDefaultConfigs()).ok).toBe(false)
    expect(store.getItem(SETTINGS_KEY)).toBe(previous)
  })
  it('拒绝非法整份配置，不调用写入', () => {
    const store = memory(); const configs = createDefaultConfigs(); configs[7].roundCosts[0] = NaN
    expect(saveSettings(store, configs).ok).toBe(false)
    expect(store.values.size).toBe(0)
  })
  it.each(['{broken', '{"version":2,"records":{}}', '{"version":1,"records":{"unknown":[]}}', '{"version":1,"records":{"seven_draw":["legendary_weapon:prize_1"]}}', '{"version":1,"records":{"seven_draw":["seven_draw:prize_1","seven_draw:prize_1"]}}'])('拒绝损坏或跨类型已抽记录 %s', raw => {
    const store = memory(); store.setItem(DRAWN_KEY, raw)
    expect(loadDrawn(store, createDefaultConfigs())).toMatchObject({ records: {}, warning: expect.any(String) })
  })
})
describe('草稿输入边界', () => {
  it.each(['', ' ', '-1', '1.5', 'Infinity', 'NaN', '0x10', 'abc'])('无效价格 %s 不可保存', text => {
    const draft = toDraft(createDefaultConfigs()); draft[0].roundCosts[0] = text
    expect(validateConfigs(fromDraft(draft)).valid).toBe(false)
  })
  it('0合法，空值不转0，转换不改变默认数据', () => {
    expect(parseNumber('')).toBeNaN(); expect(parseNumber('0')).toBe(0)
    const draft = toDraft(createDefaultConfigs()); draft[0].roundCosts[0] = '0'
    expect(validateConfigs(fromDraft(draft)).valid).toBe(true)
    expect(createDefaultConfigs()[0].roundCosts[0]).toBe(3)
  })
})

it('既有v1数组原样保留标记顺序，保存不排序、清空只影响当前类型', () => {
  const store = memory(), configs = createDefaultConfigs()
  const first = configs[0], other = configs[7]
  const order = [4, 1, 7].map(i => first.prizes[i].prizeId)
  store.setItem(DRAWN_KEY, JSON.stringify({ version: 1, records: { [first.typeId]: order, [other.typeId]: [other.prizes[0].prizeId] } }))
  const loaded = loadDrawn(store, configs)
  expect(loaded.warning).toBeUndefined()
  expect(loaded.records[first.typeId]).toEqual(order)
  const removed = order.filter(id => id !== first.prizes[1].prizeId)
  expect(saveDrawn(store, { ...loaded.records, [first.typeId]: removed }, configs).ok).toBe(true)
  expect(loadDrawn(store, configs).records[first.typeId]).toEqual(removed)
  expect(saveDrawn(store, { ...loaded.records, [first.typeId]: [] }, configs).ok).toBe(true)
  expect(loadDrawn(store, configs).records).toEqual({ [first.typeId]: [], [other.typeId]: [other.prizes[0].prizeId] })
  expect(store.values.size).toBe(1)
})
