import { getPrizeCount, getPrizeId } from '../domain/types'
import type { DrawConfig, DrawTypeId, ReadonlyDrawConfig } from '../domain/types'

// Source: PROBABILITY_SPEC.md §2. All values are kept at original precision.
const TEN_WEIGHTS = [0.08, 1.25, 4, 4.67, 5.5, 6.5, 10, 11, 28, 29]
const SEVEN_WEIGHTS = [0.08, 1.25, 6.67, 7.5, 8.5, 16, 60]
const NAMES = ['一等奖', '二等奖', '三等奖', '四等奖', '五等奖', '六等奖', '七等奖', '八等奖', '九等奖', '十等奖']

function preset(typeId: DrawTypeId, label: string, roundCosts: number[]): ReadonlyDrawConfig {
  const prizeCount = getPrizeCount(typeId)
  const weights = prizeCount === 7 ? SEVEN_WEIGHTS : TEN_WEIGHTS
  return Object.freeze({
    typeId, label, prizeCount, currencyLabel: '使命卡片',
    prizes: Object.freeze(weights.map((weightPercent, index) => Object.freeze({
      prizeId: getPrizeId(typeId, index + 1), name: NAMES[index], weightPercent,
    }))),
    roundCosts: Object.freeze([...roundCosts]),
  })
}

export const DEFAULT_CONFIGS: readonly ReadonlyDrawConfig[] = Object.freeze([
  preset('legendary_vehicle', '传说载具转盘', [3,5,10,20,30,50,60,90,110,160]),
  preset('legendary_melee', '传说近战转盘', [3,5,10,20,30,50,60,90,110,160]),
  preset('legendary_vehicle_weapon', '传说载具+武器转盘', [3,5,10,20,40,60,90,150,160,350]),
  preset('legendary_weapon', '传说武器转盘', [3,5,10,20,40,60,90,130,180,350]),
  preset('mythic_weapon', '神话武器转盘', [3,5,10,20,40,60,90,150,210,420]),
  preset('legendary_character', '传说角色转盘', [3,5,10,20,40,60,90,130,230,420]),
  preset('mythic_character', '神话角色转盘', [5,8,15,30,60,90,130,210,350,550]),
  preset('seven_draw', '七抽转盘（通用）', [3,7,18,50,90,180,350]),
])

function copyConfig(config: ReadonlyDrawConfig): DrawConfig {
  return { ...config, prizes: config.prizes.map(prize => ({ ...prize })), roundCosts: [...config.roundCosts] }
}

/** Restores a fresh template copy only; does not save or change application state. */
export function createDefaultConfig(typeId: DrawTypeId): DrawConfig {
  const config = DEFAULT_CONFIGS.find(item => item.typeId === typeId)
  if (!config) throw new Error(`未知转盘类型：${typeId}`)
  return copyConfig(config)
}

export function createDefaultConfigs(): DrawConfig[] {
  return DEFAULT_CONFIGS.map(copyConfig)
}
