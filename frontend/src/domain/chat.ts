import { DISH_BY_ID } from '../data/menu'
import { RESTAURANT_BY_ID } from '../data/restaurants'
import { CHAT, REASONS, REFINE, wordCount } from './copy'
import { allowedSuggestions, has, isMain, MAX_PER_RESTAURANT, signals } from './recommend'
import { isOpen } from './time'
import type { Context, Dish, DishId, Prompt, Restaurant, Suggestion, UserProfile } from './types'

/**
 * Turns a typed or spoken request into a reply. A stand-in for the AI agent:
 * same inputs, same output shapes, same rules (everything goes through `allowed`).
 */

export interface Intent {
  kind: 'find' | 'plan' | 'usual'
  budget?: number
  people?: number
  veg?: boolean
  protein?: boolean
  light?: boolean
  warm?: boolean
  cool?: boolean
  spicy?: boolean
  sweet?: boolean
  drink?: boolean
  quick?: boolean
  filling?: boolean
  /** Something new: skip what they usually order */
  surprise?: boolean
  /** Dish or cuisine words, e.g. "biryani", "south indian" */
  terms: string[]
}

const NUMBER_WORDS: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, eight: 8, ten: 10 }

// word in the request → words to look for in dish names and cuisines
const TERMS: Record<string, string[]> = {
  biryani: ['biryani'],
  pizza: ['pizza'],
  dosa: ['dosa', 'idli', 'south indian'],
  'south indian': ['dosa', 'idli', 'south indian'],
  momo: ['momos'],
  paneer: ['paneer'],
  chicken: ['chicken'],
  mutton: ['mutton'],
  dal: ['dal', 'rajma', 'chole'],
  thali: ['thali'],
  salad: ['salad'],
  soup: ['soup'],
  coffee: ['coffee'],
  chai: ['chai'],
  tea: ['chai'],
  kebab: ['tikka'],
  tikka: ['tikka'],
  north: ['north indian'],
  punjabi: ['north indian', 'dal', 'chole', 'rajma'],
  breakfast: ['dosa', 'idli', 'omelette'],
  fruit: ['fruit'],
  sweet: ['gulab', 'rose milk', 'fruit'],
}

export function parse(text: string): Intent {
  const t = text.toLowerCase().replace(/,/g, '')
  const budget = t.match(/(?:under|below|less than|within|upto|up to|max)\s*(?:rs\.?|₹)?\s*(\d{2,5})/)?.[1] ?? t.match(/₹\s*(\d{2,5})/)?.[1]
  const peopleNum = t.match(/(?:for|of)\s+(\d{1,2})\b/)?.[1] ?? t.match(/\b(\d{1,2})\s*(?:people|persons?|of us|friends|guests)/)?.[1]
  const peopleWord = t.match(/(?:for|of)\s+(two|three|four|five|six|eight|ten)\b/)?.[1]
  const people = peopleNum ? Number(peopleNum) : peopleWord ? NUMBER_WORDS[peopleWord] : undefined
  const nonVeg = /non[\s-]?veg/.test(t)
  const terms = Object.keys(TERMS).filter(k => t.includes(k))

  const intent: Intent = {
    kind: (people && people >= 2) || /\b(plan|party|team|house ?party|get-?together)\b/.test(t) ? 'plan' : /\b(usual|same as last|again)\b/.test(t) ? 'usual' : 'find',
    budget: budget ? Number(budget) : undefined,
    people: people ?? (/\b(plan|party|team)\b/.test(t) ? 4 : undefined),
    veg: !nonVeg && /\b(veg|vegetarian)\b/.test(t),
    protein: /protein|gym|workout/.test(t),
    light: /\b(light|lighter|healthy|diet|low cal)/.test(t),
    warm: /\b(warm|cosy|cozy|comfort|hot food)/.test(t),
    cool: /\b(cool|cold|chilled|refreshing)/.test(t),
    spicy: /spicy|teekha/.test(t),
    sweet: /\b(sweet|dessert|mithai)/.test(t),
    drink: /\b(drink|coffee|chai|tea|lassi)/.test(t),
    quick: /\b(quick|fast|asap|hurry|soon|20 min)/.test(t),
    filling: /\b(filling|heavy|hungry|starving)/.test(t),
    surprise: /surprise|something new|random/.test(t),
    terms,
  }
  return intent
}

