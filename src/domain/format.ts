import type { EquivalentCost } from './calculations'

// Intl's default halfExpand rounds positive decimal half values upward.
const fixedThree = new Intl.NumberFormat('en-US', { useGrouping: false, minimumFractionDigits: 3, maximumFractionDigits: 3 })
const integer = new Intl.NumberFormat('en-US', { useGrouping: false, maximumFractionDigits: 0 })
export function formatProbability(probability: number): { text: string; roundedToZero: boolean } {
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) return { text: '—', roundedToZero: false }
  const text = fixedThree.format(probability * 100)
  return { text: `${text}%`, roundedToZero: probability > 0 && text === '0.000' }
}
export function formatAmount(result: EquivalentCost, kind: 'cards' | 'equivalent'): string {
  if (result.status !== 'ok') {
    const labels = { 'missing-price': kind === 'cards' ? '价格不完整' : '待设置价格', complete: '—', invalid: '无效数据',
      'numeric-error': '数值超出计算范围', unavailable: '不适用', unreachable: '当前不可抽中' }
    return labels[result.status]
  }
  if (!Number.isFinite(result.value) || result.value < 0 || (kind === 'cards' && !Number.isInteger(result.value))) return '无效数据'
  return (kind === 'cards' ? integer : fixedThree).format(result.value)
}
