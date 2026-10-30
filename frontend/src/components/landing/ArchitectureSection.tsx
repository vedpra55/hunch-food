import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { easeOut, spring, stagger } from '../../landing/motion'
import { Reveal } from '../../landing/Reveal'

const ARCHITECTURE_IMG_URL =
  'https://raw.githubusercontent.com/vedpra55/hunch-food/claude/fervent-bardeen-0xc1nm/docs/hunch-system-architecture.png'

function OpenAiIcon({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
    </svg>
  )
}

function NextJsIcon({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.665 21.978C16.758 23.255 14.465 24 12 24 5.377 24 0 18.623 0 12S5.377 0 12 0s12 5.377 12 12c0 3.583-1.574 6.801-4.067 9.001L9.219 7.2H7.2v9.596h1.615V9.251l9.85 12.727Zm-3.332-8.533 1.6 2.061V7.2h-1.6v6.245Z" />
    </svg>
  )
}

function SupabaseIcon({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#3ECF8E" aria-hidden="true">
      <path d="M11.9 1.036c-.015-.986-1.26-1.41-1.874-.637L.764 12.05C-.33 13.427.65 15.455 2.409 15.455h9.579l.113 7.51c.014.985 1.259 1.408 1.873.636l9.262-11.653c1.093-1.375.113-3.403-1.645-3.403h-9.642z" />
    </svg>
  )
}

function DjangoIcon({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#0C4B33" aria-hidden="true">
      <path d="M11.146 0h3.924v18.166c-2.013.382-3.491.535-5.096.535-4.791 0-7.288-2.166-7.288-6.32 0-4.002 2.65-6.6 6.753-6.6.637 0 1.121.05 1.707.203zm0 9.143a3.894 3.894 0 00-1.325-.204c-1.988 0-3.134 1.223-3.134 3.365 0 2.09 1.096 3.236 3.109 3.236.433 0 .79-.025 1.35-.102V9.142zM21.314 6.06v9.098c0 3.134-.229 4.638-.917 5.937-.637 1.249-1.478 2.039-3.211 2.905l-3.644-1.733c1.733-.815 2.574-1.53 3.109-2.625.561-1.121.739-2.421.739-5.835V6.059h3.924zM17.39.021h3.924v4.026H17.39z" />
    </svg>
  )
}

function DodoPaymentIcon({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0M8.21 5.414c2.44-.162 4.62 1.036 5.858 2.98.484.941 5.714-.545 7.354 3.047l.004.002c.446 1.184-.004 3.374-.703 4.764-.074.147-.258.292-.338.068-.938-2.441-4.856-1.943-5.016-1.935h-.01c-.752.085-1.809.073-2.597.2-.327.044-.407.382-.47.648-.345 1.467.667 3.628 1.552 5.212h-5.73c-1.98-3.1-6.057-8.862-3.64-12.68l.005-.011v-.002l.001-.002V7.7l-.001-.002-.006-.011v-.002l-.002-.002a.3.3 0 0 0-.116-.041s-.739-.177-.753-.198c.342-.45.892-.748 1.332-1.005.084-.047.14-.068.154-.084v-.002l.002-.002v-.002l.002-.002v-.002l-.002-.002V6.34l-.002-.002c-.016-.016-.075-.037-.184-.078-.065-.024-.053-.02-.097-.04l-.59-.26c.979-.615 2.493-.568 2.933-.392q.537-.119 1.06-.154m1.427 1.797a3 3 0 0 0-.604.078c-.614.136-1.154.497-1.447 1.05-.906 1.631-.09 3.73 1.435 4.659l.006.006c1.048.714 3.768.708 4.883.713.227-.016.454-.028.59-.143.157-.128.154-.375.135-.57-.035-.354-.07-.701-.045-1.055a4.4 4.4 0 0 1 .51-1.687l-.002-.002c.235-.4.382-.734-.205-.875-.314-.064-.64-.051-.954-.14-.681-.146-1.126-.619-1.646-1.073-.262-.22-.607-.413-.895-.559a3.6 3.6 0 0 0-1.761-.402m.644 1.613a1 1 0 0 1 .28.037h.007c1.253.394.706 2.22-.568 1.858-.52-.16-.815-.74-.629-1.246a.99.99 0 0 1 .91-.649" />
    </svg>
  )
}

