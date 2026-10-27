import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { emerge } from '../../design/motion'
import { cn } from '../../lib/cn'

/** Seconds between words as Hunch's voice types itself in. */
const WORD = 0.035

/** How long a line takes to appear; the component it introduces waits for it. */
const voiceDelay = (text: string) => Math.min(text.split(' ').length * WORD + 0.15, 1.1)

/** Hunch's mark beside its voice. The newest line breathes; older ones rest. */
export function HunchMark({ live }: { live?: boolean }) {
  return (
    <motion.span
      aria-hidden
      className="bg-orb mt-[5px] size-[18px] shrink-0 rounded-full shadow-[0_2px_6px_rgb(88_114_245/0.35)]"
      animate={live ? { scale: [1, 1.14, 1] } : { scale: 1 }}
      transition={live ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : undefined}
    />
  )
}

/**
 * Hunch talking (HOME_SPEC §2): words on the page, no card. Things it hands over
 * (dishes, checkout, tracking) are separate components below.
 */
export function HunchVoice({ text, live, className }: { text: string; live?: boolean; className?: string }) {
  const words = text.split(' ')
  return (
    <div className={cn('flex gap-2.5 self-stretch pr-4', className)}>
      <HunchMark live={live} />
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
export function Turn({ text, live, children }: { text?: string; live?: boolean; children?: ReactNode }) {
  return (
    <div className="grid gap-3">
      {text && <HunchVoice text={text} live={live} />}
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
export function Typing() {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex h-7 items-start gap-2.5 self-start" aria-label="Hunch is typing">
      <HunchMark live />
      <span className="mt-[5px] flex gap-1">
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
