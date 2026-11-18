import type { StorageAdapter } from './storage'
import { initialSimulation, validSimulation } from '../features/simulator/model'
import type { Simulation } from '../features/simulator/model'
export const SIMULATION_KEY = 'codmcalc.simulation.v1'
export function readSimulation(storage: StorageAdapter): Simulation {
  const raw = storage.getItem(SIMULATION_KEY)
  if (raw === null) return initialSimulation()
  const value: unknown = JSON.parse(raw)
  if (!validSimulation(value)) throw new Error('模拟记录损坏或版本不兼容。请备份后仅清除模拟记录；计算器设置不受影响。')
  return value
}
/** Caller holds the browser-wide lock. Balance, journal and pending outcome share one atomic key. */
export function transactSimulation(storage: StorageAdapter, change: (s: Simulation) => Simulation): Simulation {
  const previous = readSimulation(storage)
  const next = { ...change(previous), revision: previous.revision + 1 }
  if (!validSimulation(next)) throw new Error('模拟数据校验失败，未保存。')
  storage.setItem(SIMULATION_KEY, JSON.stringify(next))
  return next
}
export async function withSimulationLock<T>(action: () => T): Promise<T> {
  if (!navigator.locks) throw new Error('当前浏览器不支持安全的多标签页操作，请使用新版浏览器及HTTPS访问。')
  return navigator.locks.request(SIMULATION_KEY, action)
}
/** 53 random bits in [0, 1), independent of animation and without rounding probabilities. */
export function randomUnit(): number {
  const words = crypto.getRandomValues(new Uint32Array(2))
  return ((words[0] >>> 5) * 67108864 + (words[1] >>> 6)) / 9007199254740992
}
