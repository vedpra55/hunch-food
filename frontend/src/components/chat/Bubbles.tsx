import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { emerge } from '../../design/motion'
import { cn } from '../../lib/cn'

/** Hunch speaks: white bubble on the left. */
export function HunchSays({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.p
      initial="hidden"
      animate="shown"
      variants={emerge}
      style={{ transformOrigin: '0% 0%' }}
      className={cn('max-w-[86%] self-start rounded-[20px_20px_20px_6px] bg-white px-4 py-2.5 text-[15px] leading-[22px] text-graphite-900 shadow-e1', className)}
    >
      {children}
    </motion.p>
  )
}

/** The user speaks: ink bubble on the right. */
export function UserSays({ children }: { children: ReactNode }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      style={{ transformOrigin: '100% 100%' }}
      className="max-w-[80%] self-end rounded-[20px_20px_6px_20px] bg-graphite-900 px-4 py-2.5 text-[15px] leading-[22px] text-white"
    >
      {children}
    </motion.p>
  )
}

/** Hunch is typing. */
export function Typing() {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex h-10 w-16 items-center justify-center gap-1 self-start rounded-[20px_20px_20px_6px] bg-white shadow-e1" aria-label="Hunch is typing">
      {[0, 1, 2].map(i => (
        <motion.i
          key={i}
          className="block size-1.5 rounded-full bg-graphite-400"
          animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </motion.div>
  )
}

/** Wraps a card Hunch generated so it grows out of the conversation. */
export function Emerge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div initial="hidden" animate="shown" variants={emerge} style={{ transformOrigin: '50% 0%' }} className={className}>
      {children}
    </motion.div>
  )
}
