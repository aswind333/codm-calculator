import { createDefaultConfigs } from '../data/defaults'
import type { DrawConfig, DrawTypeId, ReadonlyDrawConfig } from '../domain/types'
import { validateConfigs } from '../domain/validation'

export interface StorageAdapter { getItem(key: string): string | null; setItem(key: string, value: string): void }
export const SETTINGS_KEY = 'codmcalc.settings.v1'
export const DRAWN_KEY = 'codmcalc.drawn.v1'
export type DrawnRecords = Partial<Record<DrawTypeId, string[]>>
export type WriteResult = { ok: true } | { ok: false; message: string }

export function loadSettings(storage: StorageAdapter): { configs: DrawConfig[]; warning?: string } {
  try {
    const raw = storage.getItem(SETTINGS_KEY)
    if (raw === null) return { configs: createDefaultConfigs() }
    const data = JSON.parse(raw)
    if (data?.version !== 1 || !validateConfigs(data.configs).valid) throw new Error('invalid')
    return { configs: data.configs }
  } catch {
    return { configs: createDefaultConfigs(), warning: '本地设置无法读取、已损坏或版本不兼容，已使用默认配置。' }
  }
}

/** Commit to storage first. The caller may update effective state only after success. */
export function saveSettings(storage: StorageAdapter, configs: unknown): WriteResult {
  if (!validateConfigs(configs).valid) return { ok: false, message: '配置校验失败，请修正全部类型的错误后保存。' }
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify({ version: 1, configs }))
    return { ok: true }
  } catch {
    return { ok: false, message: '保存失败：本地存储不可用或空间不足。旧设置仍生效，草稿已保留，请重试。' }
  }
}

function validRecords(value: unknown, configs: readonly ReadonlyDrawConfig[]): value is DrawnRecords {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.entries(value).every(([id, ids]) => {
    const config = configs.find(c => c.typeId === id)
    return config && Array.isArray(ids) && new Set(ids).size === ids.length &&
      Array.from(ids).every(prizeId => typeof prizeId === 'string' && config.prizes.some(p => p.prizeId === prizeId))
  })
}
export function loadDrawn(storage: StorageAdapter, configs: readonly ReadonlyDrawConfig[]): { records: DrawnRecords; warning?: string } {
  try {
    const raw = storage.getItem(DRAWN_KEY)
    if (raw === null) return { records: {} }
    const data = JSON.parse(raw)
    if (data?.version !== 1 || !validRecords(data.records, configs)) throw new Error('invalid')
    return { records: data.records }
  } catch {
    return { records: {}, warning: '本地已抽记录无法读取或无效，已重置记录；配置设置未被修改。' }
  }
}
export function saveDrawn(storage: StorageAdapter, records: DrawnRecords, configs: readonly ReadonlyDrawConfig[]): WriteResult {
  if (!validRecords(records, configs)) return { ok: false, message: '已抽记录无效，未保存。' }
  try {
    storage.setItem(DRAWN_KEY, JSON.stringify({ version: 1, records }))
    return { ok: true }
  } catch {
    return { ok: false, message: '已抽记录未能保存，仅在本次页面会话生效。' }
  }
}
