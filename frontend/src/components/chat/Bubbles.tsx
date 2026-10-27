import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { emerge } from '../../design/motion'
import { cn } from '../../lib/cn'
import { Hunch } from '../hunch/Hunch'
import type { Mood } from '../hunch/moods'

/** Seconds between words as Hunch's voice types itself in. */
const WORD = 0.035

/** How long a line takes to appear; the component it introduces waits for it. */
const voiceDelay = (text: string) => Math.min(text.split(' ').length * WORD + 0.15, 1.1)

/**
 * The real Hunch beside its voice, small. The newest line carries Hunch's current mood; older ones rest.
 * The canvas is drawn larger than its slot because the body is ~60% of it (room for aura and hops).
 */
export function HunchMark({ mood = 'idle' }: { mood?: Mood }) {
  return (
    <span aria-hidden className="relative -my-1.5 -ml-2 size-10 shrink-0">
      <Hunch mood={mood} size={40} look={[0.4, 0.2]} />
    </span>
  )
}

/**
 * Hunch talking (HOME_SPEC §2): words on the page, no card. Things it hands over
 * (dishes, checkout, tracking) are separate components below.
 */
export function HunchVoice({ text, mood, mascot = true, className }: { text: string; mood?: Mood; mascot?: boolean; className?: string }) {
  const words = text.split(' ')
  return (
    <div className={cn('flex gap-1.5 self-stretch pr-4', className)}>
      {mascot && <HunchMark mood={mood} />}
      <p aria-label={text} className="text-[20px] font-medium leading-7 tracking-[-0.012em] text-pretty text-graphite-900">
        {words.map((w, i) => (
          <motion.span
            key={i}
            aria-hidden
            initial={{ opacity: 0, y: 4, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: i * WORD, duration: 0.28 }}
            className="inline-block whitespace-pre"
          >
            {i < words.length - 1 ? `${w} ` : w}
          </motion.span>
        ))}
      </p>
    </div>
  )
}

/** One Hunch turn: its voice, then the thing it's handing over once the words have landed. */
export function Turn({ text, mood, mascot, children }: { text?: string; mood?: Mood; mascot?: boolean; children?: ReactNode }) {
  return (
    <div className="grid gap-3">
      {text && <HunchVoice text={text} mood={mood} mascot={mascot} />}
      {children && (
        <motion.div initial="hidden" animate="shown" variants={emerge} transition={{ delay: text ? voiceDelay(text) : 0 }} style={{ transformOrigin: '50% 0%' }}>
          {children}
        </motion.div>
      )}
    </div>
  )
}

/** The user speaks: ink bubble on the right. */
export function UserSays({ children }: { children: ReactNode }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      style={{ transformOrigin: '100% 100%' }}
      className="max-w-[80%] self-end rounded-[20px_20px_6px_20px] bg-graphite-900 px-4 py-2.5 text-[15px] leading-[22px] text-white"
    >
      {children}
    </motion.p>
  )
}

/** Hunch is thinking: its mark and three dots where the words will appear. */
export function Typing({ mascot = true }: { mascot?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex h-7 items-start gap-1.5 self-start" aria-label="Hunch is typing">
      {mascot && <HunchMark mood="thinking" />}
      <span className="mt-[11px] flex gap-1">
        {[0, 1, 2].map(i => (
          <motion.i
            key={i}
            className="block size-1.5 rounded-full bg-graphite-400"
            animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </span>
    </motion.div>
  )
}

/** Wraps a card Hunch generated so it grows out of the conversation. */
export function Emerge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div initial="hidden" animate="shown" variants={emerge} style={{ transformOrigin: '50% 0%' }} className={className}>
      {children}
    </motion.div>
  )
}
