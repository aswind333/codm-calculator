import { describe, expect, it } from 'vitest'
import { calculateDraw, calculateEquivalentCost } from './calculations'
import { calculateValueIndex, calculatePoolValueIndex } from './valueIndex'
import { formatValueIndex } from './format'
import { createDefaultConfig, DEFAULT_CONFIGS } from '../data/defaults'

describe('性价比指数：复用完整精度等效花费', () => {
  it.each(DEFAULT_CONFIGS)('$typeId 第一抽每件有效奖品均为1.00×', config => {
    const result = calculateDraw(config, [])
    for (const row of result.rows) expect(formatValueIndex(calculateValueIndex(row.equivalentCost, row.equivalentCost))).toBe('1.00×')
  })
  it.each([
    [.04, 3, .10, 6, 1.25],
    [.04, 3, .04, 6, .5],
    [.04, 3, .08, 3, 2],
  ])('概率 %s 价格 %s → 概率 %s 价格 %s = %s', (p0, c0, pn, cn, expected) => {
    const value = calculateValueIndex(calculateEquivalentCost(p0, { status: 'ok', value: c0 }), calculateEquivalentCost(pn, { status: 'ok', value: cn }))
    expect(value).toBeCloseTo(expected, 12)
    expect(formatValueIndex(value)).toBe(`${expected.toFixed(2)}×`)
  })
  it('零概率、零价格、缺价、无下一抽及数值异常均不可用', () => {
    const valid = calculateEquivalentCost(.04, { status: 'ok', value: 3 })
    const invalid = [
      undefined,
      calculateEquivalentCost(0, { status: 'ok', value: 3 }),
      calculateEquivalentCost(.04, { status: 'ok', value: 0 }),
      calculateEquivalentCost(.04, { status: 'missing-price', value: null }),
      calculateEquivalentCost(.04, { status: 'complete', value: null }),
      calculateEquivalentCost(Number.MIN_VALUE, { status: 'ok', value: 3 }),
    ]
    for (const amount of invalid) {
      expect(calculateValueIndex(amount, valid)).toBeNull()
      expect(calculateValueIndex(valid, amount)).toBeNull()
    }
    for (const value of [null, NaN, Infinity, -1, 0]) expect(formatValueIndex(value)).toBe('—')
    expect(calculateValueIndex({ status: 'ok', value: Number.MAX_VALUE }, { status: 'ok', value: Number.MIN_VALUE })).toBeNull()
  })
  it('基准按当前完整奖池计算，使用未舍入值；标记、清空、配置修改重新派生', () => {
    const config = createDefaultConfig('legendary_weapon')
    const ids = [config.prizes[5].prizeId, config.prizes[6].prizeId]
    function index() {
      const initial = calculateDraw(config, [])
      const current = calculateDraw(config, ids)
      return calculateValueIndex(initial.rows[1].equivalentCost, current.rows.find(r => r.prizeId === config.prizes[1].prizeId)?.equivalentCost)
    }
    expect(index()).toBeCloseTo(3 / (10 * .835), 12)
    expect(formatValueIndex(index())).toBe('0.36×')
    config.roundCosts[0] = 6
    expect(index()).toBeCloseTo(6 / (10 * .835), 12)
    config.prizes[5].weightPercent += 10
    config.prizes[9].weightPercent -= 10
    expect(index()).toBeCloseTo(6 / (10 * .735), 12)
    expect(calculateDraw(config, config.prizes.map(p => p.prizeId)).rows).toEqual([])
  })
})

it('七抽和十抽全部奖池状态的统一指数与原逐奖品结果及总权重公式一致', () => {
  for (const type of ['legendary_weapon', 'seven_draw'] as const) {
    const config = createDefaultConfig(type)
    const baseline = calculateDraw(config, [])
    const initialWeight = config.prizes.reduce((sum, p) => sum + p.weightPercent, 0)
    for (let mask = 0; mask < 2 ** config.prizeCount; mask++) {
      const ids = config.prizes.filter((_, i) => mask & (1 << i)).map(p => p.prizeId)
      const current = calculateDraw(config, ids)
      const index = calculatePoolValueIndex(config, current)
      if (current.probabilities.status !== 'ready') { expect(index).toBeNull(); continue }
      const expected = initialWeight / current.probabilities.remainingWeight * (config.roundCosts[0] / config.roundCosts[ids.length])
      expect(index).toBeCloseTo(expected, 12)
      for (const row of current.rows) {
        const old = calculateValueIndex(baseline.rows.find(p => p.prizeId === row.prizeId)?.equivalentCost, row.equivalentCost)
        expect(index).toBeCloseTo(old!, 12)
        // Old per-prize division can straddle a half-cent rounding boundary.
        // Compare full precision; shared display follows the explicit pool formula.
        expect(formatValueIndex(index)).toBe(formatValueIndex(expected))
      }
    }
  }
})

it('统一指数跳过零权重奖品，使用最新价格与权重；免费或无剩余权重不可计算', () => {
  const config = createDefaultConfig('seven_draw')
  config.prizes[1].weightPercent += config.prizes[0].weightPercent
  config.prizes[0].weightPercent = 0
  expect(calculatePoolValueIndex(config, calculateDraw(config, []))).toBe(1)
  config.roundCosts[0] = 6
  const ids = [config.prizes[6].prizeId]
  expect(calculatePoolValueIndex(config, calculateDraw(config, ids))).toBeCloseTo(100 / 40 * 6 / 7, 12)
  config.roundCosts[1] = 0
  expect(calculatePoolValueIndex(config, calculateDraw(config, ids))).toBeNull()
  config.roundCosts[0] = 0
  expect(calculatePoolValueIndex(config, calculateDraw(config, []))).toBeNull()
  expect(calculatePoolValueIndex(config, calculateDraw(config, config.prizes.slice(1).map(p => p.prizeId)))).toBeNull()
})
