import { useEffect, useRef } from 'react'
import { cn } from '../../lib/cn'
import { HunchEngine, type LookMode } from './engine'
import { MOODS, type Mood } from './moods'

export interface HunchProps {
  mood?: Mood
  /** Rendered size in px (square). The body is ~60% of this; the rest is room for aura and hops. */
  size?: number
  /** 'pointer' follows the cursor/finger, 'drift' wanders gently, or a fixed [x, y] gaze in −1…1. Moods with their own gaze win. */
  look?: LookMode
  /** Live mic level 0…1 while listening. Omit to simulate. */
  voiceLevel?: number
  /** Tapping Hunch makes it hop. */
  interactive?: boolean
  className?: string
}

export function Hunch({ mood = 'idle', size = 48, look = 'drift', voiceLevel, interactive, className }: HunchProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const engine = useRef<HunchEngine | null>(null)
  // The engine is created once with these; later prop changes are pushed in below.
  const initial = useRef({ size, mood })

  useEffect(() => {
    const canvas = ref.current!
    const e = new HunchEngine(canvas, initial.current.size, initial.current.mood)
    engine.current = e
    const io = new IntersectionObserver(([entry]) => (e.visible = entry.isIntersecting))
    io.observe(canvas)
    return () => {
      io.disconnect()
      e.destroy()
      engine.current = null
    }
  }, [])

  useEffect(() => engine.current?.setMood(mood), [mood])
  useEffect(() => engine.current?.resize(size), [size])
  useEffect(() => {
    if (engine.current) engine.current.look = look
  }, [look])
  useEffect(() => {
    if (engine.current) engine.current.voice = voiceLevel ?? null
  }, [voiceLevel])

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={`Hunch, ${MOODS[mood].label.toLowerCase()}`}
      onPointerDown={interactive ? () => engine.current?.nudge() : undefined}
      className={cn('block shrink-0 select-none', interactive && 'cursor-pointer touch-none', className)}
      style={{ width: size, height: size }}
    />
  )
}
