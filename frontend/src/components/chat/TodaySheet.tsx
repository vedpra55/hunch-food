import { motion } from 'motion/react'
import type { IconKey, RuleId } from '../../domain/types'
import { spring } from '../../design/motion'
import { cn } from '../../lib/cn'
import { BottomSheet } from './BottomSheet'
import { StageIcon } from './StageIcon'

export interface TodayRule {
  id: RuleId
  label: string
  icon: IconKey
  on: boolean
}

/** Today's situational rules, each with a switch. Changes last until midnight. */
export function TodaySheet({ open, rules, onToggle, onClose }: { open: boolean; rules: TodayRule[]; onToggle: (id: RuleId) => void; onClose: () => void }) {
  return (
    <BottomSheet open={open} title="Today" note="Switch something off for today. It comes back tomorrow." onClose={onClose}>
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
    </BottomSheet>
  )
}
