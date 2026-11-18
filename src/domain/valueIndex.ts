import type { EquivalentCost } from './calculations'

/** Compare full-precision single-draw costs; null means no valid positive ratio. */
export function calculateValueIndex(baseline: EquivalentCost | undefined, current: EquivalentCost | undefined): number | null {
  if (baseline?.status !== 'ok' || current?.status !== 'ok') return null
  if (![baseline.value, current.value].every(value => Number.isFinite(value) && value > 0)) return null
  const index = baseline.value / current.value
  return Number.isFinite(index) && index > 0 ? index : null
}
