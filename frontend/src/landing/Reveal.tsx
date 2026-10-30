import { motion, useReducedMotion } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'
import { reveal, REVEAL_Y, stagger } from './motion'

interface RevealProps {
  children: ReactNode
  withBlur?: boolean
  delay?: number
  className?: string
  style?: CSSProperties
  amount?: number
}

export function Reveal({
  children,
  withBlur = false,
  delay = 0,
  className = '',
  style,
  amount = 0.3,
}: RevealProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount }}
        transition={{ duration: 0.2, delay }}
        className={className}
        style={style}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: REVEAL_Y,
        filter: withBlur ? 'blur(6px)' : 'none',
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
      }}
      viewport={{ once: true, amount }}
      transition={{
        ...reveal,
        delay,
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}

interface RevealGroupProps {
  children: ReactNode
  staggerDelay?: number
  className?: string
  style?: CSSProperties
  amount?: number
}

export function RevealGroup({
  children,
  staggerDelay = stagger.sibling,
  className = '',
  style,
  amount = 0.3,
}: RevealGroupProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: shouldReduceMotion ? 0 : staggerDelay,
          },
        },
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}

export function RevealItem({
  children,
  withBlur = false,
  className = '',
  style,
}: {
  children: ReactNode
  withBlur?: boolean
  className?: string
  style?: CSSProperties
}) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      variants={{
        hidden: shouldReduceMotion
          ? { opacity: 0, y: 0, filter: 'none' }
          : {
              opacity: 0,
              y: REVEAL_Y,
              filter: withBlur ? 'blur(6px)' : 'none',
            },
        show: {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          transition: shouldReduceMotion ? { duration: 0.2 } : reveal,
        },
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}
