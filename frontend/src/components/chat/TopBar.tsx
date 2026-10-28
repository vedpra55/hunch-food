import { UserIcon } from '@phosphor-icons/react'
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
  /** The person's initial; a neutral icon until we know their name. */
  initial?: string
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
        className="mt-[14px] grid size-9 place-items-center rounded-full bg-white text-label font-semibold text-graphite-700 shadow-e1 transition-colors hover:bg-graphite-50"
      >
        {initial || <UserIcon size={17} />}
      </button>
      <div className="flex flex-col items-center">
        <Hunch mood={mood} size={64} look={[0, 0.45]} />
        {/* Status lives inside the name pill (like a contact's subtitle), so it never collides with the thread. */}
        <motion.div layout transition={{ duration: dur.base }} className="frost -mt-3 flex flex-col items-center rounded-[16px] px-3.5 py-1 shadow-e2" style={{ borderRadius: 16 }}>
          <motion.span layout="position" className="text-[13px] font-semibold leading-[18px]">
            Hunch
          </motion.span>
          <AnimatePresence mode="popLayout" initial={false}>
            {status && (
              <motion.span
                key={status}
                initial={{ opacity: 0, y: -3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 3 }}
                transition={{ duration: dur.base }}
                className={cn('whitespace-nowrap text-[12px] leading-4 text-graphite-500', working && 'text-shimmer')}
                role="status"
              >
                {status}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      <span />
    </div>
  )
}
