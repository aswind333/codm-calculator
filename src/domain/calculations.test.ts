import { describe, expect, it } from 'vitest'
import { createDefaultConfig, DEFAULT_CONFIGS } from '../data/defaults'
import type { DrawTypeId, ReadonlyDrawConfig } from './types'
import { calculateCosts, calculateDraw, calculateEquivalentCost, calculateRemainingProbabilities, getNextRound } from './calculations'
import { formatAmount, formatProbability } from './format'
const ok = (value: number) => ({ status: 'ok' as const, value })
const run = (type: DrawTypeId, ranks: number[] = []) => {
  const config = createDefaultConfig(type)
  return calculateDraw(config, ranks.map(rank => config.prizes[rank - 1].prizeId))
}
const probability = (result: ReturnType<typeof run>, rank: number) => {
  const row = result.rows.find(row => row.prizeId.endsWith(`:prize_${rank}`))!
  return formatProbability(row.probability).text
}
const equivalent = (result: ReturnType<typeof run>, rank: number) =>
  formatAmount(result.rows.find(row => row.prizeId.endsWith(`:prize_${rank}`))!.equivalentCost, 'equivalent')

describe('PROBABILITY_SPEC T-01～T-10', () => {
  it.each(['legendary_weapon', 'seven_draw'] as const)('T-01 %s 初始概率', type => {
    const result = run(type)
    expect(probability(result, 1)).toBe('0.080%')
    expect(probability(result, 2)).toBe('1.250%')
    expect(result.rows.reduce((sum, row) => sum + row.probability, 0)).toBeCloseTo(1, 10)
    expect(result.costs?.paid).toEqual(ok(0))
  })
  it('T-02 十抽剔除六、七等奖', () => {
    const result = run('legendary_weapon', [6, 7])
    expect(result.probabilities).toMatchObject({ status: 'ready', nextRound: 3, remainingWeight: 83.5 })
    expect(probability(result, 1)).toBe('0.096%')
    expect(probability(result, 2)).toBe('1.497%')
    expect(probability(result, 10)).toBe('34.731%')
    expect(equivalent(result, 1)).toBe('10437.500')
    expect(equivalent(result, 2)).toBe('668.000')
    expect(result.costs).toMatchObject({ paid: ok(8), next: ok(10), after: ok(18), total: ok(888) })
  })
  it('T-03 相同轮次不同集合', () => {
    expect(probability(run('legendary_weapon', [10]), 2)).toBe('1.761%')
    expect(probability(run('legendary_weapon', [9]), 2)).toBe('1.736%')
  })
  it('T-04 七抽剔除60%', () => {
    const result = run('seven_draw', [7])
    expect(result.probabilities).toMatchObject({ status: 'ready', nextRound: 2, remainingWeight: 40 })
    expect([1,2,3].map(rank => probability(result, rank))).toEqual(['0.200%', '3.125%', '16.675%'])
    expect(equivalent(result, 2)).toBe('224.000')
    expect(result.costs).toMatchObject({ paid: ok(3), next: ok(7), after: ok(10), total: ok(698) })
  })
  it('T-05 剔除顺序无关', () => {
    expect(run('legendary_weapon', [6,7])).toEqual(run('legendary_weapon', [7,6]))
  })
  it('T-06 八种转盘费用独立', () => {
    expect(DEFAULT_CONFIGS.map(c => calculateCosts(c.roundCosts, 0, c.prizeCount).total)).toEqual([538,538,888,888,1008,1008,1448,698].map(ok))
    expect(run('legendary_weapon', [1,2,3,4,5,6,7]).costs?.next).toEqual(ok(130))
    expect(run('legendary_vehicle_weapon', [1,2,3,4,5,6,7]).costs?.next).toEqual(ok(150))
    expect(run('mythic_character').costs?.next).toEqual(ok(5))
    expect(run('seven_draw', [1,2]).costs).toMatchObject({ next: ok(18), paid: ok(10), after: ok(28), total: ok(698) })
  })
  it('T-07 首抽单轮等效成本', () => {
    expect(equivalent(run('legendary_weapon'), 2)).toBe('240.000')
    expect(equivalent(run('mythic_character'), 2)).toBe('400.000')
  })
  it.each([['legendary_weapon', 538, 888], ['seven_draw', 348, 698]] as const)('T-08 %s 末轮及完成', (type, paid, total) => {
    const c = createDefaultConfig(type)
    const ids = c.prizes.map(p => p.prizeId)
    const last = calculateDraw(c, ids.slice(1))
    expect(probability(last, 1)).toBe('100.000%')
    expect(equivalent(last, 1)).toBe('350.000')
    expect(last.costs).toMatchObject({ paid: ok(paid), next: ok(350), after: ok(total), total: ok(total) })
    const complete = calculateDraw(c, ids)
    expect(complete.probabilities).toMatchObject({ status: 'complete', nextRound: null, rows: [] })
    expect(complete.rows).toEqual([])
    expect(complete.costs).toMatchObject({ paid: ok(total), total: ok(total), next: { status: 'complete', value: null }, after: { status: 'complete', value: null } })
  })
  it.each([-1, NaN, Infinity, -Infinity, 2, '', null])('T-09 非法权重 %s', weightPercent => {
    const c = createDefaultConfig('seven_draw')
    expect(calculateDraw({ ...c, prizes: [{ ...c.prizes[0], weightPercent }, ...c.prizes.slice(1)] }, []).probabilities.status).toBe('invalid')
  })
  it('T-09 零权重、零剩余总权重、零权重末件及不可能的已抽记录', () => {
    const c = createDefaultConfig('seven_draw')
    c.prizes[1].weightPercent += c.prizes[0].weightPercent
    c.prizes[0].weightPercent = 0
    const result = calculateDraw(c, [])
    expect(probability(result, 1)).toBe('0.000%')
    expect(equivalent(result, 1)).toBe('当前不可抽中')
    expect(calculateDraw(c, c.prizes.slice(1).map(p => p.prizeId)).probabilities.status).toBe('zero-weight')
    const impossible = calculateDraw(c, [c.prizes[0].prizeId]).probabilities
    expect(impossible).toMatchObject({ status: 'ready', warnings: [expect.stringContaining('不可能被抽到')] })
    c.prizes.forEach((p, i) => { p.weightPercent = i === 0 ? 100 : 0 })
    expect(calculateDraw(c, [c.prizes[0].prizeId]).probabilities.status).toBe('zero-weight')
  })
  it.each([undefined, null, '', -1, 1.5, NaN, Infinity])('T-09 缺失或非法本轮价格 %s 不阻断概率', price => {
    const c = createDefaultConfig('seven_draw')
    const result = calculateDraw({ ...c, roundCosts: [price, ...c.roundCosts.slice(1)] }, [])
    expect(probability(result, 2)).toBe('1.250%')
    expect(equivalent(result, 2)).toBe('待设置价格')
    expect(result.costs?.paid).toEqual(ok(0))
    expect(result.costs?.total.status).toBe('missing-price')
  })
  it('T-09 免费0卡合法', () => {
    const c = createDefaultConfig('seven_draw'); c.roundCosts[0] = 0
    const result = calculateDraw(c, [])
    expect(equivalent(result, 2)).toBe('0.000')
    expect(result.costs?.next).toEqual(ok(0))
  })
  it('T-09 拒绝错误集合、跨类型、重复 ID 及无效配置', () => {
    const c = createDefaultConfig('seven_draw')
    for (const ids of [null, {}, 'id', ['unknown'], ['legendary_weapon:prize_1'], [c.prizes[0].prizeId, c.prizes[0].prizeId], new Array(1), new Array(7)]) {
      expect(calculateDraw(c, ids).probabilities.status).toBe('invalid')
    }
    for (const config of [null, {}, { ...c, prizeCount: 10 }, { ...c, typeId: 'unknown' }, { ...c, prizes: [] }]) {
      expect(calculateDraw(config, []).probabilities.status).toBe('invalid')
    }
    expect(calculateDraw(c, new Set([c.prizes[0].prizeId]))).toEqual(calculateDraw(c, [c.prizes[0].prizeId]))
  })
  it('T-10 仅最终显示舍入', () => {
    expect(formatProbability(0.08 / 83.5).text).toBe('0.096%')
    expect(formatProbability(1.25 / 83.5).text).toBe('1.497%')
    expect(formatProbability(1).text).toBe('100.000%')
    expect(formatAmount(ok(668), 'equivalent')).toBe('668.000')
    expect(formatAmount(ok(10), 'cards')).toBe('10')
    const result = run('legendary_weapon', [6,7])
    expect(result.rows[1].probability).toBe(1.25 / 83.5)
    expect(result.rows[1].equivalentCost).toEqual(ok(668))
    expect(10 / 0.01497).not.toBe(668)
    expect(formatAmount(ok(1.2345), 'equivalent')).toBe('1.235')
    expect(formatAmount(ok(1.23449), 'equivalent')).toBe('1.234')
  })
})

