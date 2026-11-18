import { useState } from 'react'
import type { ReadonlyDrawConfig } from '../../domain/types'
import { loadDrawn, saveDrawn } from '../../storage/storage'
import type { StorageAdapter } from '../../storage/storage'
import type { DrawTypeId } from '../../domain/types'
import { CalculatorView } from './CalculatorView'

export function CalculatorPage({ configs, storage }: { configs: readonly ReadonlyDrawConfig[]; storage: StorageAdapter }) {
  const [typeId, setTypeId] = useState<DrawTypeId>('legendary_weapon')
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
  function toggle(id: string) {
    const ids = drawnByType[typeId] ?? []
    updateRecords({ ...drawnByType, [typeId]: ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id] })
  }
  return <main id="main" className="calculator-page" aria-label="抽奖分析">
    {warning && <p role="alert" className="error-note">{warning}</p>}
    <CalculatorView typeSelector={<label className="summary-type-label">转盘类型<select value={typeId} onChange={event => {
      const selected = configs.find(item => item.typeId === event.target.value)
      if (selected) setTypeId(selected.typeId)
    }}>{configs.map(item => <option key={item.typeId} value={item.typeId}>{item.typeId === 'seven_draw' ? '七抽（通用）' : item.label}</option>)}</select></label>} config={config} drawnIds={drawnIds} onToggle={toggle} onClear={() => updateRecords({ ...drawnByType, [typeId]: [] })} />
  </main>
}
