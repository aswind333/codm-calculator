import { describe, expect, it } from 'vitest'
import { createDefaultConfig, createDefaultConfigs, DEFAULT_CONFIGS } from '../data/defaults'
import { validateConfig, validateConfigs } from './validation'

describe('配置边界校验', () => {
  it.each([null, undefined, [], '', 1, true])('拒绝非对象 %s', value => {
    expect(validateConfig(value).valid).toBe(false)
  })
  it.each([-1, NaN, Infinity, -Infinity, '', '1', null, undefined])('拒绝非法权重 %s', value => {
    const config = createDefaultConfig('seven_draw')
    const input = { ...config, prizes: config.prizes.map((prize, i) => i === 0 ? { ...prize, weightPercent: value } : prize) }
    expect(validateConfig(input).issues.some(issue => issue.path === 'prizes[0].weightPercent')).toBe(true)
  })
  it.each([-1, 0.5, NaN, Infinity, -Infinity, '', '0', null, undefined])('拒绝非法价格 %s', value => {
    const config = createDefaultConfig('seven_draw')
    expect(validateConfig({ ...config, roundCosts: [value, ...config.roundCosts.slice(1)] }).valid).toBe(false)
  })
  it.each(['label', 'currencyLabel'])('拒绝空名称字段 %s', field => {
    for (const value of ['', '  ', null, 5]) {
      expect(validateConfig({ ...createDefaultConfig('seven_draw'), [field]: value }).valid).toBe(false)
    }
  })
  it('拒绝奖品空名称，允许改名且不改变 ID', () => {
    const config = createDefaultConfig('seven_draw')
    config.prizes[0].name = ' '
    expect(validateConfig(config).valid).toBe(false)
    config.prizes[0].name = '自定义奖品'
    config.currencyLabel = 'CP'
    expect(validateConfig(config).valid).toBe(true)
    expect(config.prizes[0].prizeId).toBe('seven_draw:prize_1')
  })
  it.each([0.5e-6, -0.5e-6, 0.999e-6, -0.999e-6])('接受容差内偏差 %s', delta => {
    const config = createDefaultConfig('seven_draw')
    config.prizes[6].weightPercent += delta
    expect(validateConfig(config).valid).toBe(true)
  })
  it.each([1.001e-6, -1.001e-6, 1, -1])('拒绝容差外偏差 %s，不使用显示舍入值校验', delta => {
    const config = createDefaultConfig('seven_draw')
    config.prizes[6].weightPercent += delta
    expect(validateConfig(config).valid).toBe(false)
  })
  it('允许零价格和部分零权重，拒绝全零及求和溢出', () => {
    const config = createDefaultConfig('seven_draw')
    config.roundCosts.fill(0)
    config.prizes.forEach((prize, i) => { prize.weightPercent = i === 0 ? 100 : 0 })
    expect(validateConfig(config).valid).toBe(true)
    config.prizes[0].weightPercent = 0
    expect(validateConfig(config).valid).toBe(false)
    config.prizes.forEach(prize => { prize.weightPercent = Number.MAX_VALUE })
    expect(validateConfig(config).valid).toBe(false)
  })
  it('拒绝未知类型、错误数量、缺项、多项及非数组', () => {
    const config = createDefaultConfig('seven_draw')
    for (const patch of [
      { typeId: 'unknown' }, { prizeCount: 10 }, { prizeCount: 8 },
      { prizes: config.prizes.slice(1) }, { prizes: [...config.prizes, config.prizes[0]] },
      { roundCosts: config.roundCosts.slice(1) }, { roundCosts: [...config.roundCosts, 0, 0, 0] },
      { prizes: null }, { roundCosts: null },
    ]) expect(validateConfig({ ...config, ...patch }).valid).toBe(false)
  })
  it('拒绝稀疏数组与损坏奖品对象', () => {
    const config = createDefaultConfig('seven_draw')
    expect(validateConfig({ ...config, roundCosts: new Array(7) }).valid).toBe(false)
    expect(validateConfig({ ...config, prizes: new Array(7) }).valid).toBe(false)
    expect(validateConfig({ ...config, prizes: [null, ...config.prizes.slice(1)] }).valid).toBe(false)
  })
  it.each(['', 'seven_draw:prize_2', 'legendary_weapon:prize_1', 'other'])('拒绝缺失、重复、跨类型或未知奖品 ID %s', prizeId => {
    const config = createDefaultConfig('seven_draw')
    expect(validateConfig({ ...config, prizes: [{ ...config.prizes[0], prizeId }, ...config.prizes.slice(1)] }).valid).toBe(false)
  })
  it('拒绝奖品等级交换，不静默改变稳定 ID 对应关系', () => {
    const config = createDefaultConfig('seven_draw')
    config.prizes.reverse()
    expect(validateConfig(config).valid).toBe(false)
  })
  it('整份配置拒绝缺少、重复、额外、非法或损坏类型，允许类型顺序调整', () => {
    const configs = createDefaultConfigs()
    for (const input of [null, {}, [], configs.slice(1), [...configs, configs[0]],
      [configs[0], ...configs.slice(0, 7)], [...configs.slice(1), null], new Array(8)]) {
      expect(validateConfigs(input).valid).toBe(false)
    }
    expect(validateConfigs(configs.toReversed()).valid).toBe(true)
    configs[7].roundCosts[0] = -1
    const result = validateConfigs(configs)
    expect(result.valid).toBe(false)
    expect(result.issues.some(issue => issue.path === '[7].roundCosts[0]')).toBe(true)
  })
  it('校验不修改输入，不归一化错误权重或把空价补成0', () => {
    expect(validateConfigs(DEFAULT_CONFIGS).valid).toBe(true)
    const config = createDefaultConfig('seven_draw')
    config.prizes[0].weightPercent = 99
    const before = JSON.stringify(config)
    expect(validateConfig(config).valid).toBe(false)
    expect(JSON.stringify(config)).toBe(before)
  })
})