// Exhaustive subsets are test fixtures only, not a runtime prediction feature.
describe('全部默认奖池子集不变量', () => {
  for (const config of DEFAULT_CONFIGS) {
    it(`${config.typeId}: ${2 ** config.prizeCount} 个子集`, () => {
      const before = JSON.stringify(config)
      let visited = 0
      for (let mask = 0; mask < 2 ** config.prizeCount; mask++) {
        const selected = config.prizes.filter((_, i) => mask & (1 << i))
        const ids = selected.map(p => p.prizeId)
        const result = calculateDraw(config, ids)
        expect(result).toEqual(calculateDraw(config, ids.toReversed()))
        const remaining = config.prizes.filter(p => !ids.includes(p.prizeId))
        expect(result.rows.map(row => row.prizeId)).toEqual(remaining.map(p => p.prizeId))
        expect(result.costs?.paid).toEqual(ok(config.roundCosts.slice(0, ids.length).reduce((s, v) => s + v, 0)))
        if (remaining.length === 0) {
          expect(result.probabilities.status).toBe('complete')
          expect(result.costs?.next.status).toBe('complete')
        } else {
          expect(result.probabilities).toMatchObject({ status: 'ready', nextRound: ids.length + 1 })
          expect(Math.abs(result.rows.reduce((s, r) => s + r.probability, 0) - 1)).toBeLessThanOrEqual(1e-10)
          const weight = remaining.reduce((s, p) => s + p.weightPercent, 0)
          result.rows.forEach((row, i) => {
            expect(row.probability).toBeGreaterThanOrEqual(0)
            expect(row.probability).toBeLessThanOrEqual(1)
            expect(row.probability).toBe(remaining[i].weightPercent / weight)
            expect(row.equivalentCost.status).toBe('ok')
            expect(Number.isFinite(row.equivalentCost.value)).toBe(true)
          })
          expect(result.costs?.next).toEqual(ok(config.roundCosts[ids.length]))
          expect(result.costs?.after).toEqual(ok(config.roundCosts.slice(0, ids.length + 1).reduce((s, v) => s + v, 0)))
          if (remaining.length === 1) expect(result.rows[0].probability).toBe(1)
        }
        visited++
      }
      expect(visited).toBe(2 ** config.prizeCount)
      expect(JSON.stringify(config)).toBe(before)
    })
  }
})

