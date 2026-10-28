import { ArrowUpIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { dur, spring } from '../../design/motion'
import { cn } from '../../lib/cn'
import { IconButton } from './IconButton'
import { MicButton } from './MicButton'

export interface ComposerProps {
  listening?: boolean
  onMicToggle?: () => void
  onSubmit?: (text: string) => void
  placeholder?: string
  /** Shown while listening */
  listeningLabel?: string
  /** Live mic level 0…1. Omit to simulate. */
  voiceLevel?: number
  disabled?: boolean
  /** Hunch is answering: the button becomes Stop. Typing still works; sending waits. */
  working?: boolean
  onStop?: () => void
  className?: string
}

/** Voice first, typing second. The mic turns into Send once there is text. */
export function Composer({
  listening,
  onMicToggle,
  onSubmit,
  placeholder = 'Ask Hunch for anything…',
  listeningLabel = 'Sun raha hoon…',
  voiceLevel,
  disabled,
  working,
  onStop,
  className,
}: ComposerProps) {
  const [text, setText] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const t = text.trim()
    if (!t || disabled || working) return
    onSubmit?.(t)
    setText('')
  }

  return (
    <motion.form
      layout
      transition={spring.gentle}
      onSubmit={submit}
      className={cn(
        'flex min-h-[60px] items-center gap-2.5 rounded-full p-1.5 pl-[18px] transition-[background-color,box-shadow] duration-200',
        listening ? 'bg-white shadow-[0_0_0_4px_var(--color-indigo-50),0_0_0_5px_var(--color-indigo-200),var(--shadow-e2)]' : 'bg-graphite-50',
        className,
      )}
      style={{ borderRadius: 999 }}
    >
      {listening ? (
        <>
          <Waveform level={voiceLevel} className="min-w-0 flex-1" />
          <span lang="hi" className="whitespace-nowrap text-[13px] text-graphite-500">
            {listeningLabel}
          </span>
          <IconButton aria-label="Stop listening" variant="primary" onClick={onMicToggle} icon={<span className="size-3 rounded-[3px] bg-white" />} />
        </>
      ) : (
        <>
          <label htmlFor="composer-input" className="sr-only">
            Message Hunch
          </label>
          <input
            id="composer-input"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-graphite-900 outline-none placeholder:text-graphite-400"
          />
          <AnimatePresence mode="popLayout" initial={false}>
            {working ? (
              <motion.span key="stop" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={spring.snappy}>
                <IconButton aria-label="Stop" variant="primary" onClick={onStop} icon={<span className="size-3 rounded-[3px] bg-white" />} className="size-12" />
              </motion.span>
            ) : text.trim() ? (
              <motion.span key="send" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={spring.snappy}>
                <IconButton type="submit" aria-label="Send" variant="primary" icon={<ArrowUpIcon size={20} weight="bold" />} className="size-12" />
              </motion.span>
            ) : (
              <motion.span key="mic" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: dur.micro }}>
                <MicButton size={48} onClick={onMicToggle} />
              </motion.span>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.form>
  )
}

/** Live bars. Drives itself from `level`, or simulates speech. */
export function Waveform({ level, bars = 28, className }: { level?: number; bars?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const levelRef = useRef(level)
  useEffect(() => {
    levelRef.current = level
  }, [level])

  useEffect(() => {
    const el = ref.current!
    const kids = Array.from(el.children) as HTMLElement[]
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const loop = (now: number) => {
      const amp = levelRef.current ?? 0.5 + 0.5 * Math.abs(Math.sin(now / 470))
      kids.forEach((b, i) => {
        const h = 6 + 20 * amp * Math.abs(Math.sin(now / 180 + i * 0.7) * Math.sin(now / 470 + i * 0.3))
        b.style.height = `${h.toFixed(1)}px`
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div ref={ref} aria-hidden className={cn('flex h-7 items-center gap-[3px] overflow-hidden', className)}>
      {Array.from({ length: bars }, (_, i) => (
        <i key={i} className="block h-1.5 w-[3px] shrink-0 rounded-[2px] bg-indigo-400" />
      ))}
    </div>
  )
}
