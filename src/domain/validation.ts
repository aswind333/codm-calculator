import { DRAW_TYPE_IDS, getPrizeCount, getPrizeId } from './types'
import type { DrawTypeId } from './types'

export const WEIGHT_SUM_TOLERANCE = 1e-6
export interface ValidationIssue {
  path: string
  message: string
}
export interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
}
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const isNonnegativeFinite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
const isTypeId = (value: unknown): value is DrawTypeId =>
  typeof value === 'string' && DRAW_TYPE_IDS.some(id => id === value)

/** Validates external data without coercing, normalizing, or mutating it. */
export function validateConfig(input: unknown): ValidationResult {
  const issues: ValidationIssue[] = []
  const add = (path: string, message: string) => { issues.push({ path, message }) }
  if (!isRecord(input)) return { valid: false, issues: [{ path: '', message: '配置必须为对象' }] }
  if (!isTypeId(input.typeId)) add('typeId', '未知转盘类型')
  const count = isTypeId(input.typeId) ? getPrizeCount(input.typeId) : undefined
  if (count === undefined || input.prizeCount !== count) add('prizeCount', '奖品数量必须符合转盘类型')
  for (const field of ['label', 'currencyLabel']) {
    if (!isText(input[field])) add(field, '名称或单位不能为空')
  }
  if (!Array.isArray(input.prizes)) add('prizes', '奖品必须为数组')
  else {
    if (input.prizes.length !== count) add('prizes', '奖品数量不匹配')
    const ids = new Set<string>()
    let sum = 0
    let weightsValid = true
    // entries visits sparse array holes too; missing values must not pass validation.
    for (const [index, prize] of input.prizes.entries()) {
      const path = `prizes[${index}]`
      if (!isRecord(prize)) { add(path, '奖品必须为对象'); weightsValid = false; continue }
      if (!isText(prize.prizeId) || ids.has(prize.prizeId)) add(`${path}.prizeId`, '奖品 ID 缺失或重复')
      if (isText(prize.prizeId)) ids.add(prize.prizeId)
      if (isTypeId(input.typeId) && prize.prizeId !== getPrizeId(input.typeId, index + 1)) {
        add(`${path}.prizeId`, '奖品 ID 必须与类型及等级对应')
      }
      if (!isText(prize.name)) add(`${path}.name`, '奖品名称不能为空')
      if (!isNonnegativeFinite(prize.weightPercent)) {
        add(`${path}.weightPercent`, '权重必须为有限非负数'); weightsValid = false
      } else sum += prize.weightPercent
    }
    if (weightsValid && (!Number.isFinite(sum) || Math.abs(sum - 100) > WEIGHT_SUM_TOLERANCE)) {
      add('prizes', `初始权重合计必须为100%，当前合计 ${sum}%，偏差 ${sum - 100} 个百分点`)
    }
  }
  if (!Array.isArray(input.roundCosts)) add('roundCosts', '价格必须为数组')
  else {
    if (input.roundCosts.length !== count) add('roundCosts', '价格数量不匹配')
    for (const [index, cost] of input.roundCosts.entries()) {
      if (!isNonnegativeFinite(cost) || !Number.isInteger(cost)) {
        add(`roundCosts[${index}]`, '价格必须为有限非负整数，空值不等于0')
      }
    }
  }
  return { valid: issues.length === 0, issues }
}

/** A complete settings configuration must contain each of the eight types once. */
export function validateConfigs(input: unknown): ValidationResult {
  if (!Array.isArray(input)) return { valid: false, issues: [{ path: '', message: '配置集合必须为数组' }] }
  const issues: ValidationIssue[] = []
  if (input.length !== DRAW_TYPE_IDS.length) issues.push({ path: '', message: '必须包含全部8种转盘' })
  const ids = new Set<string>()
  for (const [index, config] of input.entries()) {
    for (const issue of validateConfig(config).issues) {
      issues.push({ ...issue, path: `[${index}]${issue.path ? `.${issue.path}` : ''}` })
    }
    if (isRecord(config) && isTypeId(config.typeId)) {
      if (ids.has(config.typeId)) issues.push({ path: `[${index}].typeId`, message: '转盘类型重复' })
      ids.add(config.typeId)
    }
  }
  for (const id of DRAW_TYPE_IDS) {
    if (!ids.has(id)) issues.push({ path: '', message: `缺少转盘：${id}` })
  }
  return { valid: issues.length === 0, issues }
}
