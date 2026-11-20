import { siteConfig } from '@/lib/config'
import { useEffect, useRef, useState } from 'react'

const FRAME_WIDTH = 144
const FRAME_HEIGHT = 156
const LOOK_DIRECTIONS = 16
const DIRECTION_ANGLE = 2 * Math.PI / LOOK_DIRECTIONS
const DIRECTION_HYSTERESIS = Math.PI / 72
const actions = [
  { row: 3, count: 4, interval: 145 },
  { row: 4, count: 5, interval: 115 }
]

export default function DeepSeekPet() {
  const spriteRef = useRef(null)
  const timerRef = useRef(null)
  const nextAction = useRef(0)
  const pointerRef = useRef(null)
  const directionRef = useRef(null)
  const [action, setAction] = useState(null)
  const showPet = JSON.parse(siteConfig('WIDGET_PET'))

  useEffect(() => () => clearTimeout(timerRef.current), [])

  useEffect(() => {
    const sprite = spriteRef.current
    if (!showPet || !sprite) return

    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    function updateLook() {
      const pointer = pointerRef.current
      if (!pointer || action || motionPreference.matches) {
        if (sprite.hasAttribute('data-looking')) delete sprite.dataset.looking
        directionRef.current = null
        return
      }

      const bounds = sprite.getBoundingClientRect()
      if (!bounds.width || !bounds.height) return

      const x = pointer.x - (bounds.left + bounds.width / 2)
      const y = pointer.y - (bounds.top + bounds.height * 0.37)
      if (Math.hypot(x, y) < 12) return

      const angle = Math.atan2(x, -y)
      const previous = directionRef.current
      if (previous !== null) {
        const delta = angle - previous * DIRECTION_ANGLE
        const distance = Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta)))
        if (distance <= DIRECTION_ANGLE / 2 + DIRECTION_HYSTERESIS) return
      }

      const direction = (Math.round(angle / DIRECTION_ANGLE) + LOOK_DIRECTIONS) % LOOK_DIRECTIONS
      directionRef.current = direction
      const left = -(direction % 8) * FRAME_WIDTH
      const top = -(9 + Math.floor(direction / 8)) * FRAME_HEIGHT
      sprite.style.setProperty('--look-position', `${left}px ${top}px`)
      sprite.dataset.looking = 'true'
    }

    function followPointer(event) {
      if (event.pointerType !== 'mouse') return

      pointerRef.current = { x: event.clientX, y: event.clientY }
      updateLook()
    }

    function stopLooking() {
      pointerRef.current = null
      updateLook()
    }

    updateLook()
    window.addEventListener('pointermove', followPointer, { passive: true })
    document.documentElement.addEventListener('pointerleave', stopLooking)
    window.addEventListener('blur', stopLooking)
    window.addEventListener('scroll', updateLook, { passive: true })
    window.addEventListener('resize', updateLook)
    motionPreference.addEventListener('change', updateLook)

    return () => {
      window.removeEventListener('pointermove', followPointer)
      document.documentElement.removeEventListener('pointerleave', stopLooking)
      window.removeEventListener('blur', stopLooking)
      window.removeEventListener('scroll', updateLook)
      window.removeEventListener('resize', updateLook)
      motionPreference.removeEventListener('change', updateLook)
    }
  }, [action, showPet])

  if (!showPet) return null

  function greet() {
    if (action) return

    delete spriteRef.current.dataset.looking
    const motion = actions[nextAction.current]
    nextAction.current = (nextAction.current + 1) % actions.length
    setAction(motion)
    timerRef.current = setTimeout(() => setAction(null), motion.count * motion.interval)
  }

  return (
    <button
      type='button'
      className='simple-pet'
      data-liquid-glass-ignore
      aria-label='和 DeepSeek娘互动'
      title='点击挥手或跳跃'
      onClick={greet}>
      <span
        ref={spriteRef}
        aria-hidden='true'
        className='simple-pet-sprite'
        data-action={action ? 'true' : undefined}
        style={action ? {
          '--action-y': `${-action.row * FRAME_HEIGHT}px`,
          '--action-end': `${-(action.count - 1) * FRAME_WIDTH}px`,
          '--action-steps': action.count,
          '--action-duration': `${action.count * action.interval}ms`
        } : undefined}
      />
    </button>
  )
}
