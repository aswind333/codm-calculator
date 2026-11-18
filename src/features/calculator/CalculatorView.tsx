import type { ReactNode } from 'react'
import { PrizeMark } from '../../components/PrizeMark'
import type { ReadonlyDrawConfig } from '../../domain/types'
import { calculateDraw } from '../../domain/calculations'
import { calculateValueIndex } from '../../domain/valueIndex'
import type { Amount } from '../../domain/calculations'
import { formatAmount, formatProbability, formatValueIndex } from '../../domain/format'


function CostValue({ amount, unit }: { amount: Amount; unit: string }) {
  return <>{formatAmount(amount, 'cards')}{amount.status === 'ok' && <small> {unit}</small>}</>
}

function DrawSummary({ config, result, typeSelector }: { config: ReadonlyDrawConfig; result: ReturnType<typeof calculateDraw>; typeSelector?: ReactNode }) {
  const { probabilities: p, costs } = result
  if (p.status === 'invalid' || !costs) return null
  const fields = [
    { label: '此前已花费', value: costs.paid },
    ...(p.status === 'complete' ? [] : [{ label: '下一抽需要', value: costs.next }, { label: '完成本轮后累计', value: costs.after }]),
    { label: '全抽总费用', value: costs.total },
  ]
  return <section className="panel summary" aria-label="轮次与费用">
    <div className="round-line"><strong aria-live="polite">{p.status === 'complete' ? '转盘已全部抽完' : `第${p.nextRound}抽 / 共${config.prizeCount}抽`}</strong>{typeSelector}</div>
    <dl className="cost-grid">{fields.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd><CostValue amount={value} unit={config.currencyLabel} /></dd></div>)}</dl>
  </section>
}

function ProbabilityResults({ config, drawnIds, onToggle, onClear, result }: ViewProps & { result: ReturnType<typeof calculateDraw> }) {
  const p = result.probabilities
  const baseline = calculateDraw(config, [])
  const error = p.status === 'invalid' ? '配置或已抽记录无效，请检查数据。'
    : p.status === 'zero-weight' ? '剩余奖品总权重为0，请检查概率设置或撤销已抽奖品。'
    : p.status === 'numeric-error' ? '数值超出计算范围，当前状态无法计算。' : null
  return <section className="panel calculation-table-panel" aria-labelledby="results-title">
    <div className="section-title"><h2 id="results-title">抽奖计算</h2><button className="text-button" onClick={onClear} disabled={drawnIds.length === 0}>清空已抽记录</button></div>
    {error && <p role="alert" className="error-note">{error}</p>}
    {p.status !== 'invalid' && p.warnings.length > 0 && <p role="alert" className="error-note">当前配置中有权重为0的奖品被标记为已抽，请检查或撤销。</p>}
    <table className="calculation-table"><caption className="sr-only">奖品标记与下一抽概率；编号仅表示用户标记顺序，并非核验的真实抽奖顺序</caption>
      <thead><tr><th scope="col">奖品</th><th scope="col">下一抽概率</th><th scope="col">100%概率等效卡片数</th><th scope="col">性价比指数</th></tr></thead>
      <tbody>{config.prizes.map((prize, index) => {
        const order = drawnIds.indexOf(prize.prizeId)
        const drawn = order >= 0
        const row = !drawn && p.status === 'ready' ? result.rows.find(item => item.prizeId === prize.prizeId) : undefined
        const initialRow = baseline.rows.find(item => item.prizeId === prize.prizeId)
        const valueIndex = calculateValueIndex(initialRow?.equivalentCost, row?.equivalentCost)
        const display = row ? formatProbability(row.probability) : undefined
        return <tr key={prize.prizeId} className={drawn ? 'marked' : undefined}>
          <th scope="row"><button type="button" className="prize-cell-button" aria-label={prize.name} aria-pressed={drawn}
            aria-description={drawn ? `已抽取；第${order + 1}个标记，仅为用户标记顺序。再次点击撤销。` : '点击标记为已抽取'}
            onClick={() => onToggle(prize.prizeId)}>
            <PrizeMark rank={index + 1} /><span className="prize-cell-name">{prize.name}</span>
            {drawn && <span className="mark-order" title={`第${order + 1}个标记（非核验抽奖顺序）`} aria-hidden="true">{order + 1}</span>}
          </button></th>
          <td>{display ? <><span className="result-value" key={display.text}>{display.text}</span>{display.roundedToZero && <small className="cell-note">实际大于0，仅因显示精度舍入</small>}</> : <span aria-label={drawn ? '已抽取，不参与下一抽' : '当前无可用概率'}>—</span>}</td>
          <td>{row ? formatAmount(row.equivalentCost, 'equivalent') : <span aria-label={drawn ? '已抽取，不适用' : '当前无可用等效卡片数'}>—</span>}</td>
          <td className="value-index">{formatValueIndex(valueIndex)}</td>
        </tr>
      })}</tbody>
    </table>
  </section>
}

interface ViewProps {
  typeSelector?: ReactNode
  config: ReadonlyDrawConfig
  drawnIds: readonly string[]
  onToggle: (id: string) => void
  onClear: () => void
}
export function CalculatorView(props: ViewProps) {
  // All mathematics and final numeric formatting come from S2.
  const result = calculateDraw(props.config, props.drawnIds)
  return <><DrawSummary config={props.config} result={result} typeSelector={props.typeSelector} /><ProbabilityResults {...props} result={result} /></>
}
