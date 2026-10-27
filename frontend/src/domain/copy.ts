import type { IconKey, Prompt } from './types'

/**
 * Every sentence Hunch says on Home. One file so wording is reviewed in one place.
 * Rules (HOME_SPEC §5): ≤ 12 words, reason first, name the restaurant, exact numbers, no emoji.
 */
export const LINES = {
  // The live ETA is shown big in the tracking block; the line doesn't repeat it.
  tracking: (restaurant: string) => `On its way from ${restaurant}.`,
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

const p = (icon: IconKey, text: string): Prompt => ({ icon, text })
const SURPRISE = p('shuffle', 'Surprise me')

/** One-tap prompts on the Today card, three per moment. */
export const PROMPTS = {
  first: [p('fire', 'Spicy, under ₹250'), p('leaf', 'Something healthy'), p('bowl', 'Best biryani nearby')],
  fasting: [p('bowl', 'Vrat thali'), p('cake', 'Something sweet'), p('leaf', 'Fruit, no sugar')],
  vegDay: [p('leaf', 'Paneer, not too heavy'), p('bowl', 'South Indian'), SURPRISE],
  hot: [p('cold', 'Something cool'), p('leaf', 'Something light'), SURPRISE],
  warm: [p('rain', 'Something warm'), p('barbell', 'High protein, under ₹300'), SURPRISE],
  warmLight: [p('rain', 'Something warm and light'), p('barbell', 'High protein, under ₹300'), SURPRISE],
  breakfast: [p('coffee', 'Just coffee'), p('egg', 'Something filling'), SURPRISE],
  lunch: [p('bowl', 'Same as last time'), p('tag', 'Under ₹200'), SURPRISE],
  snack: [p('cake', 'Something sweet'), p('coffee', 'Chai'), SURPRISE],
  dinner: [p('leaf', 'Something lighter'), p('barbell', 'High protein, under ₹300'), SURPRISE],
  late: [p('cookie', 'Light snack'), p('cake', 'Dessert'), p('coffee', 'Chai')],
  tracking: [p('moped', "Where's my rider?"), p('coffee', 'Add a drink'), p('cake', 'Add dessert')],
} satisfies Record<string, Prompt[]>

/** Refine a reply with one tap. */
export const REFINE = {
  veg: p('leaf', 'Only veg'),
  budget: (b: number) => p('tag', `Under ${money(b)}`),
  quick: p('clock', 'Here in 20 min'),
}

/** Reasons, strongest first. Lowercase phrases so they read inside a sentence. */
export const REASONS = {
  usual: (times: number) => `you've had it ${times} times`,
  favourite: () => 'a favourite of yours',
  fasting: () => 'fasting-friendly',
  cutting: () => 'fits your cutting goal',
  protein: (g: number) => `${g} g protein`,
  kcal: (k: number) => `${k} kcal`,
  light: () => 'light, as you wanted',
  budget: (b: number) => `under your ${money(b)} budget`,
  rain: () => 'warm for the rain',
  hot: () => 'cool for the heat',
  offer: (off: number) => `${money(off)} off today`,
  fast: (eta: number) => `here in ${eta} min`,
  rating: (r: number, count: number) => `rated ${r}★ by ${count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count} people`,
}

export const capital = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)
/** ["a", "b", "c"] → "a, b and c" */
export const joinAnd = (parts: string[]) => (parts.length < 2 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`)
/** Reasons as one sentence for the sheet: "Warm for the rain, fits your cutting goal and rated 4.6★." */
export const reasonSentence = (parts: string[]) => (parts.length ? `${capital(joinAnd(parts))}.` : '')

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
export function money(n: number) {
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

/** Conversation replies. Same rules: ≤ 14 words, name the restaurant, exact numbers. */
export const CHAT = {
  results: {
    /** Lead with the pick and why, never a count. */
    pick: (dish: string, place: string, why: string[]) => {
      if (!why.length) return `${dish} from ${place} is my pick.`
      // A second reason only when it reads naturally with "too".
      const too = why[1] && /^(fasting-friendly|fits your|warm for|cool for|light|under your)/.test(why[1]) ? ` ${capital(why[1])} too.` : ''
      return `${dish} from ${place}, ${why[0]}.${too}`
    },
    none: (budget?: number) => (budget ? `Nothing open under ${money(budget)}. Try a little more?` : `Nothing open fits that right now. Try something close?`),
    /** One-tap ways out of an empty answer */
    relax: (budget?: number): Prompt[] => (budget ? [p('tag', `Under ${money(budget + 100)}`)] : [p('shuffle', 'Anything good nearby')]),
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
  // The tracking block right below shows who's cooking and when it arrives; don't repeat it.
  placed: () => `Done. I'll tell you when it's close.`,
  placedMany: (n: number) => `Done. ${n === 2 ? 'Both kitchens have' : `All ${n} kitchens have`} it. I'll tell you when it's close.`,
  notNow: () => `No problem. It's in your cart when you're ready.`,
  ask: {
    remembered: (day: string) => `Got it. ${day}s are veg from now on.`,
    declined: () => `Okay. I won't ask again.`,
  },
  ruleOff: (label: string) => `${label} off for today.`,
  ruleOn: (label: string) => `${label} back on.`,
  notForMe: {
    'too-spicy': () => `Noted. Milder picks from now on.`,
    'too-pricey': () => `Noted. I'll keep it cheaper.`,
    'not-this-place': (place: string) => `Noted. I'll skip ${place}.`,
    'not-today': () => `Noted. Not today.`,
    disliked: () => `Noted. I'll skip it next time.`,
  },
  track: (eta: number, rider: string) => `${rider} is ${eta} min away.`,
  change: () => `Tell me what to change.`,
  /** What the simulated mic "hears" */
  heard: { dinner: 'Something warm, not too heavy', default: 'Something quick under ₹250' },
} as const

