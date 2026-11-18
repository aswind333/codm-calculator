import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

export function HoldToClaim({ disabled, onClaim, result }: { disabled: boolean; onClaim: () => void; result?: ReactNode }) {
  const button = useRef<HTMLButtonElement>(null)
  const [progress, setProgress] = useState(0)
  const held = useRef(false)
  const frame = useRef(0)
  const start = useRef(0)
  function cancel() { held.current = false; cancelAnimationFrame(frame.current); setProgress(0) }
  useEffect(() => {
    const stop = () => { held.current = false; cancelAnimationFrame(frame.current); setProgress(0) }
    window.addEventListener('pagehide', stop); window.addEventListener('blur', stop); document.addEventListener('visibilitychange', stop)
    return () => { held.current = false; cancelAnimationFrame(frame.current); window.removeEventListener('pagehide', stop); window.removeEventListener('blur', stop); document.removeEventListener('visibilitychange', stop) }
  }, [])
  useEffect(() => {
    const target = button.current
    if (!target) return
    // React delegates touch events; use a button-local, explicitly non-passive
    // listener so cancellation reaches Android browsers before their long-press UI.
    const prevent = (event: Event) => { if (event.cancelable) event.preventDefault() }
    const touchStart = (event: TouchEvent) => {
      prevent(event)
      if (event.touches.length !== 1) cancel()
    }
    const touchMove = (event: TouchEvent) => {
      prevent(event)
      const touch = event.touches[0], bounds = target.getBoundingClientRect()
      if (event.touches.length !== 1 || !touch || touch.clientX < bounds.left || touch.clientX > bounds.right || touch.clientY < bounds.top || touch.clientY > bounds.bottom) cancel()
    }
    const touchEnd = (event: TouchEvent) => { prevent(event); cancel() }
    target.addEventListener('contextmenu', prevent)
    target.addEventListener('touchstart', touchStart, { passive: false })
    target.addEventListener('touchmove', touchMove, { passive: false })
    target.addEventListener('touchend', touchEnd, { passive: false })
    target.addEventListener('touchcancel', touchEnd, { passive: false })
    return () => {
      target.removeEventListener('contextmenu', prevent)
      target.removeEventListener('touchstart', touchStart)
      target.removeEventListener('touchmove', touchMove)
      target.removeEventListener('touchend', touchEnd)
      target.removeEventListener('touchcancel', touchEnd)
    }
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
  return <><button ref={button} type="button" className="sim-hold" disabled={disabled} aria-label="连续长按1.5秒领取卡片" style={{ background: `conic-gradient(var(--primary) ${progress * 360}deg, var(--border) 0deg)` }}
    onPointerDown={e => { if (e.button !== 0 || held.current) return; e.preventDefault(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); begin() }}
    onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) cancel() }}
    onPointerUp={cancel} onPointerCancel={cancel} onLostPointerCapture={cancel} onBlur={cancel}
    onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) begin() } }}
    onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cancel() } }}>
    <span aria-hidden="true" />
  </button><div className="sim-claim-feedback"><span className="sim-hold-progress">按住领取 <strong>{Math.floor(progress * 100)}%</strong></span>{result}</div></>
}
