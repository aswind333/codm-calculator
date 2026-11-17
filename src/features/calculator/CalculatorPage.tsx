import { useState } from 'react'
import type { ReadonlyDrawConfig } from '../../domain/types'
import { loadDrawn, saveDrawn } from '../../storage/storage'
import type { StorageAdapter } from '../../storage/storage'
import type { DrawTypeId } from '../../domain/types'
import { CalculatorView } from './CalculatorView'

export function CalculatorPage({ configs, storage }: { configs: readonly ReadonlyDrawConfig[]; storage: StorageAdapter }) {
  const [typeId, setTypeId] = useState<DrawTypeId>('legendary_weapon')
  const [lastTenType, setLastTenType] = useState<DrawTypeId>('legendary_weapon')
  const [initial] = useState(() => loadDrawn(storage, configs))
  const [drawnByType, setDrawnByType] = useState(initial.records)
  const [warning, setWarning] = useState(initial.warning ?? '')
  function updateRecords(records: typeof drawnByType) {
    setDrawnByType(records)
    const result = saveDrawn(storage, records, configs)
    setWarning(result.ok ? '' : result.message)
  }
  const config = configs.find(item => item.typeId === typeId)!
  const drawnIds = drawnByType[typeId] ?? []
  function chooseType(id: DrawTypeId) {
    setTypeId(id)
    if (id !== 'seven_draw') setLastTenType(id)
  }
  function toggle(id: string) {
    const ids = drawnByType[typeId] ?? []
    updateRecords({ ...drawnByType, [typeId]: ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id] })
  }
  return <main id="main">
    {warning && <p role="alert" className="error-note">{warning}</p>}
    <div className="intro"><p className="eyebrow">CODM · 概率计算</p><h1>下一抽，心里有数。</h1><p className="muted">选转盘，标记已抽奖品，查看当前概率与卡片花费。</p></div>
    <section className="panel selector" aria-label="选择转盘">
      <div className="mode-switch" role="group" aria-label="转盘模式">
        <button aria-pressed={config.prizeCount === 10} onClick={() => chooseType(lastTenType)}>十抽转盘</button>
        <button aria-pressed={config.prizeCount === 7} onClick={() => chooseType('seven_draw')}>七抽转盘</button>
      </div>
      <label className="type-label">转盘类型<select value={typeId} onChange={event => {
        const selected = configs.find(item => item.typeId === event.target.value)
        if (selected) chooseType(selected.typeId)
      }}>{configs.filter(item => item.prizeCount === config.prizeCount).map(item => <option key={item.typeId} value={item.typeId}>{item.label}</option>)}</select></label>
      <span className="selector-note">固定权重 · 不放回抽取</span>
    </section>
    <CalculatorView config={config} drawnIds={drawnIds} onToggle={toggle} onClear={() => updateRecords({ ...drawnByType, [typeId]: [] })} />
  </main>
}
