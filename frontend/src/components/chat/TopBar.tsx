import { AnimatePresence, motion } from 'motion/react'
import { dur } from '../../design/motion'
import { cn } from '../../lib/cn'
import { Hunch } from '../hunch/Hunch'
import type { Mood } from '../hunch/moods'

export interface TopBarProps {
  mood: Mood
  /** Shown under the name only while Hunch is working, e.g. "Checking 14 kitchens…" */
  status?: string
  /** Animate the status as "thinking" */
  working?: boolean
  initial: string
  onProfile?: () => void
}

/** Profile on the left, Hunch in the centre, right slot left empty on purpose. */
export function TopBar({ mood, status, working, initial, onProfile }: TopBarProps) {
  return (
    <div className="grid w-full grid-cols-[44px_1fr_44px] items-start">
      <button
        type="button"
        onClick={onProfile}
        aria-label="Profile and settings"
        className="mt-3 grid size-9 place-items-center rounded-full bg-white text-label font-semibold text-graphite-700 shadow-e1 transition-colors hover:bg-graphite-50"
      >
        {initial}
      </button>
      <div className="flex flex-col items-center">
        <Hunch mood={mood} size={64} look={[0, 0.45]} />
        <span className="frost -mt-3 rounded-full px-3.5 py-1 text-[13px] font-semibold shadow-e2">Hunch</span>
        <div className="h-5 pt-1">
          <AnimatePresence mode="wait" initial={false}>
            {status && (
              <motion.span
                key={status}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: dur.base }}
                className={cn('block text-caption font-normal text-graphite-500', working && 'text-shimmer')}
                role="status"
              >
                {status}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
      <span />
    </div>
  )
}
