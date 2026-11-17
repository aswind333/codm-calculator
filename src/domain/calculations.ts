import type { ReadonlyDrawConfig } from './types'
import { validateConfig } from './validation'
import type { ValidationIssue } from './validation'

export type RoundResult =
  | { status: 'ready'; nextRound: number }
  | { status: 'complete'; nextRound: null }
  | { status: 'invalid'; nextRound: null }

export function getNextRound(drawnCount: number, prizeCount: number): RoundResult {
  if (![7, 10].includes(prizeCount) || !Number.isInteger(drawnCount) || drawnCount < 0 || drawnCount > prizeCount) {
    return { status: 'invalid', nextRound: null }
  }
  return drawnCount === prizeCount ? { status: 'complete', nextRound: null } : { status: 'ready', nextRound: drawnCount + 1 }
}

export interface ProbabilityRow { prizeId: string; probability: number }
export type ProbabilityResult =
  | { status: 'invalid'; issues: ValidationIssue[] }
  | { status: 'complete'; nextRound: null; drawnCount: number; warnings: string[]; rows: [] }
  | { status: 'zero-weight' | 'numeric-error'; nextRound: number; drawnCount: number; warnings: string[]; rows: [] }
  | { status: 'ready'; nextRound: number; drawnCount: number; warnings: string[]; remainingWeight: number; rows: ProbabilityRow[] }

/** Prices are independent: S1 still rejects them when saving the whole configuration. */
export function calculateRemainingProbabilities(input: unknown, drawnIds: unknown): ProbabilityResult {
  const issues = validateConfig(input).issues.filter(issue => !/^roundCosts(?:\[|$)/.test(issue.path))
  if (issues.length) return { status: 'invalid', issues }
  // All non-price fields have passed S1 validation; never read prices through this type.
  const config = input as ReadonlyDrawConfig
  const ids: unknown[] | null = Array.isArray(drawnIds) ? Array.from(drawnIds) : drawnIds instanceof Set ? [...drawnIds] : null
  if (!ids || new Set(ids).size !== ids.length || ids.some(id => typeof id !== 'string' || !config.prizes.some(p => p.prizeId === id))) {
    return { status: 'invalid', issues: [{ path: 'drawnIds', message: '已抽集合必须包含当前类型有效且不重复的奖品 ID' }] }
  }
  const drawn = new Set(ids)
  const warnings = config.prizes.filter(p => drawn.has(p.prizeId) && p.weightPercent === 0)
    .map(p => `当前配置下此奖品不可能被抽到：${p.prizeId}`)
  const drawnCount = drawn.size
  const round = getNextRound(drawnCount, config.prizeCount)
  if (round.status === 'complete') return { status: 'complete', nextRound: null, drawnCount, warnings, rows: [] }
  // Membership and uniqueness above guarantee 0 <= drawnCount < N here.
  const nextRound = drawnCount + 1
  const remaining = config.prizes.filter(p => !drawn.has(p.prizeId))
  const remainingWeight = remaining.reduce((sum, p) => sum + p.weightPercent, 0)
  if (remainingWeight === 0) return { status: 'zero-weight', nextRound, drawnCount, warnings, rows: [] }
  const rows = remaining.map(p => ({ prizeId: p.prizeId, probability: p.weightPercent / remainingWeight }))
  if (rows.some((row, i) => !Number.isFinite(row.probability) || (remaining[i].weightPercent > 0 && row.probability === 0))) {
    return { status: 'numeric-error', nextRound, drawnCount, warnings, rows: [] }
  }
  return { status: 'ready', nextRound, drawnCount, warnings, remainingWeight, rows }
}

export type Amount = { status: 'ok'; value: number } | {
  status: 'missing-price' | 'complete' | 'invalid' | 'numeric-error' | 'unavailable'; value: null
}
export interface CostsResult {
  round: RoundResult
  paid: Amount
  next: Amount
  after: Amount
  total: Amount
}
const amount = (value: number): Amount => Number.isFinite(value)
  ? { status: 'ok', value } : { status: 'numeric-error', value: null }
const absent = (status: Exclude<Amount['status'], 'ok'>): Amount => ({ status, value: null })
const validPrice = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= 0

/** Partial prices retain only fields whose entire dependency range is known. */
export function calculateCosts(roundCosts: unknown, drawnCount: number, prizeCount: number): CostsResult {
  const round = getNextRound(drawnCount, prizeCount)
  if (round.status === 'invalid') return { round, paid: absent('invalid'), next: absent('invalid'), after: absent('invalid'), total: absent('invalid') }
  const prices = Array.isArray(roundCosts) ? roundCosts : []
  const extra = prices.length > prizeCount
  const sum = (end: number): Amount => {
    if (extra) return absent('invalid')
    let total = 0
    for (let i = 0; i < end; i++) {
      if (!validPrice(prices[i])) return absent('missing-price')
      total += prices[i]
    }
    return amount(total)
  }
  return {
    round, paid: sum(drawnCount), total: sum(prizeCount),
    next: round.status === 'complete' ? absent('complete') : extra ? absent('invalid')
      : validPrice(prices[drawnCount]) ? amount(prices[drawnCount]) : absent('missing-price'),
    after: round.status === 'complete' ? absent('complete') : sum(drawnCount + 1),
  }
}

export type EquivalentCost = Amount | { status: 'unreachable'; value: null }
/** Single-round c/p only, never expected total spending or a guarantee price. */
export function calculateEquivalentCost(probability: number, nextCost: Amount): EquivalentCost {
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) return absent('invalid')
  if (probability === 0) return { status: 'unreachable', value: null }
  if (nextCost.status !== 'ok') return { ...nextCost }
  if (!validPrice(nextCost.value)) return absent('invalid')
  return amount(nextCost.value / probability)
}

/** Convenient composition for a single current pool; no future state enumeration. */
export function calculateDraw(input: unknown, drawnIds: unknown) {
  const probabilities = calculateRemainingProbabilities(input, drawnIds)
  if (probabilities.status === 'invalid') return { probabilities, costs: null, rows: [] }
  const config = input as ReadonlyDrawConfig
  const costs = calculateCosts(config.roundCosts, probabilities.drawnCount, config.prizeCount)
  const rows = probabilities.status === 'ready' ? probabilities.rows.map(row => ({
    ...row, equivalentCost: calculateEquivalentCost(row.probability, costs.next),
  })) : []
  return { probabilities, costs, rows }
}
