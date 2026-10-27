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

/** ₹1,121 — Indian grouping, no decimals */
export const money = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

/** Conversation replies. Same rules: ≤ 14 words, name the restaurant, exact numbers. */
export const CHAT = {
  results: {
    budget: (n: number, b: number, place: string) => `${n} good options under ${money(b)}. ${place} is my pick.`,
    protein: (n: number, dish: string, g: number) => `${n} high-protein picks. ${dish} has ${g} g.`,
    light: (n: number, place: string) => `${n} light options. ${place} is my pick.`,
    usual: (place: string) => `Your usual from ${place}? Or one of these.`,
    generic: (n: number, place: string) => `Found ${n}. ${place} is my pick.`,
    none: (budget?: number) => (budget ? `Nothing open under ${money(budget)}. Try a little more?` : `Nothing open fits that right now. Try something close?`),
  },
  plan: {
    ready: (people: number, place: string, total: number, each: number) => `Dinner for ${people} from ${place}: ${money(total)}, ${money(each)} each.`,
    none: (people: number, budget: number, needed: number) => `Can't fit ${people} under ${money(budget)} tonight. ${money(needed)} works.`,
  },
  status: {
    searching: (kitchens: number) => `Checking ${kitchens} kitchens…`,
    planning: (people: number) => `Planning for ${people}…`,
    placing: 'Placing your order…',
    listening: 'Listening…',
    onTheWay: (eta: number) => `On the way · ${eta} min`,
  },
  checkout: {
    title: (place: string) => `Placing your order at ${place}`,
    titleMany: (n: number) => `Placing your order from ${n} kitchens`,
  },
  placed: (place: string, eta: number) => `Done. ${place} is cooking. Here in ${eta} min.`,
  placedMany: (n: number, eta: number) => `Done. ${n === 2 ? 'Both kitchens are' : `All ${n} kitchens are`} cooking. Here in ${eta} min.`,
  notNow: () => `No problem. It's in your cart when you're ready.`,
  ask: {
    remembered: (day: string) => `Got it. ${day}s are veg from now on.`,
    declined: () => `Okay. I won't ask again.`,
  },
  ruleOff: (label: string) => `${label} off for today.`,
  notForMe: {
    'too-spicy': () => `Noted. Milder picks from now on.`,
    'too-pricey': () => `Noted. I'll keep it cheaper.`,
    'not-this-place': (place: string) => `Noted. I'll skip ${place}.`,
    'not-today': () => `Noted. Not today.`,
  },
  track: (eta: number, rider: string) => `${rider} is ${eta} min away.`,
  support: () => `I'm on it. What went wrong?`,
  change: () => `Tell me what to change.`,
  /** What the simulated mic "hears" */
  heard: { dinner: 'Something warm, not too heavy', default: 'Something quick under ₹250' },
} as const

export const ADDRESS = 'Home · 12th Main, Indiranagar'
export const PAYMENT = 'UPI · GPay ••4821'
