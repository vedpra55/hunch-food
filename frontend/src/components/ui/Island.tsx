import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { dur, spring } from '../../design/motion'
import { cn } from '../../lib/cn'
import { Hunch } from '../hunch/Hunch'
import type { LookMode } from '../hunch/engine'
import type { Mood } from '../hunch/moods'

export interface IslandProps {
  mood: Mood
  /** What Hunch is saying. Omit to collapse to just Hunch. */
  message?: ReactNode
  /** Animate the message as "thinking" */
  shimmer?: boolean
  look?: LookMode
  voiceLevel?: number
  className?: string
}

/** Hunch's home at the top centre of every screen. Expands to speak. */
export function Island({ mood, message, shimmer, look = [0, 0.5], voiceLevel, className }: IslandProps) {
  return (
    <motion.div
      layout
      transition={spring.gentle}
      role="status"
      aria-live="polite"
      className={cn('frost inline-flex min-h-12 max-w-full items-center rounded-full p-0.5 shadow-e3', message ? 'pr-[18px]' : '', className)}
      style={{ borderRadius: 999 }}
    >
      <motion.span layout="position" className="shrink-0">
        <Hunch mood={mood} size={44} look={look} voiceLevel={voiceLevel} />
      </motion.span>
      <AnimatePresence mode="popLayout" initial={false}>
        {message && (
          <motion.span
            key={typeof message === 'string' ? message : 'msg'}
            layout="position"
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(4px)' }}
            transition={{ duration: dur.base }}
            className={cn('ml-1.5 min-w-0 truncate text-label', shimmer && 'text-shimmer')}
          >
            {message}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