/** Ordering after the order: offers, payment, tracking, cancelling, rating. */
export const ORDER = {
  offer: (kind: string, place: string, saving: number) => `Same ${kind} at ${place}, ${money(saving)} less.`,
  offerSwitch: (saving: number) => `Switch and save ${money(saving)}`,
  switched: (place: string, saving: number) => `Switched to ${place}. You save ${money(saving)}.`,
  unreachable: (place: string, area: string) => `${place} doesn't deliver to ${area}.`,
  payFailed: (method: string) => `Payment didn't go through. ${method} declined it. Try again, or pay another way.`,
  cashNote: (amount: number) => `Pay ${money(amount)} at the door.`,
  emptyCart: () => `Your cart's empty. Want something else?`,
  soldOut: 'Sold out today',
  caption: {
    cooking: (place: string) => `${place} is cooking`,
    cookingMany: (n: number) => (n === 2 ? 'Both kitchens are cooking' : `All ${n} kitchens are cooking`),
    picked: (rider: string) => `${rider} picked it up`,
    near: (rider: string) => `${rider} is around the corner`,
    delivered: (time: string) => `Delivered at ${time}`,
  },
  cancelAsk: (amount: number, cash: boolean) => (cash ? `Cancel this order? Nothing to pay.` : `Cancel this order? You get ${money(amount)} back.`),
  cancelled: (amount: number, method: string, cash: boolean) => (cash ? `Cancelled. Nothing to pay.` : `Cancelled. ${money(amount)} is on its way back to ${method}, usually in 2–3 days.`),
  rateAsk: 'How was it?',
  rated: { up: `Glad you liked it. I'll remember.`, down: `Noted. I'll steer you away from it next time.` },
  status: { near: 'Arriving now', delivered: 'Delivered', scheduled: (at: string) => `Scheduled · ${at}` },
  justOnce: 'Just this once · not learning from this order',
}

/** Three taps before the first suggestion (HOME_SPEC §7). Never asks about religion, veg days or fasting. */
export const ONBOARD = {
  hello: (name: string) => `Hi ${name}. Three taps and I'll know what to get you.`,
  steps: ['What do you eat?', "Anything you can't have?", 'Working towards anything?'],
  diets: [
    { id: 'nonveg', label: 'Everything' },
    { id: 'eggetarian', label: 'Veg, plus eggs' },
    { id: 'veg', label: 'Vegetarian' },
    { id: 'jain', label: 'Jain' },
    { id: 'vegan', label: 'Vegan' },
  ],
  allergies: [
    { id: 'dairy', label: 'Dairy' },
    { id: 'gluten', label: 'Gluten' },
    { id: 'nuts', label: 'Nuts' },
    { id: 'egg', label: 'Egg' },
    { id: 'soy', label: 'Soy' },
  ],
  goals: [
    { id: 'light', label: 'Eating light' },
    { id: 'protein', label: 'More protein' },
    { id: 'cutting', label: 'Cutting' },
    { id: 'budget', label: 'Spending less' },
  ],
  noGoal: 'Not right now',
  nothing: 'Nothing',
  later: 'Change anything later in your profile.',
  done: (goal?: string, until?: string) => (goal && until ? `Got it. ${goal} until ${until}.` : `Got it. Here's what's good right now.`),
} as const

/** Profile → What Hunch knows. Every item says where it came from. */
export const PROFILE = {
  source: {
    told: 'You told me',
    learned: (n: number) => `Learned from ${n} orders`,
    pattern: (weeks: number) => `Noticed ${weeks} weeks in a row`,
  },
  spice: ['Mild', 'Medium', 'Hot', 'Very hot'],
  goalLabel: { cutting: 'Cutting', protein: 'More protein', light: 'Eating light', budget: 'Spending less' },
  nudge: (time: string) => `Around ${time}, only when it's useful. Once a day at most.`,
  weather: 'Rain or heat changes what I suggest.',
  location: 'Location is used only while the app is open.',
  justOnce: "Your next order won't change what I know.",
  forget: 'Forget what I learned',
  forgetAsk: 'Forget usuals, habits and patterns? What you told me stays.',
  forgot: 'Done. I start fresh, keeping what you told me.',
}

/** Ordering a past order again. */
export const REORDER = {
  /** One reason per missing dish, then what happens next. */
  missing: (reasons: string[], all: boolean) => `${capital(joinAnd(reasons))}${all ? '. Want something that\'s open now?' : ', so I left it out.'}`,
  why: {
    soldOut: (dish: string) => `${dish} is sold out today`,
    closed: (place: string, opens: string) => `${place} opens at ${opens}`,
    rule: (dish: string) => `${dish} doesn't fit today`,
  },
  none: () => `Nothing to repeat yet. Tell me what you feel like.`,
}

/** The proactive moment (HOME_SPEC §7): one reason, one offer, easy to say no. */
export const NUDGE = {
  rain: (from: string, at: string) => `Rain from ${from}. Dinner here by ${at}, before the rush?`,
  usual: (at: string) => `Dinner around ${at}, like usual? I can line it up.`,
  banner: (from: string | undefined, dish: string, at: string) => (from ? `Rain from ${from}. ${dish} by ${at}?` : `${dish} by ${at}, like usual?`),
  schedule: (at: string) => `Schedule for ${at}`,
  notTonight: 'Not tonight',
  quiet: () => `Okay. I'll stay quiet tonight.`,
  scheduled: (at: string, place: string) => `Done. ${place} starts cooking in time for ${at}.`,
  caption: (place: string, start: string) => `Scheduled. ${place} starts at ${start}`,
}
