import { SparkleIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { spring } from '../../design/motion'
import { cn } from '../../lib/cn'

type ChipVariant = 'thought' | 'context' | 'filter' | 'brand'

export interface ChipProps {
  /**
   * thought: why Hunch picked something (max 3 per answer)
   * context: time · weather · area, no fill
   * filter: toggleable preference
   * brand: something Hunch found for you (offer, saving)
   */
  variant?: ChipVariant
  icon?: ReactNode
  selected?: boolean
  onClick?: () => void
  children: ReactNode
  className?: string
}

const styles: Record<ChipVariant, string> = {
  thought: 'h-8 px-3 bg-graphite-50 text-graphite-700',
  context: 'text-graphite-500',
  filter: 'h-8 px-3 bg-graphite-50 text-graphite-700 hover:bg-graphite-100',
  brand: 'h-8 px-3 bg-indigo-50 text-indigo-700',
}

export function Chip({ variant = 'thought', icon, selected, onClick, children, className }: ChipProps) {
  const lead = icon ?? (variant === 'thought' ? <SparkleIcon size={16} weight="fill" className="text-indigo-500" /> : null)
  const cls = cn(
    'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full text-[13px] font-medium leading-none transition-colors',
    styles[variant],
    variant === 'filter' && selected && 'bg-graphite-900 text-white hover:bg-graphite-800',
    className,
  )
  if (!onClick) {
    return (
      <span className={cls}>
        {lead}
        {children}
      </span>
    )
  }
  return (
    <motion.button type="button" onClick={onClick} aria-pressed={variant === 'filter' ? !!selected : undefined} whileTap={{ scale: 0.95 }} transition={spring.snappy} className={cls}>
      {lead}
      {children}
    </motion.button>
  )
}
