import type { Stage } from './types'

/**
 * Every sentence Hunch says on Home. One file so wording is reviewed in one place.
 * Rules (HOME_SPEC §5): ≤ 12 words, reason first, name the restaurant, exact numbers, no emoji.
 */
export const LINES = {
  tracking: (eta: number, rider: string) => `${eta} min away. ${rider} has it.`,
  fasting: (name: string, day: number) => `${name}, day ${day}. All fasting-friendly today.`,
  vegDay: (dayName: string) => `${dayName}, so all veg today.`,
  first: () => `Tell me what you're craving. I'll handle the rest.`,
  rain: (area: string) => `Raining in ${area}. Something warm?`,
  rainLight: () => `Raining. Something warm, still light?`,
  hot: (t: number) => `${t}° outside. Something cool?`,
  cold: (t: number) => `${t}° today. Something warm?`,
  breakfast: (eta?: number) => (eta ? `Breakfast? Your usual is ${eta} min away.` : `Breakfast? Here's what's quick.`),
  lunch: (eta?: number) => (eta ? `Lunch in ${eta} min?` : `Lunch? Here's what's good nearby.`),
  snack: () => `Snack time?`,
  dinner: (restaurant?: string) => (restaurant ? `Dinner? Your usual from ${restaurant}?` : `Dinner? Here's what's good tonight.`),
  late: () => `Still up? These are open late.`,
} as const

export const ASKS = {
  vegDay: (dayName: string) => ({
    text: `You skip non-veg on ${dayName}s. Should I remember that?`,
    yes: 'Remember',
    no: 'Not really',
  }),
}

export const STARTERS: Record<Stage, string[]> = {
  first: ['Spicy, under ₹250', 'Healthy lunch', 'Best biryani near me'],
  breakfast: ['Something filling', 'Just coffee', 'Surprise me'],
  lunch: ['Same as last time', 'Under ₹200', 'Something new'],
  snack: ['Something sweet', 'Chai', 'Surprise me'],
  dinner: ['Something lighter', 'High protein', 'Surprise me'],
  late: ['Light snack', 'Dessert', 'Chai'],
  tracking: ["Where's my rider?", 'Add a drink', 'Report an issue'],
}

/** When a rule shapes the day, the starters follow it. */
export const RULE_STARTERS = {
  fasting: ['Vrat thali', 'Something sweet', 'Fruit, no sugar'],
  vegDay: ['Paneer, not too heavy', 'South Indian', 'Surprise me'],
}

/** Sheet reasons, strongest first. Pick ≤ 3. */
export const REASONS = {
  usual: (times: number) => `Your usual · ordered ${times} times`,
  favourite: () => 'Your favourite place',
  vegDay: () => 'Veg day',
  fasting: () => 'Fasting-friendly',
  cutting: () => 'Fits your cutting goal',
  protein: (g: number) => `${g} g protein`,
  light: () => 'Light, as you wanted',
  budget: (b: number) => `Under your ₹${b} budget`,
  rain: () => 'Raining → warm food',
  hot: (t: number) => `${t}° → something cool`,
  offer: (off: number) => `₹${off} off today`,
  fast: (eta: number) => `Arrives in ${eta} min`,
  rating: (r: number, count: number) => `${r}★ from ${count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count} ratings`,
}

export const GROUP_TITLES = {
  usuals: 'Your usuals',
  warmLight: 'Warm and light',
  warm: 'Warm and comforting',
  fresh: 'Light and fresh',
  protein: 'High protein',
  budget: (b: number) => `Under ₹${b}`,
  fast: 'Here in 20 min',
  late: 'Open late',
  sweet: 'Something sweet',
  fasting: 'Fasting-friendly',
  veg: 'Best veg near you',
  popular: 'Popular near you',
} as const

export const wordCount = (s: string) => s.trim().split(/\s+/).length
