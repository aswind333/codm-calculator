import { calculateDraw } from '../../domain/calculations'
import type { ProbabilityRow } from '../../domain/calculations'
import { DRAW_TYPE_IDS, getPrizeCount, getPrizeId } from '../../domain/types'
import type { DrawTypeId, ReadonlyDrawConfig } from '../../domain/types'

export const MAX_BALANCE = 600
export const SLOT_RANKS = [3, 4, 1, 5, 6, 7, 8, 2, 9, 10] as const
export const RING_ORDER = [0, 1, 2, 3, 4, 9, 8, 7, 6, 5] as const
export interface Win { prizeId: string; name: string; cost: number }
export interface Pending { id: number; typeId: DrawTypeId; prizeId: string; phase: 'animating' | 'result' }
export interface Simulation {
  version: 1
  revision: number
  balance: number
  selected: DrawTypeId
  pools: Record<DrawTypeId, Win[]>
  pending: Pending | null
}
export type SimulationEvent = { kind: 'draw-start' | 'draw-result' | 'pool-complete'; typeId: DrawTypeId; prizeId: string }
export function initialSimulation(): Simulation {
  return { version: 1, revision: 0, balance: 0, selected: 'legendary_weapon', pools: Object.fromEntries(DRAW_TYPE_IDS.map(id => [id, [] as Win[]])) as Simulation['pools'], pending: null }
}
const integer = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0
export function validSimulation(value: unknown): value is Simulation {
  if (!value || typeof value !== 'object') return false
  const s = value as Simulation
  if (s.version !== 1 || !integer(s.revision) || !integer(s.balance) || s.balance > MAX_BALANCE || !DRAW_TYPE_IDS.includes(s.selected) || !s.pools || typeof s.pools !== 'object') return false
  if (Object.keys(s.pools).length !== DRAW_TYPE_IDS.length) return false
  for (const id of DRAW_TYPE_IDS) {
    const wins = s.pools[id]
    if (!Array.isArray(wins) || wins.length > getPrizeCount(id)) return false
    const ids = Array.from({ length: getPrizeCount(id) }, (_, i) => getPrizeId(id, i + 1))
    if (!wins.every(w => w && ids.includes(w.prizeId) && typeof w.name === 'string' && !!w.name.trim() && integer(w.cost)) || new Set(wins.map(w => w.prizeId)).size !== wins.length || !integer(wins.reduce((sum, w) => sum + w.cost, 0))) return false
  }
  const p = s.pending
  return p === null || (!!p && integer(p.id) && p.id > 0 && p.id <= s.revision && DRAW_TYPE_IDS.includes(p.typeId) && s.selected === p.typeId && ['animating', 'result'].includes(p.phase) && s.pools[p.typeId].at(-1)?.prizeId === p.prizeId)
}
function unitRandom(u: number) {
  if (!Number.isFinite(u) || u < 0 || u >= 1) throw new Error('随机数无效，请重试。')
  return u
}
/** Sample S2's full precision probabilities. Zero-weight prizes never enter the intervals. */
export function pickPrize(rows: readonly ProbabilityRow[], random: number): string {
  const u = unitRandom(random)
  const positive = rows.filter(r => r.probability > 0)
  if (!positive.length || rows.some(r => !Number.isFinite(r.probability) || r.probability < 0) || Math.abs(rows.reduce((s, r) => s + r.probability, 0) - 1) > 1e-10) throw new Error('奖池概率无效。')
  let cumulative = 0
  for (const row of positive) { cumulative += row.probability; if (u < cumulative) return row.prizeId }
  return positive[positive.length - 1].prizeId // floating-point sum may be just below 1
}
export function claimCards(s: Simulation, random: number): Simulation {
  if (s.pending) throw new Error('请先完成当前抽奖。')
  if (s.balance >= MAX_BALANCE) throw new Error('卡片余额已达到600张。')
  const reward = Math.min(1 + Math.floor(unitRandom(random) * 20), MAX_BALANCE - s.balance)
  return { ...s, balance: s.balance + reward }
}
export function startDraw(s: Simulation, config: ReadonlyDrawConfig, random: number): Simulation {
  if (s.pending) throw new Error('当前抽奖尚未结束。')
  if (config.typeId !== s.selected) throw new Error('转盘类型已改变，请重试。')
  const wins = s.pools[s.selected]
  const result = calculateDraw(config, wins.map(w => w.prizeId))
  if (result.probabilities.status === 'complete') throw new Error('奖池已抽完，请重置当前奖池。')
  if (result.probabilities.status !== 'ready') throw new Error('剩余权重为零或配置无效，请检查已保存的设置。')
  if (result.costs?.next.status !== 'ok' || !integer(result.costs.next.value)) throw new Error('本轮价格无效。')
  const cost = result.costs.next.value
  if (cost > s.balance) throw new Error('卡片不足，请先领取虚拟卡片。')
  if (!integer(wins.reduce((n, w) => n + w.cost, cost))) throw new Error('累计消耗超出支持范围。')
  const prizeId = pickPrize(result.rows, random)
  const win = { prizeId, cost, name: config.prizes.find(p => p.prizeId === prizeId)!.name }
  return { ...s, balance: s.balance - cost, pools: { ...s.pools, [s.selected]: [...wins, win] }, pending: { id: s.revision + 1, typeId: s.selected, prizeId, phase: 'animating' } }
}
export function resetPool(s: Simulation): Simulation {
  if (s.pending) throw new Error('请先完成当前抽奖。')
  return { ...s, pools: { ...s.pools, [s.selected]: [] } }
}
/** Pure animation schedule; outcome is already committed and never chosen by this schedule. */
export function animationFrames(slots: number[], target: number) {
  const end = slots.indexOf(target)
  if (end < 0) throw new Error('中奖位置无效。')
  const count = slots.length * 3 + end + 1
  let at = 0
  return Array.from({ length: count }, (_, i) => {
    const t = count <= 1 ? 1 : i / (count - 1)
    at += t < .2 ? 150 - t * 450 : 60 + Math.pow((t - .2) / .8, 2) * 260
    return { slot: slots[i % slots.length], at }
  })
}