describe('额外异常与独立性', () => {
  it('缺价只影响依赖它的费用字段', () => {
    expect(calculateCosts([3,7], 1, 7)).toMatchObject({ paid: ok(3), next: ok(7), after: ok(10), total: { status: 'missing-price' } })
    expect(calculateCosts([undefined,7,18,50,90,180,350], 1, 7)).toMatchObject({ paid: { status: 'missing-price' }, next: ok(7), after: { status: 'missing-price' } })
    expect(calculateCosts([3,7,18,50,90,180,350,0], 1, 7).total.status).toBe('invalid')
    expect(calculateCosts(new Array(7), 0, 7).next.status).toBe('missing-price')
    expect(calculateCosts(null, 0, 7).paid).toEqual(ok(0))
  })
  it('非法轮次不得作为有效费用', () => {
    for (const k of [-1, 0.5, 8, NaN, Infinity]) {
      expect(getNextRound(k, 7).status).toBe('invalid')
      expect(calculateCosts([], k, 7).next.status).toBe('invalid')
    }
    expect(getNextRound(0, 8).status).toBe('invalid')
  })
  it('数值溢出和下溢返回明确状态', () => {
    expect(calculateCosts(Array(7).fill(Number.MAX_VALUE), 2, 7).paid.status).toBe('numeric-error')
    expect(calculateEquivalentCost(Number.MIN_VALUE, ok(3)).status).toBe('numeric-error')
    const c = createDefaultConfig('seven_draw'); c.prizes[0].weightPercent = Number.MIN_VALUE; c.prizes[1].weightPercent += 0.08
    expect(calculateDraw(c, []).probabilities.status).toBe('numeric-error')
  })
  it('极小正概率不会在内部置零，显示提供辅助标志', () => {
    const c = createDefaultConfig('seven_draw'); c.prizes[0].weightPercent = 1e-8; c.prizes[1].weightPercent += 0.08 - 1e-8
    const result = calculateDraw(c, [])
    expect(result.rows[0].probability).toBeGreaterThan(0)
    expect(formatProbability(result.rows[0].probability)).toEqual({ text: '0.000%', roundedToZero: true })
    expect(result.rows[0].equivalentCost.status).toBe('ok')
  })
  it('格式化不伪装非法数，合法大数也固定小数位', () => {
    for (const n of [NaN, Infinity, -1]) {
      expect(formatAmount(ok(n), 'equivalent')).toBe('无效数据')
      expect(formatProbability(n).text).toBe('—')
      expect(calculateEquivalentCost(n, ok(3)).status).toBe('invalid')
    }
    expect(formatAmount(ok(1e21), 'equivalent')).toBe('1000000000000000000000.000')
    expect(formatAmount(ok(1.2), 'cards')).toBe('无效数据')
    expect(calculateEquivalentCost(0.5, ok(Infinity)).status).toBe('invalid')
  })
  it('价格、名称修改不影响概率，输入和已抽数组不被修改', () => {
    const c = createDefaultConfig('seven_draw')
    const ids = Object.freeze([c.prizes[6].prizeId])
    const before = JSON.stringify(c)
    const result = calculateRemainingProbabilities(c, ids)
    expect(JSON.stringify(c)).toBe(before)
    c.roundCosts.fill(0); c.prizes[0].name = '改名'
    expect(calculateRemainingProbabilities(c, ids)).toEqual(result)
    const frozen: ReadonlyDrawConfig = DEFAULT_CONFIGS[0]
    expect(calculateDraw(frozen, []).probabilities.status).toBe('ready')
  })
})
