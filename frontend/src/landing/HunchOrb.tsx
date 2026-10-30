import { useState, useEffect, useRef } from 'react'
import { motion, useSpring, useTransform, useScroll, useReducedMotion } from 'motion/react'
import { spring, easeOut } from './motion'

interface HunchOrbProps {
  isTargetHovered?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  withEntrance?: boolean
}

export function HunchOrb({
  isTargetHovered = false,
  size = 'lg',
  withEntrance = true,
}: HunchOrbProps) {
  const { scrollY } = useScroll()
  const shouldReduceMotion = useReducedMotion()
  const orbRef = useRef<HTMLDivElement>(null)

  // Interactive springs for eye movement (max 3px offset)
  const eyeX = useSpring(0, { stiffness: 150, damping: 15 })
  const eyeY = useSpring(0, { stiffness: 150, damping: 15 })

  // Parallax on scroll
  const parallaxY = useTransform(scrollY, [0, 400], [0, 60])
  const parallaxOpacity = useTransform(scrollY, [0, 400], [1, 0.6])

  // Click Easter Egg state: small hop + happy squint
  const [isHopping, setIsHopping] = useState(false)
  const [isSquinting, setIsSquinting] = useState(false)

  // Hero load entrance: 100ms drop in, squash, blink
  const [entrancePhase, setEntrancePhase] = useState<'waiting' | 'drop' | 'squash' | 'blink' | 'idle'>(
    withEntrance && !shouldReduceMotion ? 'waiting' : 'idle'
  )

  useEffect(() => {
    if (!withEntrance || shouldReduceMotion) return

    const t1 = setTimeout(() => setEntrancePhase('drop'), 100)
    const t2 = setTimeout(() => setEntrancePhase('squash'), 350)
    const t3 = setTimeout(() => setEntrancePhase('blink'), 550)
    const t4 = setTimeout(() => setEntrancePhase('idle'), 750)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [withEntrance, shouldReduceMotion])

  // Track pointer for eye following
  useEffect(() => {
    if (shouldReduceMotion) return

    // If target button is hovered, look down-right toward button
    if (isTargetHovered) {
      eyeX.set(2.2)
      eyeY.set(2.4)
      return
    }

    const hasHoverPointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches

    if (!hasHoverPointer) {
      // Touch devices: calm 4s wandering eye loop
      let step = 0
      const pattern = [
        [0, 0],
        [1.8, 0.5],
        [0, 1.2],
        [-1.8, 0.5],
        [0, 0],
      ]
      const interval = setInterval(() => {
        step = (step + 1) % pattern.length
        eyeX.set(pattern[step][0])
        eyeY.set(pattern[step][1])
      }, 1000)
      return () => clearInterval(interval)
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!orbRef.current) return
      const rect = orbRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const deltaX = e.clientX - centerX
      const deltaY = e.clientY - centerY
      const distance = Math.hypot(deltaX, deltaY) || 1

      // Normalize and cap at 3px maximum offset
      const maxOffset = 3
      const factor = Math.min(distance / 250, 1)
      const targetX = (deltaX / distance) * maxOffset * factor
      const targetY = (deltaY / distance) * maxOffset * factor

      eyeX.set(targetX)
      eyeY.set(targetY)
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    return () => window.removeEventListener('pointermove', handlePointerMove)
  }, [isTargetHovered, shouldReduceMotion, eyeX, eyeY])

  // Easter egg click handler
  const handleOrbClick = () => {
    if (isHopping || shouldReduceMotion) return
    setIsHopping(true)
    setIsSquinting(true)
    setTimeout(() => setIsSquinting(false), 450)
    setTimeout(() => setIsHopping(false), 600)
  }

  const dimensions =
    size === 'sm'
      ? 'w-7 h-7'
      : size === 'md'
        ? 'w-10 h-10'
        : 'w-12 h-12 sm:w-[72px] sm:h-[72px] md:w-[82px] md:h-[82px]'

  const eyeSize =
    size === 'sm'
      ? 'w-1 h-1.5'
      : size === 'md'
        ? 'w-1.5 h-2'
        : 'w-2 sm:w-3 h-2.5 sm:h-4'

  const eyeGap =
    size === 'sm' ? 'gap-1' : size === 'md' ? 'gap-1.5' : 'gap-2.5 sm:gap-4'

  return (
    <motion.div
      ref={orbRef}
      style={{
        y: shouldReduceMotion ? 0 : parallaxY,
        opacity: shouldReduceMotion ? 1 : parallaxOpacity,
      }}
      className="inline-flex flex-col items-center justify-center align-middle mx-0.5 sm:mx-1 select-none"
    >
      {/* 3D Orb Ball */}
      <motion.div
        onClick={handleOrbClick}
        initial={
          entrancePhase === 'waiting'
            ? { y: -20, scale: 0.85, opacity: 0 }
            : false
        }
        animate={
          entrancePhase === 'waiting'
            ? { y: -20, scale: 0.85, opacity: 0 }
            : entrancePhase === 'drop'
              ? { y: 0, scale: 1, opacity: 1 }
              : entrancePhase === 'squash'
                ? { scaleY: 0.94, scaleX: 1.04 }
                : isHopping && !shouldReduceMotion
                  ? { y: [0, -12, 0], scale: [1, 1.06, 1] }
                  : isTargetHovered && !shouldReduceMotion
                    ? { scale: 1.04 }
                    : { y: 0, scale: 1, scaleY: 1, scaleX: 1, opacity: 1 }
        }
        transition={entrancePhase === 'drop' ? spring.orb : { duration: 0.2 }}
        className={`${dimensions} rounded-full hunch-orb ${
          entrancePhase === 'idle' ? 'orb-float' : ''
        } flex flex-col items-center justify-center cursor-pointer relative`}
      >
        {/* Dynamic Eyes following cursor / squinting / initial blink */}
        <motion.div
          style={{
            x: shouldReduceMotion ? 0 : eyeX,
            y: shouldReduceMotion ? 0 : eyeY,
          }}
          className={`orb-eyes flex items-center ${eyeGap} mt-0.5`}
        >
          {/* Left Eye */}
          <motion.span
            animate={
              entrancePhase === 'blink' || isSquinting
                ? { scaleY: 0.12 }
                : { scaleY: 1 }
            }
            transition={{ duration: 0.12, ease: easeOut }}
            className={`${eyeSize} bg-[#23252E] rounded-full relative origin-center`}
          >
            <span className="w-0.5 sm:w-1 h-0.5 sm:h-1 bg-white rounded-full absolute top-0.5 left-0.5 pointer-events-none" />
          </motion.span>

          {/* Right Eye */}
          <motion.span
            animate={
              entrancePhase === 'blink' || isSquinting
                ? { scaleY: 0.12 }
                : { scaleY: 1 }
            }
            transition={{ duration: 0.12, ease: easeOut }}
            className={`${eyeSize} bg-[#23252E] rounded-full relative origin-center`}
          >
            <span className="w-0.5 sm:w-1 h-0.5 sm:h-1 bg-white rounded-full absolute top-0.5 left-0.5 pointer-events-none" />
          </motion.span>
        </motion.div>

        {/* Tiny curved smile */}
        <motion.svg
          animate={isSquinting ? { scaleX: 1.25 } : { scaleX: 1 }}
          transition={{ duration: 0.2 }}
          className="w-2.5 sm:w-4 h-1.5 sm:h-2 mt-1 text-[#23252E]"
          viewBox="0 0 16 8"
          fill="none"
        >
          <path
            d="M3 2.2C4.8 6 11.2 6 13 2.2"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </motion.svg>
      </motion.div>

      {/* Subtle floor shadow anchor */}
      <span className="w-8 sm:w-12 h-1.5 rounded-full bg-black/10 mt-1 pointer-events-none" />
    </motion.div>
  )
}
