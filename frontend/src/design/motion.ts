import type { Transition, Variants } from 'motion/react'

/** Spring tokens. See HUNCH_DESIGN.md §8. */
export const spring = {
  /** Taps, chips, toggles */
  snappy: { type: 'spring', stiffness: 420, damping: 32 },
  /** Sheets and cards settling. The only spring used in checkout and support. */
  gentle: { type: 'spring', stiffness: 200, damping: 28 },
  /** Found it, offer accepted */
  bouncy: { type: 'spring', stiffness: 320, damping: 14 },
} satisfies Record<string, Transition>

/** Durations in seconds */
export const dur = {
  micro: 0.12,
  base: 0.24,
  emerge: 0.42,
} as const

/** Delay between siblings (chips, list items) */
export const stagger = 0.04

/**
 * "Born from Hunch": generated UI grows out of Hunch's position at the top.
 * Pair with `style={{ transformOrigin: '50% -60px' }}` or similar.
 */
export const emerge: Variants = {
  hidden: { opacity: 0, y: -16, scale: 0.88, filter: 'blur(8px)' },
  shown: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { ...spring.gentle, opacity: { duration: dur.base } },
  },
}

/** Parent that staggers `emerge` children */
export const emergeGroup: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: stagger * 2 } },
}
