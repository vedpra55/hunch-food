import { MicrophoneIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { spring } from '../../design/motion'
import { cn } from '../../lib/cn'

export interface MicButtonProps {
  listening?: boolean
  onClick?: () => void
  /** px, default 56 */
  size?: number
  className?: string
}

/** The main input. Uses the `orb` gradient, the only place besides Hunch that may. */
export function MicButton({ listening, onClick, size = 56, className }: MicButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={listening}
      aria-label={listening ? 'Stop listening' : 'Speak to Hunch'}
      whileTap={{ scale: 0.92 }}
      transition={spring.snappy}
      className={cn('relative grid shrink-0 place-items-center rounded-full bg-orb text-graphite-800 shadow-orb', className)}
      style={{ width: size, height: size }}
    >
      {listening && (
        <>
          <span aria-hidden className="absolute -inset-1.5 animate-ring rounded-full ring-2 ring-indigo-200" />
          <span aria-hidden className="absolute -inset-1.5 animate-ring rounded-full ring-2 ring-indigo-200 [animation-delay:.9s]" />
        </>
      )}
      <MicrophoneIcon size={Math.round(size * 0.4)} />
    </motion.button>
  )
}
