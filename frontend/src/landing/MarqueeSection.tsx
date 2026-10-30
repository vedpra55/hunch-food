import { useRef, useEffect } from 'react'
import { motion, useScroll, useVelocity, useSpring, useTransform, useReducedMotion } from 'motion/react'
import { reveal } from './motion'

export function MarqueeSection() {
  const { scrollY } = useScroll()
  const scrollVelocity = useVelocity(scrollY)
  const shouldReduceMotion = useReducedMotion()
  const trackRef = useRef<HTMLDivElement>(null)

  // Map scroll velocity to speed multiplier (1x to 2x)
  const velocityMultiplier = useTransform(
    scrollVelocity,
    [-3000, 0, 3000],
    [2, 1, 2],
    { clamp: true }
  )
  const smoothMultiplier = useSpring(velocityMultiplier, {
    stiffness: 140,
    damping: 22,
  })

  // Apply speed dynamically to CSS animation playback rate
  useEffect(() => {
    if (shouldReduceMotion) return

    const unsubscribe = smoothMultiplier.on('change', (val) => {
      if (trackRef.current) {
        // Adjust animation duration or playback rate
        const baseDuration = 35
        const currentSpeed = Math.max(1, Math.min(2.2, val))
        trackRef.current.style.animationDuration = `${baseDuration / currentSpeed}s`
      }
    })
    return () => unsubscribe()
  }, [smoothMultiplier, shouldReduceMotion])

  return (
    <div className="mt-14 sm:mt-16 w-full max-w-[520px] mx-auto flex flex-col items-center">
      {/* 850ms Marquee Fades in */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...reveal, delay: shouldReduceMotion ? 0 : 0.85 }}
        className="w-full overflow-hidden marquee-mask py-1"
      >
        <div
          ref={trackRef}
          style={shouldReduceMotion ? { animationPlayState: 'paused' } : undefined}
          className="marquee-track gap-3.5"
        >
          {/* SET 1: 10 Bespoke Architectural SVGs */}
          <div className="flex items-center gap-3.5 pr-3.5">
            {/* 1. Steamed Momos */}
            <div className="icon-node" title="Steamed Momos">
              <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                <path d="M10 6.5C10 5.3 11 4.5 11 3.3M14 6C14 4.8 15 4 15 2.8M18 6.5C18 5.3 19 4.5 19 3.3" stroke="#8E9EFF" strokeWidth="1.3" strokeLinecap="round" />
                <ellipse cx="14" cy="18.5" rx="8.5" ry="3.5" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" />
                <path d="M5.5 18.5V21C5.5 22.9 9.3 24.5 14 24.5C18.7 24.5 22.5 22.9 22.5 21V18.5" stroke="#6E7891" strokeWidth="1.4" />
                <path d="M9.5 17.5C9.5 14.8 11.5 13 14 13C16.5 13 18.5 14.8 18.5 17.5" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M12.2 13.5C12.6 14.8 13.2 16 13.5 17.2M15.8 13.5C15.4 14.8 14.8 16 14.5 17.2" stroke="#8E9EFF" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>

            {/* 2. Butter Chicken Handi */}
            <div className="icon-node" title="Butter Chicken Handi">
              <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                <path d="M6.5 13.5H21.5L20.2 20.2C19.6 22.7 17.1 24.2 14 24.2C10.9 24.2 8.4 22.7 7.8 20.2L6.5 13.5Z" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                <ellipse cx="14" cy="13.5" rx="7.5" ry="2.3" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.4" />
                <path d="M4.5 13.5C5.2 13.5 6 14 6.5 14.8M23.5 13.5C22.8 13.5 22 14 21.5 14.8" stroke="#6E7891" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M12.5 9.5C12.5 7.8 14.2 6.8 15.8 7.8C16.8 8.5 16.2 10.2 14.5 10.5" fill="#8E9EFF" fillOpacity="0.35" stroke="#8E9EFF" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>

            {/* 3. Kathi Roll */}
            <div className="icon-node" title="Kathi Roll">
              <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                <path d="M9.5 15.5L12.5 23.2C12.9 24.2 14.2 24.5 15.2 24L19.5 21.8C20.5 21.3 20.9 20 20.4 19L17.2 11.5" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                <ellipse cx="13.2" cy="11.2" rx="4.8" ry="2.5" transform="rotate(-24 13.2 11.2)" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.4" />
                <circle cx="12.2" cy="11.2" r="1.2" fill="#8E9EFF" />
                <path d="M13.2 12.8L15.5 18" stroke="#8E9EFF" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>

            {/* 4. Filter Coffee Tumbler */}
            <div className="icon-node" title="Filter Coffee">
              <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                <path d="M8.5 8H19.5L18.2 17.5C18 19 16.8 20.2 15.2 20.2H12.8C11.2 20.2 10 19 9.8 17.5L8.5 8Z" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                <ellipse cx="14" cy="8" rx="5.5" ry="1.8" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.4" />
                <path d="M7 19.5H21C21 22.5 18 24 14 24C10 24 7 22.5 7 19.5Z" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M12.5 4.5C12.5 3.5 13.2 3 13.5 2.2M15.5 4.5C15.5 3.5 16.2 3 16.5 2.2" stroke="#8E9EFF" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>

            {/* 5. Ghee Dosa Cone */}
            <div className="icon-node" title="Crispy Dosa">
              <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                <path d="M14 6L6.5 21.5C6.2 22.2 6.8 23 7.6 23H20.4C21.2 23 21.8 22.2 21.5 21.5L14 6Z" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M14 6V23" stroke="#8E9EFF" strokeWidth="1.2" strokeDasharray="2 2" />
                <ellipse cx="14" cy="22" rx="4.5" ry="1.2" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.3" />
                <circle cx="14" cy="13" r="1" fill="#8E9EFF" />
              </svg>
            </div>

            {/* 6. Biryani Pot / Handi */}
            <div className="icon-node" title="Clay Pot Biryani">
              <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="16.5" r="7.5" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" />
                <path d="M7.5 13.5H20.5" stroke="#6E7891" strokeWidth="1.4" />
                <ellipse cx="14" cy="10.5" rx="5.5" ry="2" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.4" />
                <circle cx="14" cy="7.2" r="1.5" fill="#8E9EFF" />
                <path d="M11 16.5L12 18M14 16.5L14 18.5M17 16.5L16 18" stroke="#8E9EFF" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>

            {/* 7. Cloche Dome */}
            <div className="icon-node" title="Chef Cloche">
              <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                <path d="M6 19.5C6 14.2 9.6 10 14 10C18.4 10 22 14.2 22 19.5H6Z" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                <circle cx="14" cy="8.2" r="1.6" fill="#FFFFFF" stroke="#8E9EFF" strokeWidth="1.4" />
                <path d="M4.2 19.5H23.8" stroke="#6E7891" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M10 14.5C11.2 13.2 12.6 12.5 14.2 12.5" stroke="#8E9EFF" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>

            {/* 8. Asian Noodle Box */}
            <div className="icon-node" title="Noodle Box">
              <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                <path d="M7.5 7.5L22.5 5.2M7.5 10.2L22.5 8.8" stroke="#8E9EFF" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M11 8V13.5M14 7.5V13.5" stroke="#6E7891" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M5.8 13.5H22.2C22.2 18.5 18.8 22.5 14 22.5C9.2 22.5 5.8 18.5 5.8 13.5Z" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M10.5 22.5H17.5" stroke="#6E7891" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* 9. Artisan Burger */}
            <div className="icon-node" title="Gourmet Burger">
              <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                <path d="M6.5 13C6.5 9.2 9.8 6.8 14 6.8C18.2 6.8 21.5 9.2 21.5 13H6.5Z" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M5.5 15.8H22.5" stroke="#8E9EFF" strokeWidth="2" strokeLinecap="round" />
                <rect x="6.5" y="18.2" width="15" height="3.6" rx="1.8" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.4" />
                <circle cx="12" cy="9.8" r="0.7" fill="#6E7891" />
                <circle cx="15.5" cy="9.5" r="0.7" fill="#6E7891" />
                <circle cx="13.8" cy="11" r="0.7" fill="#8E9EFF" />
              </svg>
            </div>

            {/* 10. Tandoori Skewer */}
            <div className="icon-node" title="Tandoori Tikka">
              <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                <path d="M6.5 21.5L21.5 6.5" stroke="#6E7891" strokeWidth="1.4" strokeLinecap="round" />
                <circle cx="20.8" cy="7.2" r="1.6" fill="#FFFFFF" stroke="#8E9EFF" strokeWidth="1.3" />
                <rect x="14.2" y="10.2" width="4.4" height="4.4" rx="1.2" transform="rotate(45 16.4 12.4)" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.3" />
                <rect x="10.2" y="14.2" width="4.4" height="4.4" rx="1.2" transform="rotate(45 12.4 16.4)" fill="#DCE4FF" stroke="#6E7891" strokeWidth="1.3" />
              </svg>
            </div>
          </div>

          {/* DUPLICATE SET FOR SEAMLESS 35s INFINITE LOOP */}
          <div className="flex items-center gap-3.5 pr-3.5" aria-hidden="true">
            <div className="icon-node">
              <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                <path d="M10 6.5C10 5.3 11 4.5 11 3.3M14 6C14 4.8 15 4 15 2.8M18 6.5C18 5.3 19 4.5 19 3.3" stroke="#8E9EFF" strokeWidth="1.3" strokeLinecap="round" />
                <ellipse cx="14" cy="18.5" rx="8.5" ry="3.5" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" />
                <path d="M5.5 18.5V21C5.5 22.9 9.3 24.5 14 24.5C18.7 24.5 22.5 22.9 22.5 21V18.5" stroke="#6E7891" strokeWidth="1.4" />
                <path d="M9.5 17.5C9.5 14.8 11.5 13 14 13C16.5 13 18.5 14.8 18.5 17.5" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M12.2 13.5C12.6 14.8 13.2 16 13.5 17.2M15.8 13.5C15.4 14.8 14.8 16 14.5 17.2" stroke="#8E9EFF" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="icon-node">
              <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                <path d="M6.5 13.5H21.5L20.2 20.2C19.6 22.7 17.1 24.2 14 24.2C10.9 24.2 8.4 22.7 7.8 20.2L6.5 13.5Z" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                <ellipse cx="14" cy="13.5" rx="7.5" ry="2.3" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.4" />
                <path d="M4.5 13.5C5.2 13.5 6 14 6.5 14.8M23.5 13.5C22.8 13.5 22 14 21.5 14.8" stroke="#6E7891" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M12.5 9.5C12.5 7.8 14.2 6.8 15.8 7.8C16.8 8.5 16.2 10.2 14.5 10.5" fill="#8E9EFF" fillOpacity="0.35" stroke="#8E9EFF" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
            <div className="icon-node">
              <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                <path d="M9.5 15.5L12.5 23.2C12.9 24.2 14.2 24.5 15.2 24L19.5 21.8C20.5 21.3 20.9 20 20.4 19L17.2 11.5" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                <ellipse cx="13.2" cy="11.2" rx="4.8" ry="2.5" transform="rotate(-24 13.2 11.2)" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.4" />
                <circle cx="12.2" cy="11.2" r="1.2" fill="#8E9EFF" />
                <path d="M13.2 12.8L15.5 18" stroke="#8E9EFF" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="icon-node">
              <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                <path d="M8.5 8H19.5L18.2 17.5C18 19 16.8 20.2 15.2 20.2H12.8C11.2 20.2 10 19 9.8 17.5L8.5 8Z" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                <ellipse cx="14" cy="8" rx="5.5" ry="1.8" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.4" />
                <path d="M7 19.5H21C21 22.5 18 24 14 24C10 24 7 22.5 7 19.5Z" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M12.5 4.5C12.5 3.5 13.2 3 13.5 2.2M15.5 4.5C15.5 3.5 16.2 3 16.5 2.2" stroke="#8E9EFF" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="icon-node">
              <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                <path d="M14 6L6.5 21.5C6.2 22.2 6.8 23 7.6 23H20.4C21.2 23 21.8 22.2 21.5 21.5L14 6Z" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M14 6V23" stroke="#8E9EFF" strokeWidth="1.2" strokeDasharray="2 2" />
                <ellipse cx="14" cy="22" rx="4.5" ry="1.2" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.3" />
                <circle cx="14" cy="13" r="1" fill="#8E9EFF" />
              </svg>
            </div>
            <div className="icon-node">
              <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="16.5" r="7.5" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" />
                <path d="M7.5 13.5H20.5" stroke="#6E7891" strokeWidth="1.4" />
                <ellipse cx="14" cy="10.5" rx="5.5" ry="2" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.4" />
                <circle cx="14" cy="7.2" r="1.5" fill="#8E9EFF" />
                <path d="M11 16.5L12 18M14 16.5L14 18.5M17 16.5L16 18" stroke="#8E9EFF" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="icon-node">
              <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                <path d="M6 19.5C6 14.2 9.6 10 14 10C18.4 10 22 14.2 22 19.5H6Z" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                <circle cx="14" cy="8.2" r="1.6" fill="#FFFFFF" stroke="#8E9EFF" strokeWidth="1.4" />
                <path d="M4.2 19.5H23.8" stroke="#6E7891" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M10 14.5C11.2 13.2 12.6 12.5 14.2 12.5" stroke="#8E9EFF" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
            <div className="icon-node">
              <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                <path d="M7.5 7.5L22.5 5.2M7.5 10.2L22.5 8.8" stroke="#8E9EFF" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M11 8V13.5M14 7.5V13.5" stroke="#6E7891" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M5.8 13.5H22.2C22.2 18.5 18.8 22.5 14 22.5C9.2 22.5 5.8 18.5 5.8 13.5Z" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M10.5 22.5H17.5" stroke="#6E7891" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="icon-node">
              <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                <path d="M6.5 13C6.5 9.2 9.8 6.8 14 6.8C18.2 6.8 21.5 9.2 21.5 13H6.5Z" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M5.5 15.8H22.5" stroke="#8E9EFF" strokeWidth="2" strokeLinecap="round" />
                <rect x="6.5" y="18.2" width="15" height="3.6" rx="1.8" fill="#FFFFFF" stroke="#6E7891" strokeWidth="1.4" />
                <circle cx="12" cy="9.8" r="0.7" fill="#6E7891" />
                <circle cx="15.5" cy="9.5" r="0.7" fill="#6E7891" />
                <circle cx="13.8" cy="11" r="0.7" fill="#8E9EFF" />
              </svg>
            </div>
            <div className="icon-node">
              <svg className="w-7 h-7" viewBox="0 0 28 28" fill="none">
                <path d="M6.5 21.5L21.5 6.5" stroke="#6E7891" strokeWidth="1.4" strokeLinecap="round" />
                <circle cx="20.8" cy="7.2" r="1.6" fill="#FFFFFF" stroke="#8E9EFF" strokeWidth="1.3" />
                <rect x="14.2" y="10.2" width="4.4" height="4.4" rx="1.2" transform="rotate(45 16.4 12.4)" fill="#EEF2FF" stroke="#6E7891" strokeWidth="1.3" />
                <rect x="10.2" y="14.2" width="4.4" height="4.4" rx="1.2" transform="rotate(45 12.4 16.4)" fill="#DCE4FF" stroke="#6E7891" strokeWidth="1.3" />
              </svg>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats line reveals right after marquee (1.05s) */}
      <motion.p
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...reveal, delay: shouldReduceMotion ? 0 : 1.05 }}
        className="mt-3.5 text-[12.5px] font-medium text-[#8C94A6] tracking-[0.02em] select-none"
      >
        50+ restaurants <span className="mx-1 text-[#C4CAD8]">·</span> over 400 dishes
      </motion.p>
    </div>
  )
}
