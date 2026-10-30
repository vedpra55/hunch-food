import { useState, useRef, useEffect } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { reveal, spring, stagger } from '../../landing/motion'
import { Reveal } from '../../landing/Reveal'

/**
 * Story 1: Chat to order
 * 1. Typing dots for 0.6s inside user bubble.
 * 2. Swaps to "Spicy momos under ₹150".
 * 3. Result card pops up underneath (y 12 -> 0, scale 0.96 -> 1).
 */
function ChatVisual({ isPlaying }: { isPlaying: boolean }) {
  const shouldReduceMotion = useReducedMotion()
  const [phase, setPhase] = useState<'idle' | 'typing' | 'typed' | 'result'>(
    shouldReduceMotion ? 'result' : 'idle'
  )

  useEffect(() => {
    if (!isPlaying || shouldReduceMotion) return

    const t0 = setTimeout(() => setPhase('typing'), 20)
    const t1 = setTimeout(() => setPhase('typed'), 600)
    const t2 = setTimeout(() => setPhase('result'), 900)

    return () => {
      clearTimeout(t0)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [isPlaying, shouldReduceMotion])

  return (
    <div className="flex flex-col items-center gap-2.5 select-none w-full max-w-[270px]">
      {/* User message bubble */}
      <motion.div
        style={{ borderRadius: '18px' }}
        className="bg-white px-4 py-2.5 rounded-[18px] flex items-center gap-2 self-end shadow-xs"
        initial={{ opacity: 0, y: 8 }}
        animate={phase !== 'idle' ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={reveal}
      >
        {phase === 'typing' ? (
          <div className="flex items-center gap-1 py-1 px-2">
            <span className="size-1.5 rounded-full bg-[#111317]/40 animate-bounce [animation-delay:0ms]" />
            <span className="size-1.5 rounded-full bg-[#111317]/40 animate-bounce [animation-delay:150ms]" />
            <span className="size-1.5 rounded-full bg-[#111317]/40 animate-bounce [animation-delay:300ms]" />
          </div>
        ) : (
          <span className="text-[13px] font-medium text-[#111317]">
            “Spicy momos under ₹150”
          </span>
        )}
      </motion.div>

      {/* Hunch reply bubble */}
      <motion.div
        style={{ borderRadius: '18px' }}
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={
          phase === 'result'
            ? { opacity: 1, y: 0, scale: 1 }
            : { opacity: 0, y: 12, scale: 0.96 }
        }
        transition={spring.soft}
        className="bg-white px-3.5 py-2.5 rounded-[18px] flex items-center gap-2.5 self-start shadow-xs"
      >
        <div className="size-5 rounded-full hunch-orb shrink-0 flex items-center justify-center">
          <div className="flex items-center gap-0.5">
            <span className="size-0.5 rounded-full bg-[#23252E]" />
            <span className="size-0.5 rounded-full bg-[#23252E]" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] font-medium text-[#111317]">
            Kurkure Momos · ₹125
          </span>
          <span className="rounded-full bg-emerald-50 text-emerald-600 text-[10.5px] font-mono font-semibold px-2 py-0.5">
            17 min
          </span>
        </div>
      </motion.div>
    </div>
  )
}

/**
 * Story 2: Taste memory
 * Chips pop in one by one (0.12s apart), each with an SVG check icon drawing in.
 */
function MemoryVisual({ isPlaying }: { isPlaying: boolean }) {
  const shouldReduceMotion = useReducedMotion()

  const CHIPS = [
    { label: 'Thursday Pure Veg', iconType: 'check' },
    { label: 'Medium spice', iconType: 'pepper' },
    { label: 'Biryani is favourite', iconType: 'star' },
    { label: 'No green chillies', iconType: 'cross' },
  ]

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 max-w-[280px] select-none">
      {CHIPS.map((chip, idx) => (
        <motion.span
          key={chip.label}
          style={{ borderRadius: '999px' }}
          initial={
            shouldReduceMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.94, y: 10 }
          }
          animate={
            isPlaying
              ? { opacity: 1, scale: 1, y: 0 }
              : { opacity: 0, scale: 0.94, y: 10 }
          }
          transition={{
            duration: 0.45,
            delay: shouldReduceMotion ? 0 : idx * 0.12,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="bg-white rounded-full px-3 py-1.5 text-[12px] font-medium text-[#111317] flex items-center gap-1.5 shadow-xs"
        >
          {chip.iconType === 'check' && (
            <svg
              className="size-3 text-emerald-500 shrink-0"
              viewBox="0 0 12 12"
              fill="none"
            >
              <motion.path
                d="M2.5 6.2L4.8 8.5L9.5 3.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={isPlaying ? { pathLength: 1 } : { pathLength: 0 }}
                transition={{
                  duration: 0.4,
                  delay: shouldReduceMotion ? 0 : idx * 0.12 + 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            </svg>
          )}

          {chip.iconType === 'pepper' && (
            <span className="text-[#5B78FF] text-[11px]">🌶</span>
          )}

          {chip.iconType === 'star' && (
            <span className="text-amber-500 text-[11px]">★</span>
          )}

          {chip.iconType === 'cross' && (
            <svg
              className="size-2.5 text-[#8C94A6] shrink-0"
              viewBox="0 0 10 10"
              fill="none"
            >
              <path
                d="M2 2L8 8M8 2L2 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          )}

          <span>{chip.label}</span>
        </motion.span>
      ))}
    </div>
  )
}

/**
 * Story 3: Daily picks
 * 1. Lunch pick card slides up.
 * 2. "₹50 OFF" badge stamps in (scale 1.3 -> 1, rotate -6deg -> 0, spring.orb).
 */
function PicksVisual({ isPlaying }: { isPlaying: boolean }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      style={{ borderRadius: '20px' }}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={isPlaying ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={reveal}
      className="bg-white rounded-[20px] p-3.5 w-full max-w-[260px] select-none flex flex-col gap-2 shadow-xs"
    >
      <div className="flex items-center justify-between text-[10.5px] font-mono text-[#8C94A6]">
        <span>2:00 PM · LUNCH PICK</span>

        {/* Stamped Badge */}
        <motion.span
          initial={
            shouldReduceMotion
              ? { opacity: 0 }
              : { scale: 1.3, rotate: -6, opacity: 0 }
          }
          animate={
            isPlaying
              ? { scale: 1, rotate: 0, opacity: 1 }
              : { scale: 1.3, rotate: -6, opacity: 0 }
          }
          transition={{
            ...spring.orb,
            delay: shouldReduceMotion ? 0 : 0.3,
          }}
          className="text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full inline-block origin-center"
        >
          ₹50 OFF
        </motion.span>
      </div>

      <div className="flex items-center gap-2.5">
        <img
          src="https://images.unsplash.com/photo-1742599361498-79824d24e355?w=96&h=96&fit=crop&crop=entropy&auto=format&q=80"
          alt="Butter Chicken"
          width={36}
          height={36}
          className="size-9 rounded-full object-cover shrink-0 ring-1 ring-black/[0.04]"
          loading="lazy"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#111317] leading-tight truncate">
            Butter Chicken + 2 Naan
          </p>
          <p className="text-[11px] text-[#8C94A6] leading-tight mt-0.5 truncate">
            Chaheru Da Dhaba · 27 min
          </p>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Story 4: Total control
 * 1. Green dot pulses.
 * 2. 17 min countdown (20 -> 19 -> 18 -> 17).
 * 3. "Cancel my order" row appears.
 * 4. "Instant refund" crossfades in.
 */
function ControlVisual({ isPlaying }: { isPlaying: boolean }) {
  const shouldReduceMotion = useReducedMotion()
  const [countdown, setCountdown] = useState(shouldReduceMotion ? 17 : 20)
  const [showCancel, setShowCancel] = useState(Boolean(shouldReduceMotion))

  useEffect(() => {
    if (!isPlaying || shouldReduceMotion) return

    const t1 = setTimeout(() => setCountdown(19), 200)
    const t2 = setTimeout(() => setCountdown(18), 400)
    const t3 = setTimeout(() => {
      setCountdown(17)
      setShowCancel(true)
    }, 600)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [isPlaying, shouldReduceMotion])

  return (
    <div className="flex flex-col items-center gap-2 select-none w-full max-w-[260px]">
      {/* Live tracking bar */}
      <div
        style={{ borderRadius: '16px' }}
        className="bg-white rounded-[16px] px-3.5 py-2 w-full flex items-center justify-between text-xs shadow-xs"
      >
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-[#111317] text-[12.5px]">
            Momo Junction cooking
          </span>
        </div>
        <span className="font-mono text-[11px] font-medium text-[#5B78FF]">
          {countdown} min
        </span>
      </div>

      {/* Cancel and Instant Refund Row */}
      <motion.div
        style={{ borderRadius: '16px' }}
        initial={{ opacity: 0, y: 8 }}
        animate={showCancel ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={reveal}
        className="bg-white rounded-[16px] px-3.5 py-2 w-full flex items-center justify-between text-xs shadow-xs"
      >
        <span className="text-[12px] text-[#687082]">“Cancel my order”</span>
        <motion.span
          initial={{ opacity: 0, scale: 0.95 }}
          animate={showCancel ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="text-rose-600 font-semibold text-[11px] bg-rose-50 px-2 py-0.5 rounded-full"
        >
          Instant refund
        </motion.span>
      </motion.div>
    </div>
  )
}

/**
 * Individual Card Wrapper with:
 * - Staggered scroll reveal (y: 24 to 0)
 * - Hover lift (y: -4) on pointer devices
 * - Cursor spotlight via CSS variables --x and --y
 * - Shadow depth via pseudo overlay
 * - Fixed height visual well to ensure identical vertical alignment
 */
function FeatureCard({
  title,
  subtext,
  index,
  renderVisual,
}: {
  title: string
  subtext: string
  index: number
  renderVisual: (isPlaying: boolean) => React.ReactNode
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(cardRef, { once: true, amount: 0.35 })
  const shouldReduceMotion = useReducedMotion()

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (shouldReduceMotion) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    e.currentTarget.style.setProperty('--x', `${x}px`)
    e.currentTarget.style.setProperty('--y', `${y}px`)
  }

  return (
    <motion.div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      initial={
        shouldReduceMotion
          ? { opacity: 0 }
          : { opacity: 0, y: 24 }
      }
      animate={
        isInView
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: 24 }
      }
      transition={{
        ...reveal,
        delay: shouldReduceMotion ? 0 : index * stagger.sibling,
      }}
      whileHover={
        shouldReduceMotion
          ? {}
          : {
              y: -4,
              transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
            }
      }
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '28px',
      }}
      className="group relative bg-white rounded-[28px] p-6 sm:p-7 flex flex-col justify-between min-h-[320px] sm:min-h-[350px] overflow-hidden cursor-default transition-colors"
    >
      {/* Soft Indigo Radial Spotlight on Hover */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[28px]"
        style={{
          background:
            'radial-gradient(circle 180px at var(--x, 50%) var(--y, 50%), rgba(91, 120, 255, 0.08) 0%, transparent 80%)',
        }}
      />

      {/* Deepened Shadow Pseudo Overlay (Animates opacity, not box-shadow) */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_14px_34px_-10px_rgba(20,25,45,0.08)]"
      />

      {/* Top: Calm centered small visual inside fixed-height well for exact alignment */}
      <div
        style={{ borderRadius: '20px' }}
        className="w-full h-[150px] sm:h-[160px] bg-[#F8F9FA] rounded-[20px] px-4 flex items-center justify-center select-none relative z-10"
      >
        {renderVisual(isInView)}
      </div>

      {/* Bottom: Clear Title + 1-Line Sub-text */}
      <div className="flex flex-col items-start gap-1.5 pt-5 pb-1 relative z-10">
        <h3 className="text-xl sm:text-[22px] font-semibold text-[#111317] tracking-tight">
          {title}
        </h3>
        <p className="text-[14.5px] sm:text-[15px] text-[#687082] leading-normal font-normal">
          {subtext}
        </p>
      </div>
    </motion.div>
  )
}

export function HowItWorksFlow() {
  const FEATURES = [
    {
      title: 'Chat to order',
      subtext: 'Say what you crave. No scrolling through menus.',
      renderVisual: (isPlaying: boolean) => <ChatVisual isPlaying={isPlaying} />,
    },
    {
      title: 'Taste memory',
      subtext: 'Remembers your spice level, diet rules, and favorites.',
      renderVisual: (isPlaying: boolean) => <MemoryVisual isPlaying={isPlaying} />,
    },
    {
      title: 'Daily picks',
      subtext: 'One fresh recommendation for right now, with real discounts.',
      renderVisual: (isPlaying: boolean) => <PicksVisual isPlaying={isPlaying} />,
    },
    {
      title: 'Total control',
      subtext: 'Track live or cancel instantly with zero questions.',
      renderVisual: (isPlaying: boolean) => <ControlVisual isPlaying={isPlaying} />,
    },
  ]

  return (
    <section className="w-full bg-[#FAFBFD] py-20 sm:py-28">
      <div className="w-full max-w-5xl mx-auto px-6 sm:px-8 flex flex-col items-center">
        {/* Section Header with Eyebrow -> Heading sequence */}
        <div className="text-center max-w-xl mx-auto flex flex-col items-center mb-12 sm:mb-16">
          <Reveal withBlur delay={0}>
            <span className="text-[11px] font-semibold text-[#5B78FF] uppercase tracking-widest font-mono mb-2 block">
              How Hunch Works
            </span>
          </Reveal>

          <Reveal withBlur delay={0.08}>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.035em] text-[#111317] leading-tight">
              Food ordering that feels like conversation.
            </h2>
          </Reveal>
        </div>

        {/* 2-Column Grid on Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 w-full">
          {FEATURES.map((feature, idx) => (
            <FeatureCard
              key={feature.title}
              title={feature.title}
              subtext={feature.subtext}
              index={idx}
              renderVisual={feature.renderVisual}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
