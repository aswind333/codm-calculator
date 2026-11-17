import { useId, useState } from 'react'
import { createDefaultConfig } from '../../data/defaults'
import { calculateRemainingProbabilities, calculateEquivalentCost } from '../../domain/calculations'
import { formatAmount, formatProbability } from '../../domain/format'
import './rules.css'

const questions = [
  ['为什么抽走不同奖品，下一抽概率不同？', '各奖品初始权重固定，但移除不同奖品会改变剩余权重之和。分母不同，下一抽概率也就不同；同一组已抽奖品的标记顺序不影响结果。'],
  ['性价比数字是不是实际抽到奖品的平均费用？', '不是。它只是当前单轮费用除以当前中奖概率，不是实际保底价格，也不是真实期望总花费。'],
  ['为什么显示的中奖概率相加有时不是100.000%？', '每项结果分别四舍五入并保留三位小数，显示值相加可能存在舍入误差。内部计算使用完整精度，不使用显示值再次计算。'],
  ['为什么修改初始概率后计算结果没有变化？', '编辑的是草稿。只有点击“保存设置”，全部配置校验通过且本地写入成功后，设置才正式生效。保存失败时旧配置不变。'],
  ['最后一抽是否一定为100%？', '仅剩一个奖品且它的权重大于0时，显示100.000%。剩余总权重为0时无法计算，不能强写100%；全部抽完后不再有下一抽。'],
  ['自定义设置是否会永久保存？', '设置仅保存在当前浏览器的本地站点数据中，不会跨设备同步。清除网站数据或使用无痕模式可能导致丢失；未保存草稿不会持久化。'],
]
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return <div className="rules-faq"><h3><button id={`${id}-question`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{question}<span aria-hidden="true">{open ? '−' : '+'}</span></button></h3>
    <div id={id} hidden={!open} role="region" aria-labelledby={`${id}-question`}><p>{answer}</p></div></div>
}
function ProbabilityExample() {
  const [seven, setSeven] = useState(false)
  const config = createDefaultConfig(seven ? 'seven_draw' : 'legendary_weapon')
  const removed = (seven ? [6] : [5, 6]).map(i => config.prizes[i])
  const result = calculateRemainingProbabilities(config, removed.map(p => p.prizeId))
  if (result.status !== 'ready') return <p role="alert">默认示例配置无效。</p>
  const initial = config.prizes.reduce((sum, p) => sum + p.weightPercent, 0)
  const probability = result.rows.find(p => p.prizeId === config.prizes[1].prizeId)!.probability
  return <div className="rules-example">
    <div className="mode-switch" role="group" aria-label="说明案例类型"><button aria-pressed={!seven} onClick={() => setSeven(false)}>十抽转盘</button><button aria-pressed={seven} onClick={() => setSeven(true)}>七抽转盘</button></div>
    <p className="fine">示例使用项目内置默认权重，与自定义设置及实际已抽记录无关。</p>
    <div aria-live="polite">
      <p>{seven ? '第一抽获得七等奖（60%）。' : '前两抽分别获得六等奖（6.5%）和七等奖（10%）。'}</p>
      <ol className="rules-flow">
        <li><span>初始权重 →</span><strong>{initial}</strong></li>
        <li><span>已移除权重 →</span><strong>{removed.map(p => p.weightPercent).join(' + ')}</strong></li>
        <li><span>剩余权重 →</span><strong>{result.remainingWeight}</strong></li>
        <li><span>最终概率</span><strong>{formatProbability(probability).text}</strong></li>
      </ol>
      <p className="rules-formula">{initial} − {removed.map(p => p.weightPercent).join(' − ')} = {result.remainingWeight}</p>
      <p>第{result.nextRound}抽二等奖概率：</p>
      <p className="rules-formula">{config.prizes[1].weightPercent} ÷ {result.remainingWeight} × 100% ≈ {formatProbability(probability).text}</p>
    </div>
  </div>
}
export function RulesPage({ onReturn }: { onReturn: () => void }) {
  return <main id="rules-main" className="rules-page">
    <div className="intro"><h1>规则说明</h1><button onClick={onReturn}>返回概率计算</button></div>
    <section className="panel" aria-labelledby="tutorial-title"><h2 id="tutorial-title">三步使用教程</h2>
      <ol className="rules-steps">{[
        ['选择转盘', '在主页面选择七抽或十抽，再选择对应的具体转盘类型。'],
        ['标记已抽奖品', '点击奖品卡片标记为已抽取，再次点击可取消。允许按任意顺序选择。'],
        ['查看计算结果', '系统根据当前奖池自动计算下一抽概率、每100%概率等效卡片数及相关费用。'],
      ].map(([title, body], i) => <li key={title}><span className="eyebrow">0{i + 1}</span><h3>{title}</h3><p>{body}</p></li>)}</ol>
      <p className="info-note">可以在设置页面自定义初始概率及每轮卡片价格，修改完成后需要点击保存设置。</p>
    </section>
    <section className="panel" aria-labelledby="probability-rule-title"><h2 id="probability-rule-title">概率计算规则与实例</h2>
      <p>转盘采用剔除式抽奖，已抽中的奖品不会再次出现。各奖品初始权重固定，剩余奖品重新按照权重比例分配概率。</p>
      <p className="rules-formula">当前中奖概率 = 目标奖品初始权重 ÷ 所有剩余奖品的初始权重之和</p>
      <ProbabilityExample />
    </section>
    <section className="panel" aria-labelledby="equivalent-cost-title"><h2 id="equivalent-cost-title">性价比计算与解释</h2>
      <p className="rules-formula">每100%概率等效卡片数 = 当前单轮消耗卡片 ÷ 当前中奖概率（小数）</p>
      <p>本轮10张卡、目标概率5%：</p><p className="rules-formula">10 ÷ 0.05 = {formatAmount(calculateEquivalentCost(.05, { status: 'ok', value: 10 }), 'equivalent')}卡</p>
      <p className="info-note">每100%概率等效卡片数仅用于比较当前单轮性价比，不代表实际保底价格或真实期望总花费。</p>
    </section>
    <section className="panel" aria-labelledby="faq-title"><h2 id="faq-title">FAQ 常见问题</h2>{questions.map(([question, answer]) => <FaqItem key={question} question={question} answer={answer} />)}</section>
    <p className="rules-disclaimer">本网站为非官方玩家工具。实际转盘价格、奖品概率和活动规则请以游戏内说明为准。</p>
  </main>
}
