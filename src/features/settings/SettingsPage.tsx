import { useEffect, useId, useState } from 'react'
import { createDefaultConfig, createDefaultConfigs } from '../../data/defaults'
import type { DrawConfig, DrawTypeId, ReadonlyDrawConfig } from '../../domain/types'
import { validateConfig, validateConfigs } from '../../domain/validation'
import type { WriteResult } from '../../storage/storage'
import { PrizeMark } from '../../components/PrizeMark'
import { fromDraft, parseNumber, toDraft } from './draft'
import type { DraftConfig } from './draft'
import './settings.css'

function Field({ label, accessibleLabel = label, value, onChange, numeric = false, error }: {
  label: string; accessibleLabel?: string; value: string; onChange: (value: string) => void; numeric?: boolean; error?: string
}) {
  const id = useId()
  return <label className="setting-field">{label}<input aria-label={accessibleLabel} value={value} inputMode={numeric ? 'decimal' : 'text'}
    aria-invalid={!!error} aria-describedby={error ? id : undefined} onChange={e => onChange(e.target.value)} />
    {error && <small id={id} className="field-error">{error}</small>}</label>
}
function fieldName(path: string): string {
  const round = path.match(/^roundCosts\[(\d+)\]/)
  if (round) return `第${Number(round[1]) + 1}抽价格`
  const prize = path.match(/^prizes\[(\d+)\]\.(.+)/)
  if (prize) return `第${Number(prize[1]) + 1}等奖${prize[2] === 'name' ? '名称' : '概率'}`
  return path === 'currencyLabel' ? '单位' : path === 'prizes' ? '概率合计' : '配置'
}
function total(values: string[], probability = false): string {
  const numbers = values.map(parseNumber)
  if (numbers.some(n => !Number.isFinite(n) || n < 0 || (!probability && !Number.isInteger(n)))) return '输入不完整或无效'
  const sum = numbers.reduce((a, b) => a + b, 0)
  return Number.isFinite(sum) ? probability ? sum.toFixed(3) + '%' : String(sum) : '数值超出范围'
}
interface EditorProps { draft: DraftConfig[]; update: (id: DrawTypeId, edit: (c: DraftConfig) => DraftConfig) => void }
function PriceEditor({ draft, update }: EditorProps) {
  const [selected, setSelected] = useState<DrawTypeId>('legendary_weapon')
  const [showTable, setShowTable] = useState(false)
  const current = draft.find(c => c.typeId === selected)!
  function priceField(c: DraftConfig, i: number) {
    const errors = validateConfig(fromDraft([c])[0]).issues
    return <Field label={`第${i + 1}抽`} accessibleLabel={`${c.label} 第${i + 1}抽`} value={c.roundCosts[i]} numeric
      error={errors.find(e => e.path === `roundCosts[${i}]`)?.message}
      onChange={value => update(c.typeId, old => ({ ...old, roundCosts: old.roundCosts.map((v, j) => j === i ? value : v) }))} />
  }
  function reset(c: DraftConfig) { update(c.typeId, old => ({ ...old, roundCosts: toDraft([createDefaultConfig(c.typeId)])[0].roundCosts })) }
  function unit(c: DraftConfig) { return <Field label="单位" accessibleLabel={`${c.label} 单位`} value={c.currencyLabel} error={!c.currencyLabel.trim() ? '单位不能为空' : undefined} onChange={value => update(c.typeId, old => ({ ...old, currencyLabel: value }))} /> }
  return <>
    <section className="mobile-price" aria-label="手机逐轮价格编辑">
      <label>编辑价格类型<select value={selected} onChange={e => setSelected(e.target.value as DrawTypeId)}>{draft.map(c => <option key={c.typeId} value={c.typeId}>{c.label}</option>)}</select></label>
      {unit(current)}<div className="round-inputs">{current.roundCosts.map((_, i) => <div key={i}>{priceField(current, i)}</div>)}</div>
      <p>合计：{total(current.roundCosts)} {current.currencyLabel}</p><button onClick={() => reset(current)}>恢复当前类型默认价格</button>
      <button aria-expanded={showTable} onClick={() => setShowTable(!showTable)}>{showTable ? '收起完整价格总表' : '查看完整价格总表'}</button>
    </section>
    <section className={`price-table-wrap${showTable ? ' show-table' : ''}`} aria-label="完整价格总表" tabIndex={0}>
      <table className="price-matrix"><caption>8种转盘逐轮价格（草稿）</caption>
        <colgroup><col className="price-type-column" /><col span={10} /><col className="price-total-column" /><col className="price-reset-column" /></colgroup>
        <thead><tr><th scope="col">转盘类型 / 单位</th>{Array.from({ length: 10 }, (_, i) => <th key={i} scope="col">第{i + 1}抽</th>)}<th scope="col">合计</th><th scope="col">恢复默认</th></tr></thead>
        <tbody>{draft.map(c => <tr key={c.typeId}><th scope="row">{c.label}{unit(c)}</th>{Array.from({ length: 10 }, (_, i) => <td key={i}>{i < c.prizeCount ? priceField(c, i) : '—'}</td>)}<td>{total(c.roundCosts)}</td><td><button onClick={() => reset(c)} aria-label={`${c.label} 恢复默认价格`}>恢复默认价格</button></td></tr>)}</tbody>
      </table>
    </section>
  </>
}
function ProbabilityEditor({ draft, update }: EditorProps) {
  const [selected, setSelected] = useState<DrawTypeId>('legendary_weapon')
  const c = draft.find(item => item.typeId === selected)!
  const errors = validateConfig(fromDraft([c])[0]).issues
  return <section aria-label="初始概率编辑">
    <label>编辑概率类型<select value={selected} onChange={e => setSelected(e.target.value as DrawTypeId)}>{draft.map(item => <option key={item.typeId} value={item.typeId}>{item.label}</option>)}</select></label>
    <p className="probability-total" aria-live="polite">概率合计 {total(c.prizes.map(p => p.weightPercent), true)}</p>
    {errors.filter(e => e.path === 'prizes').map(e => <p key={e.path} className="field-error">{e.message}</p>)}
    <div className="probability-grid">{c.prizes.map((p, i) => <div className="probability-card" key={p.prizeId}><PrizeMark rank={i + 1} /><strong>第{i + 1}等奖</strong>
      <Field label={`第${i + 1}等奖名称`} value={p.name} error={errors.find(e => e.path === `prizes[${i}].name`)?.message}
        onChange={value => update(c.typeId, old => ({ ...old, prizes: old.prizes.map((item, j) => i === j ? { ...item, name: value } : item) }))} />
      <Field label={`第${i + 1}等奖初始概率（%）`} value={p.weightPercent} numeric error={errors.find(e => e.path === `prizes[${i}].weightPercent`)?.message}
        onChange={value => update(c.typeId, old => ({ ...old, prizes: old.prizes.map((item, j) => i === j ? { ...item, weightPercent: value } : item) }))} />
    </div>)}</div>
    <button onClick={() => update(c.typeId, old => ({ ...old, prizes: old.prizes.map((p, i) => ({ ...p, weightPercent: String(createDefaultConfig(c.typeId).prizes[i].weightPercent) })) }))}>恢复当前类型默认概率</button>
  </section>
}
export function SettingsPage({ saved, onSave, onDirty, onLeave }: {
  saved: readonly ReadonlyDrawConfig[]; onSave: (configs: DrawConfig[]) => WriteResult; onDirty: (dirty: boolean) => void; onLeave: () => void
}) {
  const [draft, setDraft] = useState(() => toDraft(saved))
  const [tab, setTab] = useState<'prices' | 'probabilities'>('prices')
  const [feedback, setFeedback] = useState('')
  const [failed, setFailed] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(saved))
  const parsed = fromDraft(draft)
  const validation = validateConfigs(parsed)
  useEffect(() => { onDirty(dirty) }, [dirty, onDirty])
  useEffect(() => {
    if (feedback !== '设置已保存') return
    const timer = window.setTimeout(() => setFeedback(''), 4000)
    return () => window.clearTimeout(timer)
  }, [feedback])
  function update(id: DrawTypeId, edit: (c: DraftConfig) => DraftConfig) {
    setDraft(previous => previous.map(c => c.typeId === id ? edit(c) : c)); setFeedback('')
  }
  function save() {
    const result = onSave(parsed)
    setFailed(!result.ok)
    if (result.ok) { setDraft(toDraft(parsed)); setFeedback('设置已保存') }
    else setFeedback(result.message)
  }
  return <main id="settings-main">
    <div className="intro"><h1>自定义转盘设置</h1><p className="muted">调整每轮抽奖价格与奖品概率。编辑或恢复默认后，请点击保存设置。</p><button onClick={onLeave}>返回概率计算</button></div>
    <section className="panel settings-panel">
      <div className="settings-actions"><strong>{dirty ? '有未保存的修改' : '当前无未保存修改'}</strong><button className="save-button" disabled={!dirty || !validation.valid} onClick={save}>保存设置</button>
        <button disabled={!dirty} onClick={() => { if (window.confirm('放弃所有未保存的修改？')) { setDraft(toDraft(saved)); setFailed(false); setFeedback('已取消修改') } }}>取消修改</button>
        <button onClick={() => { if (window.confirm('恢复全部默认配置？此操作只修改草稿，仍需保存。')) { setDraft(toDraft(createDefaultConfigs())); setFailed(false); setFeedback('已恢复默认草稿，请保存后生效') } }}>恢复全部默认</button>
      </div>
      {feedback && <p role={failed ? 'alert' : 'status'} className={failed ? 'error-note' : 'info-note'}>{feedback}</p>}
      {!validation.valid && <div role="alert" className="error-note"><strong>无法保存，请修正以下配置：</strong><ul>{draft.flatMap(c => validateConfig(fromDraft([c])[0]).issues.map((issue, i) => <li key={`${c.typeId}-${i}`}>{c.label} · {fieldName(issue.path)}：{issue.message}</li>))}</ul></div>}
      <div role="tablist" aria-label="设置分类" className="mode-switch settings-tabs" onKeyDown={event => {
        const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
        if (!keys.includes(event.key)) return
        event.preventDefault()
        const next = event.key === 'Home' ? 'prices' : event.key === 'End' ? 'probabilities' : tab === 'prices' ? 'probabilities' : 'prices'
        setTab(next)
        document.getElementById(next === 'prices' ? 'price-tab' : 'probability-tab')?.focus()
      }}>
        <button role="tab" tabIndex={tab === 'prices' ? 0 : -1} id="price-tab" aria-selected={tab === 'prices'} aria-controls="price-panel" onClick={() => setTab('prices')}>抽奖价格</button>
        <button role="tab" tabIndex={tab === 'probabilities' ? 0 : -1} id="probability-tab" aria-selected={tab === 'probabilities'} aria-controls="probability-panel" onClick={() => setTab('probabilities')}>初始概率</button>
      </div>
      <div role="tabpanel" id="price-panel" aria-labelledby="price-tab" hidden={tab !== 'prices'}><PriceEditor draft={draft} update={update} /></div>
      <div role="tabpanel" id="probability-panel" aria-labelledby="probability-tab" hidden={tab !== 'probabilities'}><ProbabilityEditor draft={draft} update={update} /></div>
    </section>
  </main>
}
