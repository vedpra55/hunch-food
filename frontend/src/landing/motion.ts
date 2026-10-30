/**
 * Motion tokens for the Hunch landing page.
 * Apple / Linear style motion: calm, premium, restrained.
 */

export const easeOut = [0.16, 1, 0.3, 1] as const

export const reveal = {
  duration: 0.7,
  ease: easeOut,
} as const

export const quick = {
  duration: 0.35,
  ease: easeOut,
} as const

export const spring = {
  soft: {
    type: 'spring',
    stiffness: 180,
    damping: 24,
  },
  orb: {
    type: 'spring',
    stiffness: 260,
    damping: 14,
  },
} as const

export const stagger = {
  sibling: 0.08,
  word: 0.05,
} as const

export const REVEAL_Y = 24
