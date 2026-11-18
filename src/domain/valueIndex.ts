import { calculateDraw } from './calculations'
import type { ReadonlyDrawConfig } from './types'
import type { EquivalentCost } from './calculations'

/** Compare full-precision single-draw costs; null means no valid positive ratio. */
export function calculateValueIndex(baseline: EquivalentCost | undefined, current: EquivalentCost | undefined): number | null {
  if (baseline?.status !== 'ok' || current?.status !== 'ok') return null
  if (![baseline.value, current.value].every(value => Number.isFinite(value) && value > 0)) return null
  const index = baseline.value / current.value
  return Number.isFinite(index) && index > 0 ? index : null
}


/**
 * Cancel the common target weight: (W0/Wn) * (C0/Cn).
 * Reuse validated pool weights and costs, avoiding prize-specific rounding drift.
 */
export function calculatePoolValueIndex(config: ReadonlyDrawConfig, current: ReturnType<typeof calculateDraw>): number | null {
  if (current.probabilities.status !== 'ready') return null
  const baseline = calculateDraw(config, [])
  if (baseline.probabilities.status !== 'ready') return null
  const priceRatio = calculateValueIndex(baseline.costs?.next, current.costs?.next)
  if (priceRatio === null) return null
  const index = (baseline.probabilities.remainingWeight / current.probabilities.remainingWeight) * priceRatio
  return Number.isFinite(index) && index > 0 ? index : null
}
