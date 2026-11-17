/** Stable built-in identities; display names are never used as keys. */
export const DRAW_TYPE_IDS = Object.freeze([
  'legendary_vehicle', 'legendary_melee', 'legendary_vehicle_weapon',
  'legendary_weapon', 'mythic_weapon', 'legendary_character',
  'mythic_character', 'seven_draw',
] as const)
export type DrawTypeId = (typeof DRAW_TYPE_IDS)[number]
export type PrizeCount = 7 | 10

export interface Prize {
  readonly prizeId: string
  name: string
  /** Percentage points: 1.25 means 1.25%, not 0.0125. */
  weightPercent: number
}
export interface DrawConfig {
  readonly typeId: DrawTypeId
  readonly prizeCount: PrizeCount
  label: string
  currencyLabel: string
  /** Ordered from first prize to last prize. */
  prizes: Prize[]
  /** Ordered from round 1 to round N. */
  roundCosts: number[]
}
export type ReadonlyDrawConfig = Readonly<Omit<DrawConfig, 'prizes' | 'roundCosts'>> & {
  readonly prizes: readonly Readonly<Prize>[]
  readonly roundCosts: readonly number[]
}

export function getPrizeCount(typeId: DrawTypeId): PrizeCount {
  return typeId === 'seven_draw' ? 7 : 10
}

/** Namespaced IDs prevent accidental cross-type prize references. */
export function getPrizeId(typeId: DrawTypeId, rank: number): string {
  return `${typeId}:prize_${rank}`
}
