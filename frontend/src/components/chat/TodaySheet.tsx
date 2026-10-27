import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import type { IconKey, RuleId } from '../../domain/types'
import { spring } from '../../design/motion'
import { cn } from '../../lib/cn'
import { StageIcon } from './StageIcon'

export interface TodayRule {
  id: RuleId
  label: string
  icon: IconKey
  on: boolean
}

/** Today's situational rules, each with a switch. Changes last until midnight. */
export function TodaySheet({ open, rules, onToggle, onClose }: { open: boolean; rules: TodayRule[]; onToggle: (id: RuleId) => void; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="scrim" className="fixed inset-0 z-40 bg-graphite-900/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="today-title"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={spring.gentle}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto grid w-full max-w-[600px] gap-4 rounded-t-[28px] bg-white px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-3 shadow-e3"
          >
            <span className="mx-auto h-1 w-10 rounded-full bg-graphite-200" aria-hidden />
            <div className="grid gap-1">
              <h2 id="today-title" className="text-heading">
                Today
              </h2>
              <p className="text-label font-normal text-graphite-500">Switch something off for today. It comes back tomorrow.</p>
            </div>
            <ul className="grid gap-1">
              {rules.map(r => (
                <li key={r.id}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={r.on}
                    onClick={() => onToggle(r.id)}
                    className="-mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-[14px] px-2 py-2.5 text-left hover:bg-graphite-50"
                  >
                    <span className="grid size-9 place-items-center rounded-full bg-graphite-50 text-graphite-700">
                      <StageIcon icon={r.icon} size={18} />
                    </span>
                    <span className="flex-1 text-[15px]">{r.label}</span>
                    <span className={cn('relative h-7 w-12 rounded-full transition-colors', r.on ? 'bg-graphite-900' : 'bg-graphite-200')}>
                      <motion.span layout transition={spring.snappy} className={cn('absolute top-1 size-5 rounded-full bg-white shadow-e1', r.on ? 'right-1' : 'left-1')} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
