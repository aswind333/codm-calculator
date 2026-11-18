import { useLayoutEffect } from 'react'

/** Keep CSS rotation in visual-viewport coordinates, without remounting the draw. */
export function useSimulationViewport(active: boolean) {
  useLayoutEffect(() => {
    if (!active) return
    const shell = document.getElementById('simulator-main')?.closest<HTMLElement>('.app-shell')
    if (!shell) return
    const viewport = window.visualViewport
    const properties = ['--sim-view-width', '--sim-view-height', '--sim-view-left', '--sim-view-top']
    const previous = properties.map(name => shell.style.getPropertyValue(name))
    const sync = () => {
      const width = viewport && viewport.width > 0 ? viewport.width : window.innerWidth
      const height = viewport && viewport.height > 0 ? viewport.height : window.innerHeight
      const values = [width, height, viewport?.offsetLeft ?? 0, viewport?.offsetTop ?? 0]
      properties.forEach((name, index) => shell.style.setProperty(name, `${values[index]}px`))
    }
    sync()
    window.addEventListener('resize', sync)
    viewport?.addEventListener('resize', sync)
    viewport?.addEventListener('scroll', sync)
    return () => {
      window.removeEventListener('resize', sync)
      viewport?.removeEventListener('resize', sync)
      viewport?.removeEventListener('scroll', sync)
      properties.forEach((name, index) => previous[index] ? shell.style.setProperty(name, previous[index]) : shell.style.removeProperty(name))
    }
  }, [active])
}
