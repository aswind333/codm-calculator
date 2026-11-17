import { PrizeMark } from '../../components/PrizeMark'
import type { ReadonlyDrawConfig } from '../../domain/types'
import { calculateDraw } from '../../domain/calculations'
import type { Amount } from '../../domain/calculations'
import { formatAmount, formatProbability } from '../../domain/format'


function CostValue({ amount, unit }: { amount: Amount; unit: string }) {
  return <>{formatAmount(amount, 'cards')}{amount.status === 'ok' && <small> {unit}</small>}</>
}

function DrawSummary({ config, result }: { config: ReadonlyDrawConfig; result: ReturnType<typeof calculateDraw> }) {
  const { probabilities: p, costs } = result
  if (p.status === 'invalid' || !costs) return null
  const fields = [
    { label: '此前已花费', value: costs.paid },
    ...(p.status === 'complete' ? [] : [{ label: '下一抽需要', value: costs.next }, { label: '完成本轮后累计', value: costs.after }]),
    { label: '全抽总费用', value: costs.total },
  ]
  return <section className="panel summary" aria-label="轮次与费用">
    <div className="round-line" aria-live="polite"><strong>{p.status === 'complete' ? '转盘已全部抽完' : `第${p.nextRound}抽 / 共${config.prizeCount}抽`}</strong><span>已抽取 {p.drawnCount} / {config.prizeCount} 件</span></div>
    <dl className="cost-grid">{fields.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd><CostValue amount={value} unit={config.currencyLabel} /></dd></div>)}</dl>
    <p className="muted fine">费用按当前配置计算，不是实际支付流水。</p>
  </section>
}

function PrizeGrid({ config, drawnIds, onToggle, onClear }: ViewProps) {
  return <section className="panel prize-panel" aria-labelledby="prizes-title">
    <div className="section-title"><div><p className="eyebrow">01 / 标记已抽奖品</p><h2 id="prizes-title">你已经抽到了什么？</h2></div><button className="text-button" onClick={onClear} disabled={drawnIds.length === 0}>清空已抽记录</button></div>
    <p className="muted">点击标记已抽取，再次点击可撤销。</p>
    <div className="prize-grid">{config.prizes.map((prize, index) => {
      const drawn = drawnIds.includes(prize.prizeId)
      return <button type="button" key={prize.prizeId} className={`prize-card${drawn ? ' drawn' : ''}`} aria-label={prize.name} aria-pressed={drawn} onClick={() => onToggle(prize.prizeId)}>
        <PrizeMark rank={index + 1} /><strong>{prize.name}</strong><span className="prize-state">{drawn ? '✓ 已抽取' : '未抽取'}</span>
      </button>
    })}</div>
    <p className="session-note">已抽记录独立保存在本机浏览器；清理网站数据后可能丢失。</p>
  </section>
}

function ProbabilityResults({ config, result }: { config: ReadonlyDrawConfig; result: ReturnType<typeof calculateDraw> }) {
  const p = result.probabilities
  const error = p.status === 'invalid' ? '配置或已抽记录无效，请检查数据。'
    : p.status === 'zero-weight' ? '剩余奖品总权重为0，请检查概率设置或撤销已抽奖品。'
    : p.status === 'numeric-error' ? '数值超出计算范围，当前状态无法计算。' : null
  return <section className="panel results-panel" aria-labelledby="results-title">
    <p className="eyebrow">02 / 查看当前结果</p><h2 id="results-title">{p.status === 'complete' ? '本次转盘已完成' : '下一抽，概率一目了然'}</h2>
    {error && <p role="alert" className="error-note">{error}</p>}
    {p.status !== 'invalid' && p.warnings.length > 0 && <p role="alert" className="error-note">当前配置中有权重为0的奖品被标记为已抽，请检查或撤销。</p>}
    {p.status === 'complete' && <p className="complete-note">所有奖品均已标记。可以撤销任意奖品，或清空记录重新开始。</p>}
    {p.status === 'ready' && <>
      <p className="muted">全部 {result.rows.length} 件剩余奖品 · 按奖品等级排列</p>
      <table><caption className="sr-only">剩余奖品下一抽概率与等效卡片数</caption><thead><tr><th scope="col">奖品</th><th scope="col">下一抽<br />中奖概率</th><th scope="col">本轮每100%概率<br />等效卡片数</th></tr></thead>
        <tbody>{result.rows.map(row => {
          const display = formatProbability(row.probability)
          return <tr key={row.prizeId}><th scope="row">{config.prizes.find(prize => prize.prizeId === row.prizeId)?.name}</th><td><span className="result-value" key={display.text}>{display.text}</span>{display.roundedToZero && <small className="cell-note">实际大于0，仅因显示精度舍入</small>}</td><td>{formatAmount(row.equivalentCost, 'equivalent')}{row.equivalentCost.status === 'ok' && <small className="unit"> {config.currencyLabel}</small>}</td></tr>
        })}</tbody></table>
    </>}
  </section>
}

interface ViewProps {
  config: ReadonlyDrawConfig
  drawnIds: readonly string[]
  onToggle: (id: string) => void
  onClear: () => void
}
export function CalculatorView(props: ViewProps) {
  // All mathematics and final numeric formatting come from S2.
  const result = calculateDraw(props.config, props.drawnIds)
  return <><DrawSummary config={props.config} result={result} /><div className="calculator-columns"><PrizeGrid {...props} /><ProbabilityResults config={props.config} result={result} /></div></>
}
