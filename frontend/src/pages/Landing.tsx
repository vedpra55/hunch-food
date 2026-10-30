import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { easeOut, reveal } from '../landing/motion'
import { LandingHeader } from '../landing/LandingHeader'
import { HunchOrb } from '../landing/HunchOrb'
import { MarqueeSection } from '../landing/MarqueeSection'
import { HowItWorksFlow } from '../components/landing/HowItWorksFlow'
import { ArchitectureSection } from '../components/landing/ArchitectureSection'
import { CtaSection } from '../landing/CtaSection'
import { LandingFooter } from '../landing/LandingFooter'

interface LandingProps {
  onStartApp: () => void
}

export function Landing({ onStartApp }: LandingProps) {
  const shouldReduceMotion = useReducedMotion()
  const [isTryHunchHovered, setIsTryHunchHovered] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleStartAppWithTransition = () => {
    if (shouldReduceMotion) {
      onStartApp()
      return
    }
    // Fade page to white (0.25s) before routing to /app for seamless hand-off
    setIsTransitioning(true)
    setTimeout(() => {
      onStartApp()
    }, 250)
  }

  return (
    <div
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
      className="relative min-h-screen bg-white text-[#111317] flex flex-col justify-between selection:bg-[#DCE4FF] selection:text-[#111317] overflow-x-hidden"
    >
      <style>{`
        /* Exact 3D Glossy Periwinkle Hunch Orb */
        .hunch-orb {
          background: radial-gradient(
            circle at 42% 35%,
            #EBF0FF 0%,
            #CFD9FF 26%,
            #A8BAFF 62%,
            #8CA2FF 88%,
            #7B92FF 100%
          );
          box-shadow:
            inset -5px -6px 14px rgba(72, 95, 220, 0.24),
            inset 3px 4px 10px rgba(255, 255, 255, 0.9),
            0 8px 20px -4px rgba(123, 146, 255, 0.32);
          position: relative;
          border: 1px solid rgba(138, 160, 255, 0.45);
        }

        /* Main soft diagonal specular highlight on top-left */
        .hunch-orb::before {
          content: '';
          position: absolute;
          top: 13%;
          left: 15%;
          width: 34%;
          height: 20%;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.12) 100%);
          border-radius: 999px;
          transform: rotate(-30deg);
          pointer-events: none;
        }

        /* Tiny crisp secondary specular dot */
        .hunch-orb::after {
          content: '';
          position: absolute;
          top: 17%;
          left: 44%;
          width: 6.5%;
          height: 6.5%;
          background: rgba(255, 255, 255, 0.96);
          border-radius: 999px;
          pointer-events: none;
        }

        /* Subtle calm breathing & natural blink */
        @keyframes calmFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }

        @keyframes calmBlink {
          0%, 46%, 49%, 100% { transform: scaleY(1); }
          47.5% { transform: scaleY(0.1); }
        }

        .orb-float {
          animation: calmFloat 5s ease-in-out infinite;
        }

        .orb-eyes {
          transform-origin: center;
          animation: calmBlink 6s ease-in-out infinite;
        }

        /* Silent Infinite Horizontal SVG Marquee (35s smooth drift + edge alpha fade) */
        .marquee-mask {
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%);
          mask-image: linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%);
        }

        @keyframes silentMarquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }

        .marquee-track {
          display: flex;
          width: max-content;
          animation: silentMarquee 35s linear infinite;
          will-change: transform;
        }

        .marquee-mask:hover .marquee-track {
          animation-play-state: paused;
        }

        /* Explicit transitions on .icon-node for performance */
        .icon-node {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          background: #FAFBFD;
          border: 1px solid rgba(220, 228, 255, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                      background-color 0.25s cubic-bezier(0.16, 1, 0.3, 1),
                      border-color 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          flex-shrink: 0;
        }

        @media (hover: hover) and (pointer: fine) {
          .icon-node:hover {
            background: #F0F3FF;
            border-color: #8E9EFF;
            transform: translateY(-2px);
          }
        }
      `}</style>

      {/* 1. STICKY FROSTED HEADER (Transparent -> frosted after 24px, hides on scroll down) */}
      <LandingHeader onStartApp={handleStartAppWithTransition} />

      {/* 2. HERO: LOAD CHOREOGRAPHY */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8 pt-6 sm:pt-10 pb-10">
        {/* Subtle Brand Mark Above Headline (Fades in at 0ms) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut }}
          className="mb-6 sm:mb-8"
        >
          <svg className="w-10 h-10 sm:w-12 sm:h-12 text-[#5B78FF]" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 34C14.5 22 18 13 20.5 13C23 13 19.5 31 22.5 31C25.5 31 29.5 18 32.5 18C35.5 18 33 32 36.5 32C38.8 32 40.5 28.5 42 25"
              stroke="currentColor"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>

        {/* 2-Line Display Headline with Masked Word Slide & Living Orb Mascot */}
        <h1 className="text-center font-semibold text-[#111317] text-[2.65rem] sm:text-[4.25rem] md:text-[5.1rem] leading-[1.08] tracking-[-0.04em] max-w-4xl mx-auto select-none">
          {/* Line 1 */}
          <span className="inline-flex items-center justify-center flex-wrap gap-x-2 sm:gap-x-3">
            {/* Word: Hunch (250ms slide with overflow mask) */}
            <span className="inline-block overflow-hidden align-middle">
              <motion.span
                initial={shouldReduceMotion ? { opacity: 0 } : { y: '110%' }}
                animate={{ y: '0%', opacity: 1 }}
                transition={{ ...reveal, delay: shouldReduceMotion ? 0 : 0.25 }}
                className="inline-block"
              >
                Hunch
              </motion.span>
            </span>

            {/* Living 3D Orb Mascot (Drops in at 100ms, squash, blink, follows cursor) */}
            <HunchOrb isTargetHovered={isTryHunchHovered} />

            {/* Word: , AI that (300ms slide with overflow mask) */}
            <span className="inline-block overflow-hidden align-middle">
              <motion.span
                initial={shouldReduceMotion ? { opacity: 0 } : { y: '110%' }}
                animate={{ y: '0%', opacity: 1 }}
                transition={{ ...reveal, delay: shouldReduceMotion ? 0 : 0.3 }}
                className="inline-block"
              >
                , AI that
              </motion.span>
            </span>
          </span>

          <br />

          {/* Line 2 */}
          <span className="inline-flex items-center justify-center flex-wrap gap-x-2.5 sm:gap-x-3.5 mt-1 sm:mt-1.5">
            {/* Word Lockup: sorts your cravings with sweep highlight accent */}
            <span className="relative inline-flex items-center">
              {/* Highlight sweep accent behind words (scales X from 0 to 1 at 0.65s) */}
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{
                  duration: 0.5,
                  delay: shouldReduceMotion ? 0 : 0.65,
                  ease: easeOut,
                }}
                className="absolute inset-y-1 -inset-x-2 bg-[#5B78FF]/[0.09] rounded-xl origin-left pointer-events-none -z-10"
              />

              {['sorts', 'your', 'cravings'].map((word, i) => (
                <span key={word} className="inline-block overflow-hidden align-middle mx-1">
                  <motion.span
                    initial={shouldReduceMotion ? { opacity: 0 } : { y: '110%' }}
                    animate={{ y: '0%', opacity: 1 }}
                    transition={{
                      ...reveal,
                      delay: shouldReduceMotion ? 0 : 0.35 + i * 0.05,
                    }}
                    className="inline-block"
                  >
                    {word}
                  </motion.span>
                </span>
              ))}
            </span>

            {/* Clean Tactile Food Cloche — Black & White, No Border, Subtly Dimmed */}
            <motion.span
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.85, rotate: -15 }
              }
              animate={{ opacity: 0.8, scale: 1, rotate: -6 }}
              transition={{ ...reveal, delay: shouldReduceMotion ? 0 : 0.5 }}
              whileHover={{ rotate: 0, opacity: 1, scale: 1.05 }}
              className="inline-flex items-center justify-center align-middle w-11 h-11 sm:w-16 sm:h-16 md:w-[70px] md:h-[70px] cursor-pointer"
            >
              <svg className="w-full h-full" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="14" width="52" height="38" rx="12" fill="url(#ticketGradBW)" />
                <path d="M18 36C18 27.7157 24.268 21 32 21C39.732 21 46 27.7157 46 36H18Z" fill="#FFFFFF" fillOpacity="0.95" />
                <circle cx="32" cy="18.5" r="2.5" fill="#FFFFFF" />
                <rect x="15" y="36" width="34" height="3.5" rx="1.75" fill="#18181B" />
                <defs>
                  <linearGradient id="ticketGradBW" x1="6" y1="14" x2="58" y2="52" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#ECECED" />
                    <stop offset="1" stopColor="#DFDFE2" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.span>
          </span>
        </h1>

        {/* 3. SUBTITLE (550ms: fades up y: 12) */}
        <motion.p
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...reveal, delay: shouldReduceMotion ? 0 : 0.55 }}
          className="mt-6 sm:mt-7 text-[17px] sm:text-[19px] text-[#687082] font-normal tracking-[-0.015em] text-center"
        >
          Stop scrolling menus. Just ask and eat.
        </motion.p>

        {/* 4. PRIMARY CTA BUTTON (700ms: rises y: 16 and scales from 0.96) */}
        <motion.div
          initial={
            shouldReduceMotion
              ? { opacity: 0 }
              : { opacity: 0, y: 16, scale: 0.96 }
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...reveal, delay: shouldReduceMotion ? 0 : 0.7 }}
          className="mt-7 sm:mt-8"
        >
          <motion.button
            type="button"
            onClick={handleStartAppWithTransition}
            onMouseEnter={() => setIsTryHunchHovered(true)}
            onMouseLeave={() => setIsTryHunchHovered(false)}
            whileTap={{ scale: 0.97 }}
            className="relative inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#141519] hover:bg-[#25272E] text-white text-[15px] font-medium tracking-[-0.01em] transition-[background-color,transform] hover:-translate-y-0.5 active:translate-y-0 cursor-pointer overflow-hidden select-none"
          >
            {/* Shine sweep across button on hover */}
            <motion.span
              initial={{ x: '-100%' }}
              animate={isTryHunchHovered && !shouldReduceMotion ? { x: '100%' } : { x: '-100%' }}
              transition={{ duration: 0.8, ease: easeOut }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
            />

            <span className="relative z-10">Try Hunch</span>
            <span className="relative z-10 text-white/70 text-sm">→</span>
          </motion.button>
        </motion.div>

        {/* 5. 35s MARQUEE + VELOCITY BOOST ON SCROLL (Fades in at 850ms) */}
        <MarqueeSection />
      </main>

      {/* HOW HUNCH WORKS (2-Col Desktop Grid with Mini Interactive Stories) */}
      <HowItWorksFlow />

      {/* SYSTEM DESIGN (Staggered Badges + Clip-Path Wipe Diagram + Full-screen Zoom) */}
      <ArchitectureSection />

      {/* CTA SECTION (Peeking Orb + Magnetic Button + White Dissolve Hand-off) */}
      <CtaSection onStartApp={onStartApp} />

      {/* WHISPER-QUIET FOOTER */}
      <LandingFooter />

      {/* Smooth White Dissolve Hand-off Overlay on Hero CTA Click */}
      {isTransitioning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: easeOut }}
          className="fixed inset-0 z-[100] bg-white pointer-events-none"
        />
      )}
    </div>
  )
}
