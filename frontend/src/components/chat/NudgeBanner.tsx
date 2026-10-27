import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { spring } from '../../design/motion'

/**
 * The proactive moment arrives as a notification (HOME_SPEC §7). In the app it drops in once,
 * says one thing, and leaves on its own; tapping it just dismisses it, the Today card already has the offer.
 */
export function NudgeBanner({ text, onDismiss }: { text?: string; onDismiss: () => void }) {
  useEffect(() => {
    if (!text) return
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [text, onDismiss])

  return (
    <AnimatePresence>
      {text && (
        <motion.button
          key="banner"
          type="button"
          onClick={onDismiss}
          initial={{ y: -96, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -96, opacity: 0 }}
          transition={spring.gentle}
          role="status"
          className="frost fixed inset-x-3 top-[max(10px,env(safe-area-inset-top))] z-[46] mx-auto flex max-w-[420px] items-center gap-3 rounded-[22px] px-3.5 py-3 text-left shadow-e3"
        >
          <span aria-hidden className="bg-orb size-9 shrink-0 rounded-full" />
          <span className="grid min-w-0">
            <span className="flex items-baseline gap-2 text-[13px] font-semibold">
              Hunch <span className="text-[12px] font-normal text-graphite-500">now</span>
            </span>
            <span className="text-[14px] leading-5 text-graphite-800">{text}</span>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
