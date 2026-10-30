import { useState, useRef } from 'react'
import { motion, useSpring, useReducedMotion } from 'motion/react'
import { spring, easeOut } from './motion'
import { Reveal } from './Reveal'

interface CtaSectionProps {
  onStartApp: () => void
}

export function CtaSection({ onStartApp }: CtaSectionProps) {
  const shouldReduceMotion = useReducedMotion()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isFadingOut, setIsFadingOut] = useState(false)

  // Magnetic button spring displacement (up to 6px)
  const magneticX = useSpring(0, { stiffness: 220, damping: 18 })
  const magneticY = useSpring(0, { stiffness: 220, damping: 18 })

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (shouldReduceMotion) return
    const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (!hasFinePointer || !buttonRef.current) return

    const rect = buttonRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const dx = e.clientX - centerX
    const dy = e.clientY - centerY

    const maxDistance = 6
    const factor = 0.25
    magneticX.set(Math.max(-maxDistance, Math.min(maxDistance, dx * factor)))
    magneticY.set(Math.max(-maxDistance, Math.min(maxDistance, dy * factor)))
  }

  const handlePointerLeave = () => {
    setIsHovered(false)
    magneticX.set(0)
    magneticY.set(0)
  }

  const handleClick = () => {
    if (shouldReduceMotion) {
      onStartApp()
      return
    }
    // Fade page to white over 0.25s before routing to /app
    setIsFadingOut(true)
    setTimeout(() => {
      onStartApp()
    }, 250)
  }

  return (
    <section className="relative w-full bg-white py-24 sm:py-32 text-center flex flex-col items-center overflow-hidden">
      {/* Peeking Mini Orb behind Heading */}
      <div className="relative mb-3 flex flex-col items-center">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { y: 40, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={spring.orb}
          className="size-9 rounded-full hunch-orb flex items-center justify-center relative z-0"
        >
          {/* Eyes with top-left white catchlights */}
          <span className="orb-eyes flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-2 bg-[#23252E] rounded-full relative">
              <span className="size-0.5 bg-white rounded-full absolute top-0.5 left-0.5" />
            </span>
            <span className="w-1.5 h-2 bg-[#23252E] rounded-full relative">
              <span className="size-0.5 bg-white rounded-full absolute top-0.5 left-0.5" />
            </span>
          </span>
        </motion.div>
      </div>

      {/* Heading */}
      <Reveal withBlur delay={0}>
        <h3 className="text-3xl sm:text-4xl font-semibold tracking-[-0.035em] text-[#111317]">
          Hungry yet?
        </h3>
      </Reveal>

      <Reveal withBlur delay={0.08}>
        <p className="mt-2.5 text-base sm:text-[17px] text-[#687082] max-w-md">
          One tap to your best meal tonight. No download required.
        </p>
      </Reveal>

      {/* Magnetic Primary Button with Shine Sweep */}
      <div className="mt-7 sm:mt-8">
        <motion.button
          ref={buttonRef}
          type="button"
          onClick={handleClick}
          onPointerMove={handlePointerMove}
          onPointerEnter={() => setIsHovered(true)}
          onPointerLeave={handlePointerLeave}
          style={{
            x: shouldReduceMotion ? 0 : magneticX,
            y: shouldReduceMotion ? 0 : magneticY,
          }}
          whileTap={{ scale: 0.97 }}
          className="relative inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-[#141519] text-white text-[15px] font-medium tracking-[-0.01em] cursor-pointer overflow-hidden select-none"
        >
          {/* Light Shine Sweep across Button on Hover */}
          <motion.span
            initial={{ x: '-100%' }}
            animate={isHovered && !shouldReduceMotion ? { x: '100%' } : { x: '-100%' }}
            transition={{ duration: 0.8, ease: easeOut }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
          />

          <span className="relative z-10">Try Hunch now</span>
          <span className="relative z-10 text-white/70 text-sm">→</span>
        </motion.button>
      </div>

      {/* Smooth White Dissolve Hand-off Overlay on Click */}
      {isFadingOut && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: easeOut }}
          className="fixed inset-0 z-[100] bg-white pointer-events-none"
        />
      )}
    </section>
  )
}
