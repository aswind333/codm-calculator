import { describe, expect, it } from 'vitest'
import { calculateDraw, calculateEquivalentCost } from './calculations'
import { calculateValueIndex } from './valueIndex'
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
