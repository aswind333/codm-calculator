import { useEffect, useRef, useState } from 'react'

export function HoldToClaim({ disabled, onClaim }: { disabled: boolean; onClaim: () => void }) {
  const [progress, setProgress] = useState(0)
  const held = useRef(false)
  const frame = useRef(0)
  const start = useRef(0)
  function cancel() { held.current = false; cancelAnimationFrame(frame.current); setProgress(0) }
  useEffect(() => {
    const stop = () => { held.current = false; cancelAnimationFrame(frame.current); setProgress(0) }
    window.addEventListener('blur', stop); document.addEventListener('visibilitychange', stop)
    return () => { held.current = false; cancelAnimationFrame(frame.current); window.removeEventListener('blur', stop); document.removeEventListener('visibilitychange', stop) }
  }, [])
  function begin() {
    if (disabled || held.current) return
    held.current = true; start.current = performance.now()
    const tick = (now: number) => {
      if (!held.current) return
      const percent = Math.min(1, (now - start.current) / 1500)
      setProgress(percent)
      if (percent === 1) { onClaim(); return } // still held; only release permits another claim
      frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
  }
  return <><button className="sim-hold" disabled={disabled} aria-label="连续长按1.5秒领取卡片" style={{ background: `conic-gradient(var(--primary) ${progress * 360}deg, var(--border) 0deg)` }}
    onContextMenu={e => e.preventDefault()}
    onPointerDown={e => { if (e.button !== 0 || held.current) return; e.preventDefault(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); begin() }}
    onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) cancel() }}
    onPointerUp={cancel} onPointerCancel={cancel} onLostPointerCapture={cancel} onBlur={cancel}
    onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) begin() } }}
    onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cancel() } }}>
    <span aria-hidden="true" />
  </button><p className="sim-hold-progress">按住领取 <strong>{Math.floor(progress * 100)}%</strong></p></>
}
