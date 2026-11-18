import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { createDefaultConfig } from '../../data/defaults'
import { calculateRemainingProbabilities, calculateEquivalentCost } from '../../domain/calculations'
import { formatAmount, formatProbability } from '../../domain/format'
import './rules.css'

const questions = [
  ['为什么抽走不同奖品，下一抽概率不同？', '各奖品初始权重固定，但移除不同奖品会改变剩余权重之和。分母不同，下一抽概率也就不同；同一组已抽奖品的标记顺序不影响结果。'],
  ['为什么要先获取卡片后才能抽奖呢？', '谁知号上卡，片片皆辛苦。'],
]
function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return <div className="rules-faq"><h3><button id={`${id}-question`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{question}<span aria-hidden="true">{open ? '−' : '+'}</span></button></h3>
    <div id={id} hidden={!open} role="region" aria-labelledby={`${id}-question`}><p>{answer}</p></div></div>
}
function RuleSection({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  const id = useId()
  return <section className="panel rule-section" aria-labelledby={`${id}-title`}>
    <h2><button id={`${id}-title`} className="rule-trigger" aria-expanded={open} aria-controls={id} onClick={onToggle}>
      {title}<span className="rule-arrow" aria-hidden="true">⌄</span>
    </button></h2>
    <div id={id} className="rule-collapse" data-open={open} role="region" aria-labelledby={`${id}-title`} aria-hidden={!open} inert={!open}>
      <div className="rule-clip"><div className="rule-content">{children}</div></div>
    </div>
  </section>
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
export function RulesPage() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const sectionProps = (title: string) => ({ title, open: expanded === title, onToggle: () => setExpanded(current => current === title ? null : title) })
  return <main id="rules-main" className="rules-page" aria-label="规则说明">
    <RuleSection {...sectionProps('三步使用教程')}>
      <ol className="rules-steps">{[
        ['选择转盘', '在概率计算页面的『转盘类型』下拉菜单中选择对应转盘。'],
        ['标记已抽奖品', '点击奖品名称所在单元格标记为已抽取，再次点击可撤销。允许按任意顺序标记，并记录标记顺序。'],
        ['查看计算结果', '系统根据当前奖池自动计算下一抽概率、每100%概率等效卡片数及相关费用。'],
      ].map(([title, body], i) => <li key={title}><span className="eyebrow">0{i + 1}</span><h3>{title}</h3><p>{body}</p></li>)}</ol>
      <p className="info-note">可以在设置页面自定义初始概率及每轮卡片价格，修改完成后需要点击保存设置。</p>
      <p className="info-note">模拟抽奖使用最近成功保存的价格与概率，独立于计算器已抽记录。使命卡片仅为模拟资源，不做CP或货币换算；余额与记录保存在当前浏览器。累计消耗按实际扣卡记录，不因修改价格重算；重置奖池不退还卡片。</p>
    </RuleSection>
    <RuleSection {...sectionProps('概率计算规则与实例')}>
      <p>转盘采用剔除式抽奖，已抽中的奖品不会再次出现。各奖品初始权重固定，剩余奖品重新按照权重比例分配概率。</p>
      <p className="rules-formula">当前中奖概率 = 目标奖品初始权重 ÷ 所有剩余奖品的初始权重之和</p>
      <ProbabilityExample />
    </RuleSection>
    <RuleSection {...sectionProps('性价比计算与解释')}>
      <p className="rules-formula">每100%概率等效卡片数 = 当前单轮消耗卡片 ÷ 当前中奖概率（小数）</p>
      <p>本轮10张卡、目标概率5%：</p><p className="rules-formula">10 ÷ 0.05 = {formatAmount(calculateEquivalentCost(.05, { status: 'ok', value: 10 }), 'equivalent')}卡</p>
      <p className="info-note">每100%概率等效卡片数仅用于比较当前单轮性价比，不代表实际保底价格或真实期望总花费。</p>
      <h3>性价比指数</h3>
      <p>比较某奖品当前下一抽与它自身在当前有效配置下第一抽的性价比。第一抽基准不随奖品剔除而改变；保存新配置后重新计算。</p>
      <p className="rules-formula">性价比指数 = 第一抽等效花费 ÷ 当前下一抽等效花费<br />等效花费 = 单抽价格 ÷ 对应奖品中奖概率</p>
      <p className="rules-formula">性价比指数 =（当前中奖概率 ÷ 当前单抽价格）÷（初始中奖概率 ÷ 第一抽价格）</p>
      <p>概率使用小数，例如4%为0.04。指数越大，当前单位卡片对应的中奖概率越高。</p>
      <ul><li>1.00×：与第一抽相同。</li><li>大于1.00×：比第一抽更划算；1.25×表示提高25%。</li><li>小于1.00×：比第一抽更不划算；0.80×表示降低20%。</li></ul>
      <p>例如：第一抽3使命卡片、中奖概率4%，等效花费3 ÷ 0.04 = 75卡片；当前下一抽6使命卡片、中奖概率10%，等效花费6 ÷ 0.10 = 60卡片。</p>
      <p className="rules-formula">75 ÷ 60 = 1.25×</p>
      <p>即当前单位卡片对应的目标奖品中奖概率比第一抽提高25%。指数保留两位小数，内部不提前舍入；已抽取、没有下一抽、概率或价格为0等无法计算有效比值时显示「—」。</p>
      <p>指数是单轮比较指标，不代表实际所需抽数，也不保证中奖；这里的等效花费不等同于不放回抽奖机制下实际获得目标奖品所需的总期望花费。</p>
    </RuleSection>
    <section className="panel" aria-labelledby="faq-title"><h2 id="faq-title">FAQ 常见问题</h2>{questions.map(([question, answer]) => <FaqItem key={question} question={question} answer={answer} />)}</section>
  </main>
}