const matchesTerms = (c: Suggestion, terms: string[]) => {
  if (!terms.length) return true
  const hay = `${c.dish.name} ${c.restaurant.cuisine}`.toLowerCase()
  return terms.some(term => TERMS[term].some(w => hay.includes(w)))
}

export interface Results {
  text: string
  items: Suggestion[]
  /** Up to 2 one-tap refinements, e.g. "Only veg", "Under ₹200" */
  refine: Prompt[]
}

export function search(intent: Intent, user: UserProfile, ctx: Context): Results {
  const s = signals(user, ctx)
  const all = allowedSuggestions(s).filter(c => c.open)

  if (intent.kind === 'usual') {
    const items = all.filter(c => s.usuals.has(c.dish.id) && !has(c, 'drink')).sort((a, b) => b.score - a.score)
    if (items.length) return { ...reply(diverse(items), intent), refine: [] }
  }

  const wantsSweetOrDrink = intent.sweet || intent.drink || intent.terms.some(t => ['coffee', 'chai', 'tea'].includes(t))
  const items = all.filter(c => {
    const d = c.dish
    // Naming a dish ("fruit", "chai") finds it even if it's a drink or a sweet.
    if (!wantsSweetOrDrink && !intent.terms.length && !isMain(c)) return false
    if (intent.surprise && s.usuals.has(d.id)) return false
    if (intent.budget && d.price > intent.budget) return false
    if (intent.veg && d.diet !== 'veg') return false
    if (intent.protein && d.proteinG < 20) return false
    if (intent.light && !(d.kcal <= 500 || has(c, 'light'))) return false
    if (intent.warm && !has(c, 'warm')) return false
    if (intent.cool && !(has(c, 'cool') || has(c, 'fresh'))) return false
    if (intent.spicy && d.spice < 2) return false
    if (intent.sweet && !has(c, 'sweet')) return false
    if (intent.drink && !intent.sweet && !has(c, 'drink')) return false
    if (intent.quick && c.restaurant.etaMin > 20) return false
    if (intent.filling && !(has(c, 'filling') || d.kcal >= 500)) return false
    return matchesTerms(c, intent.terms)
  })

  // Respect the time of day unless they named a dish: no dosa at 8 pm for "something warm".
  const inMeal = intent.terms.length ? items : items.filter(c => c.dish.meals.includes(s.meal))
  const pool = inMeal.length ? inMeal : items
  const sorted = pool.sort((a, b) => (intent.protein ? b.dish.proteinG - a.dish.proteinG : 0) || b.score - a.score)
  const picked = diverse(sorted)
  if (!picked.length) return { text: CHAT.results.none(intent.budget), items: [], refine: [] }
  return reply(picked, intent)
}

/** Lead with the pick and why it answers what they asked; offer at most two ways to narrow down. */
function reply(items: Suggestion[], intent: Intent): Results {
  const top = items[0]
  // What they asked for comes first in the reason.
  const asked = intent.protein ? REASONS.protein(top.dish.proteinG) : intent.light ? REASONS.kcal(top.dish.kcal) : intent.quick ? REASONS.fast(top.restaurant.etaMin) : undefined
  const why = [...(asked ? [asked] : []), ...top.reasons.filter(r => r !== asked)]
  let text = CHAT.results.pick(top.dish.name, top.restaurant.name, why.slice(0, 2))
  if (wordCount(text) > 16) text = CHAT.results.pick(top.dish.name, top.restaurant.name, why.slice(0, 1))

  const refine: Prompt[] = []
  if (!intent.veg && items.some(c => c.dish.diet !== 'veg') && items.some(c => c.dish.diet === 'veg')) refine.push(REFINE.veg)
  const prices = items.map(c => c.dish.price).sort((a, b) => a - b)
  const under = Math.floor(prices[Math.floor(prices.length / 2)] / 50) * 50
  if (!intent.budget && items.length > 2 && prices[0] <= under) refine.push(REFINE.budget(under))
  if (!intent.quick && items.some(c => c.restaurant.etaMin <= 20) && items.some(c => c.restaurant.etaMin > 20)) refine.push(REFINE.quick)
  return { text, items, refine: refine.slice(0, 2) }
}

