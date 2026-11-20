import { useEffect, useRef } from 'react'

// Upstream: KaedeharaKazuha1029/web-liquid-glass, AGPL-3.0-or-later.
// Revision: 397722ad096e50fe42c8fdd8782cd3f74ab37b35

export default function useLiquidGlassNavigation(isDarkMode, backgroundOnly = false) {
  const navRef = useRef(null)
  const canvasRef = useRef(null)
  const glassRef = useRef(null)

  useEffect(() => {
    const nav = navRef.current
    const canvas = canvasRef.current
    const sceneRoot = nav.closest('#theme-simple')
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let generation = 0

    function stop() {
      generation += 1
      delete nav.dataset.opticalGlass
      glassRef.current?.dispose()
      glassRef.current = null
    }

    async function start() {
      const attempt = ++generation
      try {
        const { LiquidGlassNavigation } = await import('@/lib/web-liquid-glass/liquid-glass-navigation')
        if (attempt !== generation || motion.matches) return

        canvas.hidden = false
        const glass = new LiquidGlassNavigation({
          navElement: nav,
          canvas,
          sceneRoot,
          ...(backgroundOnly && {
            // Keep the optical canvas out of the switch's drag and tap handling.
            pointerElement: canvas,
            autoLabelContrast: false
          }),
          onError: () => { delete nav.dataset.opticalGlass }
        })
        glassRef.current = glass
        if (!glass.start()) {
          stop()
          return
        }

        nav.dataset.opticalGlass = 'true'
      } catch {
        if (attempt === generation) stop()
      }
    }

    function syncMotion() {
      if (motion.matches) stop()
      else void start()
    }

    canvas.addEventListener('webglcontextlost', stop)
    motion.addEventListener('change', syncMotion)
    syncMotion()
    return () => {
      canvas.removeEventListener('webglcontextlost', stop)
      motion.removeEventListener('change', syncMotion)
      stop()
    }
  }, [backgroundOnly])

  useEffect(() => {
    glassRef.current?.refreshScene()
  }, [isDarkMode])

  return { navRef, canvasRef }
}
