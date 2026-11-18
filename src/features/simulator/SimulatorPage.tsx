import { useEffect, useRef, useState } from 'react'
import type { ReadonlyDrawConfig, DrawTypeId } from '../../domain/types'
import { calculateDraw } from '../../domain/calculations'
import type { StorageAdapter } from '../../storage/storage'
import { loadSettings } from '../../storage/storage'
import { readSimulation, transactSimulation, withSimulationLock, randomUnit, SIMULATION_KEY } from '../../storage/simulation'
import { claimCards, initialSimulation, resetPool, startDraw, MAX_BALANCE } from './model'
import type { Simulation, SimulationEvent } from './model'
import { HoldToClaim } from './HoldToClaim'
import { PrizeArena } from './PrizeArena'
import { useSimulationViewport } from './useSimulationViewport'
import './simulator.css'

export function SimulatorPage({ configs, storage, active, onBusy, onEvent }: { configs: readonly ReadonlyDrawConfig[]; storage: StorageAdapter; active: boolean; onBusy: (busy: boolean) => void; onEvent?: (event: SimulationEvent) => void }) {
  useSimulationViewport(active)
  const [state, setState] = useState<Simulation>(initialSimulation)
  const [error, setError] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [modal, setModal] = useState(false)
  const [reward, setReward] = useState('')
  const [finished, setFinished] = useState(false)
  const running = useRef(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const config = configs.find(c => c.typeId === state.selected)!
  const wins = state.pools[state.selected]
  const pending = state.pending
  const animating = pending?.phase === 'animating'
  const visibleWins = animating ? wins.slice(0, -1) : wins
  const calculation = calculateDraw(config, wins.map(w => w.prizeId))
  const nextCost = calculation.costs?.next
  const complete = wins.length === config.prizeCount && !pending
  useEffect(() => {
    const sync = () => {
      try { setState(readSimulation(storage)); setInvalid(false) }
      catch { setInvalid(true); setError('模拟数据无法读取或已损坏。未修改余额或计算器设置。') }
    }
    sync()
    const change = (event: StorageEvent) => { if (event.key === SIMULATION_KEY || event.key === null) sync() }
    window.addEventListener('storage', change)
    return () => window.removeEventListener('storage', change)
  }, [storage])
  useEffect(() => { onBusy(active && (processing || !!animating)) }, [active, processing, animating, onBusy])
  useEffect(() => {
    if (modal && active) dialog.current?.showModal()
    else if (dialog.current?.open) dialog.current.close()
  }, [modal, active])
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const portrait = window.matchMedia('(hover: none) and (pointer: coarse) and (max-width: 600px) and (orientation: portrait)')
    const dismiss = () => { if (portrait.matches) setModal(false) }
    portrait.addEventListener('change', dismiss)
    return () => portrait.removeEventListener('change', dismiss)
  }, [])
  async function mutate(change: (s: Simulation) => Simulation): Promise<Simulation | null> {
    if (running.current) return null
    running.current = true; setProcessing(true); setError('')
    try {
      const next = await withSimulationLock(() => transactSimulation(storage, change))
      setState(next); setInvalid(false); return next
    } catch (e) { setError(e instanceof Error ? `操作未完成：${e.message}` : '本地保存失败，请重试。'); return null }
    finally { running.current = false; setProcessing(false) }
  }
  async function draw() {
    setFinished(false)
    const next = await mutate(s => {
      const latest = loadSettings(storage)
      const current = latest.configs.find(c => c.typeId === config.typeId)
      if (latest.warning || JSON.stringify(current) !== JSON.stringify(config)) throw new Error('设置已在其他页面改变或无法读取，请刷新后重试。')
      return startDraw(s, config, randomUnit())
    })
    if (next?.pending) onEvent?.({ kind: 'draw-start', typeId: next.selected, prizeId: next.pending.prizeId })
  }
  async function finish() {
    setFinished(true)
    const id = pending?.id
    const next = await mutate(s => s.pending && s.pending.id === id && s.pending.phase === 'animating' ? { ...s, pending: { ...s.pending, phase: 'result' } } : s)
    if (next?.pending) {
      onEvent?.({ kind: 'draw-result', typeId: next.selected, prizeId: next.pending.prizeId })
      if (next.pools[next.selected].length === config.prizeCount) onEvent?.({ kind: 'pool-complete', typeId: next.selected, prizeId: next.pending.prizeId })
    }
  }
  const awaitingClaim = pending?.phase === 'result'
  const displayCost = animating ? wins.at(-1)?.cost : nextCost?.status === 'ok' ? nextCost.value : undefined
  const insufficient = !pending && !complete && displayCost !== undefined && displayCost > state.balance
  const reason = invalid ? '本地模拟数据不可用' : !complete && !pending && calculation.probabilities.status !== 'ready' ? '剩余权重为零或配置无效，请调整并保存设置或重置奖池' : !complete && !pending && nextCost?.status !== 'ok' ? '本轮价格无效' : ''
  const round = Math.min(visibleWins.length + 1, config.prizeCount)
  async function confirmPrize() {
    await mutate(s => {
      if (s.pending?.phase !== 'result' || s.pending.id !== pending?.id) throw new Error('请等待抽奖完成。')
      return { ...s, pending: null }
    })
  }
  if (!active) return null
  return <main id="simulator-main" className="sim-page" aria-label="模拟抽奖">
    <section className="sim-rotate panel" aria-label="横屏提示">
      <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="22" y="12" width="22" height="38" rx="4" /><path d="M12 33a22 22 0 0 1 34-18M46 7v8h-8M52 31a22 22 0 0 1-34 18M18 57v-8h8" /></svg>
      <h2>请横屏体验模拟抽奖</h2><p>请开启系统与浏览器的自动旋转，再将手机横放。</p>
      <p>PC端体验更佳</p>
      <p>部分机型、浏览器可能存在适配问题</p>
    </section>
    <div className="sim-experience">
    {invalid && <button onClick={async () => {
      if (!window.confirm('仅清除模拟余额和模拟奖池记录？此操作不可撤销，不影响计算器设置。')) return
      try { const next = await withSimulationLock(() => {
        let readable = false
        try { readSimulation(storage); readable = true } catch { /* Only explicitly confirmed damaged data may be replaced. */ }
        if (readable) throw new Error('记录已恢复，请刷新后查看。')
        const fresh = initialSimulation(); storage.setItem(SIMULATION_KEY, JSON.stringify(fresh)); return fresh
      }); setState(next); setInvalid(false); setError('') } catch (e) { setError(e instanceof Error ? e.message : '本地存储仍不可用，无法清除。') }
    }}>清除损坏的模拟记录</button>}
    <section className="sim-stage" aria-label="模拟抽奖舞台" aria-busy={!!animating}>
      <div className="sim-toolbar">
        <div className="sim-toolbar-left">
    <label className="sim-type"><span className="sr-only">模拟转盘类型</span><select value={state.selected} disabled={processing || !!pending || invalid} onChange={e => { const selected = e.target.value as DrawTypeId; void mutate(s => { if (s.pending) throw new Error('当前抽奖尚未结束。'); return { ...s, selected } }) }}>{configs.map(c => <option key={c.typeId} value={c.typeId}>{c.label}</option>)}</select></label>
        <button className="sim-reset" disabled={processing || !!pending || invalid || !wins.length} onClick={() => { if (window.confirm('重置当前奖池？已消耗卡片不退还，剩余余额保留。')) void mutate(s => { if (s.selected !== config.typeId) throw new Error('转盘类型已改变，请重试。'); return resetPool(s) }) }}>重置奖池</button>
        </div>
      <div className="sim-wallet"><span aria-hidden="true">▣</span><strong aria-label="使命卡片余额">{state.balance} / 600</strong><span>使命卡片</span><button aria-label="获取使命卡片" disabled={processing || !!pending || invalid} onClick={() => { setReward(''); setModal(true) }}>＋</button></div>
      </div>
      <PrizeArena config={config} wins={wins} pending={pending} active={active && !invalid} onFinished={() => { void finish() }} />
      <div className="sim-controls">
        <p className="sim-round">第{round}抽 / 共{config.prizeCount}抽</p>
        <button className={`sim-draw${insufficient ? ' sim-insufficient' : ''}`}
          aria-label={awaitingClaim ? '收下奖品' : complete ? '奖池已抽完' : `抽奖，消耗${displayCost ?? '未知'}张使命卡片${insufficient ? '，卡片不足' : ''}`}
          disabled={processing || (awaitingClaim ? false : !!reason || !!pending || complete || insufficient)}
          onClick={() => { if (awaitingClaim) void confirmPrize(); else void draw() }}>
          {awaitingClaim ? '收下奖品' : complete ? '奖池已抽完' : <><span aria-hidden="true">▣</span><span className="sim-cost">{displayCost ?? '—'}</span></>}
        </button>
      <div className="sim-summary" aria-label="当前模拟记录">
        <span className="sim-summary-value"><span className="sim-size-guide" aria-hidden="true">已抽 {config.prizeCount} / {config.prizeCount} 次</span><span>已抽 {visibleWins.length} / {config.prizeCount} 次</span></span>
        <span className="sim-summary-value"><span className="sim-size-guide" aria-hidden="true">累计消耗 {MAX_BALANCE * config.prizeCount} 张</span><span>累计消耗 {visibleWins.reduce((n, w) => n + w.cost, 0)} 张</span></span>

      </div>
        <span className="sim-sr-status" role="status">{awaitingClaim ? `本次获得：${wins.at(-1)?.name}` : complete ? '奖池已抽完' : ''}</span>
      </div>
    </section>
    {error && <p role="alert" className="error-note">{error}</p>}
    {animating && finished && error && <button disabled={processing} onClick={() => { void finish() }}>重试保存展示状态</button>}
    {reason && !pending && <p className="error-note" role="alert">{reason}</p>}
    <dialog ref={dialog} className="sim-dialog" aria-labelledby="claim-title" onCancel={() => setModal(false)} onClose={() => setModal(false)}>
      {modal && <><button className="sim-dialog-close" aria-label="关闭" title="关闭" disabled={processing} onClick={() => setModal(false)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button><h2 id="claim-title">领取使命卡片</h2><p>余额 {state.balance} / 600 · 无实际货币价值</p><HoldToClaim result={<span role="status">{state.balance >= 600 ? '余额已满，暂时不能领取。' : reward || '本次获得 0 张使命卡片'}</span>} disabled={processing || state.balance >= 600 || !!pending || invalid} onClaim={() => {
        let gained = 0
        void mutate(s => { const next = claimCards(s, randomUnit()); gained = next.balance - s.balance; return next }).then(next => { if (next) setReward(`本次获得 ${gained} 张使命卡片`) })
      }} />{error && <p role="alert">{error}</p>}</>}
    </dialog>
    </div>
  </main>
}