function diverse(items: Suggestion[], max = 6) {
  const per = new Map<string, number>()
  return items
    .filter(c => {
      const n = per.get(c.restaurant.id) ?? 0
      per.set(c.restaurant.id, n + 1)
      return n < MAX_PER_RESTAURANT
    })
    .slice(0, max)
}

// ---------- planning for a group ----------

export interface CartLine {
  dishId: DishId
  qty: number
  customisation?: string[]
}

export interface Plan {
  text: string
  people: number
  restaurant?: Restaurant
  lines: CartLine[]
  total: number
}

/**
 * One kitchen, one delivery: pick the kitchen that can feed everyone best within budget.
 * Every person gets a filling main; one shared side is added if the budget allows.
 */
export function plan(intent: Intent, user: UserProfile, ctx: Context): Plan {
  const people = intent.people ?? 2
  const budget = intent.budget ?? 350 * people
  const s = signals(user, ctx)
  const mains = allowedSuggestions(s).filter(c => c.open && isMain(c) && (!intent.veg || c.dish.diet === 'veg') && matchesTerms(c, intent.terms))

  const byPlace = new Map<string, Suggestion[]>()
  for (const c of mains) byPlace.set(c.restaurant.id, [...(byPlace.get(c.restaurant.id) ?? []), c])

  const isFilling = (c: Suggestion) => has(c, 'filling') || c.dish.kcal >= 500
  const options = [...byPlace.values()].flatMap(list => {
    const ranked = list.sort((a, b) => b.score - a.score)
    const mainsHere = ranked.filter(isFilling).slice(0, Math.min(people, 4))
    if (!mainsHere.length) return []
    const qty = new Map<DishId, number>()
    for (let i = 0; i < people; i++) {
      const d = mainsHere[i % mainsHere.length].dish.id
      qty.set(d, (qty.get(d) ?? 0) + 1)
    }
    let lines: CartLine[] = [...qty].map(([dishId, q]) => ({ dishId, qty: q }))
    const side = ranked.find(c => !isFilling(c))
    if (side && people >= 3 && totals([...lines, { dishId: side.dish.id, qty: 1 }]).toPay <= budget) lines = [...lines, { dishId: side.dish.id, qty: 1 }]
    const quality = mainsHere.reduce((sum, c) => sum + c.score, 0) / mainsHere.length
    return [{ restaurant: mainsHere[0].restaurant, lines, total: totals(lines).toPay, value: quality + mainsHere.length * 6 }]
  })

  const fits = options.filter(o => o.total <= budget).sort((a, b) => b.value - a.value)
  const best = fits[0]
  if (!best) {
    const cheapest = Math.min(...options.map(o => o.total))
    const needed = Number.isFinite(cheapest) ? Math.ceil(cheapest / 100) * 100 : budget
    return { text: CHAT.plan.none(people, budget, needed), people, lines: [], total: 0 }
  }
  return {
    text: CHAT.plan.ready(people, best.restaurant.name, best.total, Math.round(best.total / people)),
    people,
    restaurant: best.restaurant,
    lines: best.lines,
    total: best.total,
  }
}

// ---------- money ----------

export interface Totals {
  itemTotal: number
  delivery: number
  offer: number
  toPay: number
  restaurants: Restaurant[]
}

export function totals(lines: CartLine[]): Totals {
  const dishes = lines.map(l => ({ l, d: DISH_BY_ID[l.dishId] as Dish }))
  const restaurants = [...new Set(dishes.map(x => x.d.restaurantId))].map(id => RESTAURANT_BY_ID[id])
  const itemTotal = dishes.reduce((s, x) => s + x.d.price * x.l.qty, 0)
  const delivery = restaurants.reduce((s, r) => s + r.deliveryFee, 0)
  const offer = dishes.reduce((s, x) => s + (x.d.offerOff ?? 0), 0)
  return { itemTotal, delivery, offer, toPay: itemTotal + delivery - offer, restaurants }
}

export const openKitchens = (ctx: Context) => Object.values(RESTAURANT_BY_ID).filter(r => isOpen(r, ctx.now)).length
