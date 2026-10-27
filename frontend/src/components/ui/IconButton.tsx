import { motion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'
import { spring } from '../../design/motion'
import { cn } from '../../lib/cn'

export interface IconButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  /** Required: icon-only buttons need a spoken name */
  'aria-label': string
  icon: ReactNode
  variant?: 'secondary' | 'primary' | 'ghost'
  size?: 'sm' | 'md'
}

export function IconButton({ icon, variant = 'secondary', size = 'md', className, ...rest }: IconButtonProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      transition={spring.snappy}
      className={cn(
        'grid shrink-0 place-items-center rounded-full transition-colors',
        size === 'md' ? 'size-11' : 'size-9',
        variant === 'secondary' && 'bg-graphite-50 text-graphite-700 hover:bg-graphite-100',
        variant === 'primary' && 'bg-graphite-900 text-white hover:bg-graphite-800',
        variant === 'ghost' && 'text-graphite-600 hover:bg-graphite-50',
        className,
      )}
      {...rest}
    >
      {icon}
    </motion.button>
  )
}
