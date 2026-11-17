import type { DrawConfig, ReadonlyDrawConfig } from '../../domain/types'
export interface DraftConfig extends Omit<DrawConfig, 'roundCosts' | 'prizes'> {
  roundCosts: string[]
  prizes: { readonly prizeId: string; name: string; weightPercent: string }[]
}
export function toDraft(configs: readonly ReadonlyDrawConfig[]): DraftConfig[] {
  return configs.map(c => ({ ...c, roundCosts: c.roundCosts.map(String), prizes: c.prizes.map(p => ({ ...p, weightPercent: String(p.weightPercent) })) }))
}
/** Empty/whitespace and malformed decimals stay invalid; never coerce blanks to zero. */
export function parseNumber(text: string): number {
  return /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text.trim()) ? Number(text) : NaN
}
export function fromDraft(draft: DraftConfig[]): DrawConfig[] {
  return draft.map(c => ({ ...c, roundCosts: c.roundCosts.map(parseNumber), prizes: c.prizes.map(p => ({ ...p, weightPercent: parseNumber(p.weightPercent) })) }))
}
