import { CheckIcon, PlusIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import type { IconKey } from '../../domain/types'
import { spring } from '../../design/motion'
import { cn } from '../../lib/cn'
import { StageIcon } from './StageIcon'

/** The shared shell for small sheets: scrim, handle, title, Escape to close. */
export function BottomSheet({ open, title, note, onClose, children }: { open: boolean; title: string; note?: string; onClose: () => void; children: ReactNode }) {
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
            aria-label={title}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={spring.gentle}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] w-full max-w-[600px] flex-col gap-4 overflow-y-auto rounded-t-[28px] bg-white px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-3 shadow-e3 [&>*]:shrink-0"
          >
            <span className="mx-auto h-1 w-10 rounded-full bg-graphite-200" aria-hidden />
            <div className="grid gap-1">
              <h2 className="text-heading">{title}</h2>
              {note && <p className="text-label font-normal text-graphite-500">{note}</p>}
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export interface Option {
  id: string
  icon?: IconKey
  label: string
  detail?: string
  /** Shown instead of the detail when the option can't be picked, e.g. a kitchen doesn't reach it */
  warning?: string
}

/** A quiet "add another" row under a list. */
export function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="-mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-[14px] px-2 py-2.5 text-left text-indigo-600 hover:bg-indigo-50">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-indigo-50">
        <PlusIcon size={18} />
      </span>
      <span className="text-[15px] font-medium">{label}</span>
    </button>
  )
}

/** Pick one: saved addresses, payment methods. */
export function OptionsSheet({ open, title, note, options, selected, onPick, onClose, footer }: { open: boolean; title: string; note?: string; options: Option[]; selected: string; onPick: (id: string) => void; onClose: () => void; footer?: ReactNode }) {
  return (
    <BottomSheet open={open} title={title} note={note} onClose={onClose}>
      <ul className="grid gap-1" role="radiogroup" aria-label={title}>
        {options.map(o => (
          <li key={o.id}>
            <button
              type="button"
              role="radio"
              aria-checked={o.id === selected}
              onClick={() => onPick(o.id)}
              className="-mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-[14px] px-2 py-2.5 text-left hover:bg-graphite-50"
            >
              {o.icon && (
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-graphite-50 text-graphite-700">
                  <StageIcon icon={o.icon} size={18} />
                </span>
              )}
              <span className="grid min-w-0 flex-1">
                <span className="text-[15px]">{o.label}</span>
                {(o.warning ?? o.detail) && <span className={cn('truncate text-[13px]', o.warning ? 'text-error' : 'text-graphite-500')}>{o.warning ?? o.detail}</span>}
              </span>
              {o.id === selected && <CheckIcon size={18} weight="bold" className="text-graphite-900" />}
            </button>
          </li>
        ))}
      </ul>
      {footer}
    </BottomSheet>
  )
}
