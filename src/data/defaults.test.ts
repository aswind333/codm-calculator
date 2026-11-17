import { describe, expect, it } from 'vitest'
import { createDefaultConfig, createDefaultConfigs, DEFAULT_CONFIGS } from './defaults'
import { validateConfigs } from '../domain/validation'

// Independent acceptance fixtures transcribed from PROBABILITY_SPEC §2.
const cases = [
  ['legendary_vehicle', '传说载具转盘', [3,5,10,20,30,50,60,90,110,160], 538],
  ['legendary_melee', '传说近战转盘', [3,5,10,20,30,50,60,90,110,160], 538],
  ['legendary_vehicle_weapon', '传说载具+武器转盘', [3,5,10,20,40,60,90,150,160,350], 888],
  ['legendary_weapon', '传说武器转盘', [3,5,10,20,40,60,90,130,180,350], 888],
  ['mythic_weapon', '神话武器转盘', [3,5,10,20,40,60,90,150,210,420], 1008],
  ['legendary_character', '传说角色转盘', [3,5,10,20,40,60,90,130,230,420], 1008],
  ['mythic_character', '神话角色转盘', [5,8,15,30,60,90,130,210,350,550], 1448],
  ['seven_draw', '七抽转盘（通用）', [3,7,18,50,90,180,350], 698],
] as const

describe('AC-01～04 / T-01、T-06 默认数据部分', () => {
  it.each(cases)('%s 的逐轮费用、权重、名称与数量', (id, label, prices, total) => {
    const config = createDefaultConfig(id)
    const weights = id === 'seven_draw'
      ? [0.08,1.25,6.67,7.5,8.5,16,60]
      : [0.08,1.25,4,4.67,5.5,6.5,10,11,28,29]
    expect(config.label).toBe(label)
    expect(config.currencyLabel).toBe('使命卡片')
    expect(config.prizeCount).toBe(id === 'seven_draw' ? 7 : 10)
    expect(config.roundCosts).toEqual(prices)
    expect(config.roundCosts.reduce((sum, cost) => sum + cost, 0)).toBe(total)
    expect(config.prizes.map(prize => prize.weightPercent)).toEqual(weights)
    expect(config.prizes.reduce((sum, prize) => sum + prize.weightPercent, 0)).toBeCloseTo(100, 10)
    expect(config.prizes.map(prize => prize.name)).toEqual(
      ['一等奖','二等奖','三等奖','四等奖','五等奖','六等奖','七等奖','八等奖','九等奖','十等奖'].slice(0, weights.length),
    )
    expect(config.prizes.map(prize => prize.prizeId)).toEqual(weights.map((_, i) => `${id}:prize_${i + 1}`))
  })

  it('完整8类、7类十抽及1类七抽，所有奖品 ID 跨类型唯一', () => {
    const configs = createDefaultConfigs()
    expect(configs.map(config => config.typeId)).toEqual(cases.map(row => row[0]))
    expect(configs.filter(config => config.prizeCount === 10)).toHaveLength(7)
    const ids = configs.flatMap(config => config.prizes.map(prize => prize.prizeId))
    expect(new Set(ids).size).toBe(77)
    expect(validateConfigs(configs)).toEqual({ valid: true, issues: [] })
  })

  it('编辑任意副本不会影响其他类型、后续副本或出厂模板；恢复保留稳定 ID', () => {
    const original = JSON.stringify(DEFAULT_CONFIGS)
    const configs = createDefaultConfigs()
    const secondCopy = createDefaultConfigs()
    for (const config of configs) {
      config.prizes[0].name = '自定义'
      config.prizes[0].weightPercent = 50
      config.roundCosts[0] = 999
      config.currencyLabel = 'CP'
      expect(createDefaultConfig(config.typeId)).toEqual(secondCopy.find(item => item.typeId === config.typeId))
    }
    expect(JSON.stringify(DEFAULT_CONFIGS)).toBe(original)
    const one = createDefaultConfigs()
    one[0].prizes[0].name = '仅修改第一类'
    one[0].roundCosts[0] = 777
    expect(one.slice(1)).toEqual(secondCopy.slice(1))
    expect(secondCopy).toEqual(DEFAULT_CONFIGS)
  })

  it('出厂模板在运行时递归冻结', () => {
    expect(Object.isFrozen(DEFAULT_CONFIGS)).toBe(true)
    for (const config of DEFAULT_CONFIGS) {
      expect(Object.isFrozen(config)).toBe(true)
      expect(Object.isFrozen(config.prizes)).toBe(true)
      expect(Object.isFrozen(config.roundCosts)).toBe(true)
      for (const prize of config.prizes) expect(Object.isFrozen(prize)).toBe(true)
    }
    expect(() => Reflect.set(DEFAULT_CONFIGS[0].prizes[0], 'name', '污染')).not.toThrow()
    expect(Reflect.set(DEFAULT_CONFIGS[0].prizes[0], 'name', '污染')).toBe(false)
  })
})
