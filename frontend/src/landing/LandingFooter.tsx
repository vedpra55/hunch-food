import { motion, useReducedMotion } from 'motion/react'
import { reveal, stagger } from './motion'

export function LandingFooter() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <footer className="w-full max-w-5xl mx-auto px-6 sm:px-10 py-12 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8C94A6] font-mono gap-4 border-t border-[#F2F4F8]">
      {/* Brand & City */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={reveal}
        className="flex items-center gap-2"
      >
        <span className="font-semibold text-[#111317]">Hunch</span>

        {/* Separator fades in after the words */}
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.15 }}
          className="text-[#C4CAD8]"
        >
          ·
        </motion.span>

        <span>Bangalore</span>
      </motion.div>

      {/* Tagline */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ ...reveal, delay: shouldReduceMotion ? 0 : stagger.sibling }}
        className="flex items-center gap-2"
      >
        <span>Zero menus</span>
        <motion.span
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 0.25 }}
          className="text-[#C4CAD8]"
        >
          ·
        </motion.span>
        <span>One decision, done</span>
      </motion.div>
    </footer>
  )
}
