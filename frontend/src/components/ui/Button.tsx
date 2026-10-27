import { motion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'
import { spring } from '../../design/motion'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'soft' | 'secondary' | 'text'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant
  size?: Size
  /** Leading icon */
  icon?: ReactNode
  /** Stretch to fill the row */
  block?: boolean
  children?: ReactNode
}

const variants: Record<Variant, string> = {
  // One primary per view. Ink, never brand colour.
  primary: 'bg-graphite-900 text-white hover:bg-graphite-800',
  // "Hunch found this for you": switch to an offer, accept a suggestion.
  soft: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
  secondary: 'bg-graphite-50 text-graphite-900 hover:bg-graphite-100',
  text: 'text-graphite-600 hover:text-graphite-900',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5',
  md: 'h-11 px-[18px] text-label gap-2',
  lg: 'h-[52px] px-[22px] text-[15px] gap-2',
}

export function Button({ variant = 'primary', size = 'md', icon, block, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={spring.snappy}
      disabled={disabled}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap rounded-full font-medium transition-colors',
        sizes[size],
        disabled ? 'cursor-not-allowed bg-graphite-50 text-graphite-400' : variants[variant],
        variant === 'text' && 'px-2',
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </motion.button>
  )
}
