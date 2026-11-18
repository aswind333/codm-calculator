import { describe, expect, it } from 'vitest'
import { createDefaultConfig, createDefaultConfigs } from '../../data/defaults'
import { calculateDraw } from '../../domain/calculations'
import { animationFrames, claimCards, initialSimulation, MAX_BALANCE, pickPrize, resetPool, RING_ORDER, SLOT_RANKS, startDraw, validSimulation } from './model'
import { readSimulation, SIMULATION_KEY, transactSimulation } from '../../storage/simulation'

describe('模拟器纯逻辑及独立存储', () => {
  it('领取端点、容量、零初始余额及非法随机数', () => {
    const s = initialSimulation(); expect(s.balance).toBe(0)
    expect(claimCards(s, 0).balance).toBe(1)
    expect(claimCards(s, 1 - Number.EPSILON).balance).toBe(20)
    expect(claimCards({ ...s, balance: 599 }, .99).balance).toBe(MAX_BALANCE)
    expect(() => claimCards({ ...s, balance: 600 }, 0)).toThrow()
    for (const u of [-.1, 1, NaN, Infinity]) expect(() => claimCards(s, u)).toThrow()
  })
  it('按S2完整概率区间抽样，排除零概率', () => {
    const config = createDefaultConfig('legendary_weapon')
    const result = calculateDraw(config, [config.prizes[5].prizeId, config.prizes[6].prizeId])
    let before = 0
    for (const row of result.rows) {
      expect(pickPrize(result.rows, before + row.probability / 2)).toBe(row.prizeId)
      before += row.probability
    }
    expect(pickPrize([{ prizeId: 'zero', probability: 0 }, { prizeId: 'yes', probability: 1 }], 0)).toBe('yes')
    expect(() => pickPrize([], .5)).toThrow()
  })
  it.each(createDefaultConfigs())('$typeId 价格沿用设置、无重复中奖、类型隔离、终局', config => {
    let state = { ...initialSimulation(), selected: config.typeId }
    config.prizes.forEach((_, i) => {
      state.balance = 600
      const before = state.balance
      state = startDraw(state, config, (i * .173) % 1)
      expect(state.balance).toBe(before - config.roundCosts[i])
      expect(state.pools[config.typeId].at(-1)?.cost).toBe(config.roundCosts[i])
      expect(state.pending?.phase).toBe('animating')
      expect(() => startDraw(state, config, 0)).toThrow()
      expect(() => claimCards(state, 0)).toThrow()
      expect(() => resetPool(state)).toThrow()
      state = { ...state, revision: state.revision + 1, pending: null }
    })
    expect(new Set(state.pools[config.typeId].map(w => w.prizeId)).size).toBe(config.prizeCount)
    expect(Object.entries(state.pools).filter(([id]) => id !== config.typeId).every(([, wins]) => !wins.length)).toBe(true)
    expect(() => startDraw(state, config, 0)).toThrow()
    expect(resetPool(state).balance).toBe(state.balance)
    expect(resetPool(state).pools[config.typeId]).toEqual([])
  })
  it('自定义零价、550价、余额不足、零权重和缺价', () => {
    const c = createDefaultConfig('legendary_weapon'); c.roundCosts[0] = 550
    expect(startDraw({ ...initialSimulation(), balance: 550 }, c, 0).balance).toBe(0)
    expect(() => startDraw({ ...initialSimulation(), balance: 549 }, c, 0)).toThrow('卡片不足')
    c.roundCosts[0] = 0; c.prizes.forEach((p, i) => { p.weightPercent = i === 0 ? 100 : 0 })
    const next = startDraw(initialSimulation(), c, .99)
    expect(next.pools[c.typeId][0].prizeId).toBe(c.prizes[0].prizeId)
    expect(() => startDraw({ ...next, pending: null }, c, .5)).toThrow('权重')
    c.roundCosts = []; expect(() => startDraw(initialSimulation(), c, .5)).toThrow('价格')
  })
  it('七抽位置稳定，三个空位不进入动画，动画只停在预定结果', () => {
    expect(SLOT_RANKS[2]).toBe(1); expect(SLOT_RANKS[7]).toBe(2)
    for (const count of [7, 10]) {
      const slots = RING_ORDER.filter(slot => SLOT_RANKS[slot] <= count)
      expect(slots).toHaveLength(count)
      for (const target of slots) {
        const frames = animationFrames(slots, target)
        expect(frames.at(-1)?.slot).toBe(target)
        expect(frames.every(f => slots.includes(f.slot as typeof slots[number]))).toBe(true)
        expect(frames.every((f, i) => i === 0 || f.at > frames[i - 1].at)).toBe(true)
      }
    }
  })
  it('原子存储、刷新恢复待播放结果、不污染其他键及写入失败', () => {
    const map = new Map<string, string>([['codmcalc.settings.v1', 'unchanged']])
    const storage = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v) } }
    transactSimulation(storage, s => ({ ...s, balance: 600 }))
    const drawn = transactSimulation(storage, s => startDraw(s, createDefaultConfig('legendary_weapon'), .3))
    expect(readSimulation(storage)).toEqual(drawn); expect(drawn.balance).toBe(597)
    expect(() => transactSimulation(storage, s => startDraw(s, createDefaultConfig('legendary_weapon'), .3))).toThrow()
    const failed = { ...storage, setItem: () => { throw new Error('quota') } }
    expect(() => transactSimulation(failed, s => ({ ...s, pending: null }))).toThrow('quota')
    expect(readSimulation(storage)).toEqual(drawn)
    expect(map.get('codmcalc.settings.v1')).toBe('unchanged')
    map.set(SIMULATION_KEY, '{bad'); expect(() => readSimulation(storage)).toThrow()
  })
  it('不信任外部记录：非法余额、版本、ID、重复、价格和待展示结果', () => {
    expect(validSimulation(initialSimulation())).toBe(true)
    for (const value of [null, {}, { ...initialSimulation(), balance: 601 }, { ...initialSimulation(), version: 2 }, { ...initialSimulation(), selected: 'unknown' }, { ...initialSimulation(), pending: {} }]) expect(validSimulation(value)).toBe(false)
    const s = initialSimulation(); s.pools.legendary_weapon = [{ prizeId: 'bad', name: 'x', cost: 0 }]; expect(validSimulation(s)).toBe(false)
    s.pools.legendary_weapon = [{ prizeId: 'legendary_weapon:prize_1', name: 'x', cost: -1 }]; expect(validSimulation(s)).toBe(false)
  })
})
