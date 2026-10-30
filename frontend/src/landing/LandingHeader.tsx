import { useState } from 'react'
import { motion, useScroll, useMotionValueEvent, useReducedMotion } from 'motion/react'
import { easeOut, quick } from './motion'

interface LandingHeaderProps {
  onStartApp: () => void
}

export function LandingHeader({ onStartApp }: LandingHeaderProps) {
  const { scrollY } = useScroll()
  const [isFrosted, setIsFrosted] = useState(false)
  const [isHidden, setIsHidden] = useState(false)
  const [isOpenAppHovered, setIsOpenAppHovered] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const prev = scrollY.getPrevious() ?? 0
    const diff = latest - prev

    // Frosted after 24px of scroll
    setIsFrosted(latest > 24)

    // Scroll down hides, scroll up shows (with 6px threshold)
    if (diff > 6 && latest > 100) {
      setIsHidden(true)
    } else if (diff < -6) {
      setIsHidden(false)
    }
  })

  return (
    <motion.header
      initial={{ y: 0 }}
      animate={{ y: isHidden && !shouldReduceMotion ? '-100%' : '0%' }}
      transition={quick}
      className={`sticky top-0 z-50 w-full transition-[background-color,border-color,backdrop-filter] duration-250 ${
        isFrosted
          ? 'bg-white/75 backdrop-blur-md border-b border-black/[0.06]'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="w-full max-w-6xl mx-auto px-6 sm:px-10 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onStartApp}
          className="text-[17px] font-semibold tracking-[-0.02em] text-[#111317] hover:opacity-75 transition-opacity cursor-pointer"
        >
          Hunch
        </button>

        <button
          type="button"
          onClick={onStartApp}
          onMouseEnter={() => setIsOpenAppHovered(true)}
          onMouseLeave={() => setIsOpenAppHovered(false)}
          className="relative text-[14px] font-medium text-[#68707C] hover:text-[#111317] transition-colors inline-flex items-center gap-1 cursor-pointer py-1"
        >
          <span>Open app</span>
          <span className="text-xs">↗</span>

          {/* Underline growing left-to-right on hover */}
          <motion.span
            className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#111317] origin-left pointer-events-none"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: isOpenAppHovered ? 1 : 0 }}
            transition={{ duration: 0.3, ease: easeOut }}
          />
        </button>
      </div>
    </motion.header>
  )
}