function AiSdkIcon({ className = 'size-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="m12 1.608 12 20.784H0Z" />
    </svg>
  )
}

const TECH_STACK = [
  { name: 'OpenAI', icon: OpenAiIcon },
  { name: 'Next.js', icon: NextJsIcon },
  { name: 'Supabase', icon: SupabaseIcon },
  { name: 'Django', icon: DjangoIcon },
  { name: 'Dodo Payments', icon: DodoPaymentIcon },
  { name: 'AI SDK', icon: AiSdkIcon },
]

export function ArchitectureSection() {
  const [isZoomed, setIsZoomed] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  // Close zoom modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsZoomed(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <section className="w-full bg-white py-20 sm:py-24">
      <div className="w-full max-w-4xl mx-auto px-6 sm:px-8 flex flex-col items-center">
        {/* Sleek Small Heading with Eyebrow Reveal */}
        <div className="text-center mb-6">
          <Reveal withBlur delay={0}>
            <span className="text-[11px] font-semibold text-[#5B78FF] uppercase tracking-widest font-mono mb-2 block">
              System Design
            </span>
          </Reveal>

          <Reveal withBlur delay={stagger.sibling}>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-[#111317]">
              The Architecture behind Hunch
            </h2>
          </Reveal>
        </div>

        {/* Tech Stack Badges Stagger in (0.04s apart, y: 8). Lift 1px on hover */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 mb-8">
          {TECH_STACK.map((tech, idx) => {
            const Icon = tech.icon
            return (
              <motion.span
                key={tech.name}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{
                  duration: 0.4,
                  delay: shouldReduceMotion ? 0 : idx * 0.04,
                  ease: easeOut,
                }}
                whileHover={
                  shouldReduceMotion
                    ? {}
                    : {
                        y: -1,
                        transition: { duration: 0.15 },
                      }
                }
                className="group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F8F9FB] text-xs font-medium text-[#111317] select-none hover:bg-[#F0F2F6] transition-[background-color] cursor-pointer"
              >
                <span className="transition-transform group-hover:scale-110 duration-200">
                  <Icon className="size-3.5 shrink-0" />
                </span>
                <span>{tech.name}</span>
              </motion.span>
            )
          })}
        </div>

        {/* The Diagram with Clip-Path Wipe (inset 0 0 100% 0 -> inset 0) + Zoom Trigger */}
        <motion.div
          initial={
            shouldReduceMotion
              ? { opacity: 0 }
              : {
                  clipPath: 'inset(0% 0% 100% 0%)',
                  scale: 0.98,
                  opacity: 0,
                }
          }
          whileInView={{
            clipPath: 'inset(0% 0% 0% 0%)',
            scale: 1,
            opacity: 1,
          }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{
            duration: 0.9,
            ease: easeOut,
          }}
          style={{ borderRadius: '24px' }}
          onClick={() => setIsZoomed(true)}
          className="group relative w-full rounded-[24px] bg-[#FAFBFD] p-3 sm:p-4 select-none cursor-zoom-in overflow-hidden"
        >
          {/* Zoom hint overlay */}
          <div className="absolute top-5 right-5 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/85 backdrop-blur-xs text-[11px] font-medium text-[#687082] opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-xs pointer-events-none">
            <svg className="size-3 text-[#111317]" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 2H14V6M6 14H2V10M14 2L9.5 6.5M2 14L6.5 9.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Click to expand</span>
          </div>

          <motion.img
            layoutId="system-design-diagram"
            src={ARCHITECTURE_IMG_URL}
            alt="The Architecture behind Hunch"
            width={1024}
            height={704}
            className="w-full h-auto rounded-[18px] object-contain block"
            style={{ borderRadius: '18px' }}
            loading="lazy"
          />
        </motion.div>
      </div>

      {/* Full-Screen Zoom Modal with layoutId morph on spring.soft */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setIsZoomed(false)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 cursor-zoom-out"
          >
            <div className="relative max-w-5xl w-full flex flex-col items-center">
              <motion.img
                layoutId="system-design-diagram"
                transition={spring.soft}
                src={ARCHITECTURE_IMG_URL}
                alt="The Architecture behind Hunch (Expanded)"
                width={1024}
                height={704}
                className="w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              />
              <span className="mt-4 text-xs font-mono text-white/60">
                Click anywhere or press Esc to close
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
