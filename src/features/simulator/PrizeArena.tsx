import { useEffect, useRef, useState } from 'react'
import { calculateDraw } from '../../domain/calculations'
import { formatProbability } from '../../domain/format'
import { PrizeMark } from '../../components/PrizeMark'
import type { ReadonlyDrawConfig } from '../../domain/types'
import { animationFrames, RING_ORDER, SLOT_RANKS } from './model'
import type { Pending, Win } from './model'

export function CharacterPlaceholder() {
  return <div className="sim-character" aria-label="未来角色展示区域">
    <svg viewBox="0 0 160 300" aria-hidden="true"><path d="M45 65Q32 20 80 14Q129 20 116 70L106 110 124 145 144 228 114 232 104 186 100 279 83 279 79 207 72 279 54 279 54 186 43 232 18 228 36 145 54 110Z" fill="currentColor" /><path d="M46 57 58 23 75 50 90 25 114 58 103 98 81 112 57 97Z" fill="var(--sim-character-face)" /><text x="80" y="86" textAnchor="middle" fontSize="48" fontWeight="700" fill="var(--sim-text)">?</text></svg>
    <strong>Coming soon</strong>
  </div>
}
export function PrizeArena({ config, wins, pending, active, onFinished }: { config: ReadonlyDrawConfig; wins: Win[]; pending: Pending | null; active: boolean; onFinished: () => void }) {
  const [highlight, setHighlight] = useState<number | null>(null)
  const callback = useRef(onFinished); useEffect(() => { callback.current = onFinished }, [onFinished])
  const hiddenWin = pending?.phase === 'animating' ? pending.prizeId : null
  const visibleWins = wins.filter(w => w.prizeId !== hiddenWin)
  const probabilities = calculateDraw(config, visibleWins.map(w => w.prizeId))
  const target = pending ? SLOT_RANKS.findIndex(rank => config.prizes[rank - 1]?.prizeId === pending.prizeId) : -1
  const removed = visibleWins.map(w => w.prizeId).join(',')
  useEffect(() => {
    if (!active || pending?.phase !== 'animating') return
    const frames = animationFrames(RING_ORDER.filter(slot => {
      const prize = config.prizes[SLOT_RANKS[slot] - 1]
      return prize && !removed.split(',').includes(prize.prizeId)
    }), target)
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    let elapsed = 0, previous = 0, handle = 0
    const tick = (now: number) => {
      if (!previous) previous = now
      if (!document.hidden) elapsed += Math.min(now - previous, 100)
      previous = now
      let current: number | null = null
      for (const frame of frames) if (elapsed >= frame.at) current = frame.slot
      setHighlight(reduced ? null : current)
      if (elapsed >= frames[frames.length - 1].at + 450) { setHighlight(target); callback.current(); return }
      handle = requestAnimationFrame(tick)
    }
    handle = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(handle)
  }, [active, pending?.id, pending?.phase, target, removed, config])
  return <div className="sim-arena" aria-label="模拟奖池">
    {[0, 1].map(side => <div className={`sim-side sim-side-${side}`} key={side}>
      {SLOT_RANKS.slice(side * 5, side * 5 + 5).map((rank, i) => {
        const prize = config.prizes[rank - 1], slot = side * 5 + i
        const obtainedIndex = prize ? visibleWins.findIndex(w => w.prizeId === prize.prizeId) : -1
        const drawn = obtainedIndex >= 0
        const probability = probabilities.rows.find(row => row.prizeId === prize?.prizeId)
        const lit = pending?.phase === 'result' ? target === slot : pending?.phase === 'animating' && highlight === slot
        return <div key={slot} data-slot={slot} data-rank={rank} data-highlighted={!!lit} className={`sim-prize sim-position-${i}${rank <= 2 ? ' sim-major' : ''}${!prize ? ' sim-empty' : ''}${drawn ? ' sim-drawn' : ''}${lit ? ' sim-lit' : ''}`}>
          {prize ? <><PrizeMark rank={rank} /><strong>{prize.name}</strong><small className="sim-prize-state"><span className="sim-size-guide" aria-hidden="true">✓ 已抽取</span><span>{drawn ? '✓ 已抽取' : '未抽取'}</span></small><span className="sim-prize-detail"><span className="sim-size-guide" aria-hidden="true">第 {config.prizeCount} 抽获得</span><span className="sim-size-guide" aria-hidden="true">100.000%</span><span className="sim-size-guide" aria-hidden="true">不可计算</span>{drawn ? <span className="sim-obtained">第 {obtainedIndex + 1} 抽获得</span> : <span className="sim-probability" aria-label="本轮抽取概率">{probabilities.probabilities.status === 'ready' && probability ? formatProbability(probability.probability).text : '不可计算'}</span>}</span></> : <><strong>-</strong><small>无奖品</small></>}
        </div>
      })}
    </div>)}
    <CharacterPlaceholder />
  </div>
}
