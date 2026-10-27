import { DISH_BY_ID, MENU } from '../data/menu'
import { RESTAURANT_BY_ID } from '../data/restaurants'
import { ASKS, GROUP_TITLES, LINES, REASONS, RULE_STARTERS, STARTERS } from './copy'
import { activeGoal, allowed, fastingDay, inferredVegDayToday, ruleChips, vegDayToday } from './rules'
import { DAY_NAMES, clockLabel, isOpen, mealAt, weekday } from './time'
import type { Context, Dish, Goal, Group, HomeModel, Meal, Restaurant, Stage, Suggestion, Usual, UserProfile } from './types'

export interface Catalogue {
  menu: Dish[]
  restaurants: Record<string, Restaurant>
}

const DEFAULT_CATALOGUE: Catalogue = { menu: MENU, restaurants: RESTAURANT_BY_ID }

const MAX_GROUPS = 2
const MIN_ITEMS = 3
const MAX_ITEMS = 6
/** Variety: a row never leans on one kitchen. */
const MAX_PER_RESTAURANT = 2

/** Everything Home needs to decide, computed once per render. */
interface Signals {
  user: UserProfile
  ctx: Context
  meal: Meal
  stage: Stage
  goal?: Goal
  vegDay: boolean
  fastDay?: number
  inferredVeg: boolean
  rainy: boolean
  hot: boolean
  cold: boolean
  usuals: Map<string, Usual>
}

/**
 * Decide what Home shows. Pure: same user + context → same screen.
 * Order of influence (HOME_SPEC §3): Rules › Goals › Taste › Context.
 * The real agent will replace this, but must keep the same output shape and the same rules.
 */
export function buildHome(user: UserProfile, ctx: Context, cat: Catalogue = DEFAULT_CATALOGUE): HomeModel {
  if (ctx.activeOrder) {
    const dish = DISH_BY_ID[ctx.activeOrder.dishId]
    return {
      stage: 'tracking',
      line: LINES.tracking(ctx.activeOrder.etaMin, ctx.activeOrder.rider),
      rules: [],
      groups: [],
      starters: STARTERS.tracking,
      tracking: { dish, restaurant: cat.restaurants[dish.restaurantId], ...ctx.activeOrder },
    }
  }

  const meal = mealAt(ctx.now)
  const s: Signals = {
    user,
    ctx,
    meal,
    stage: user.orderCount === 0 ? 'first' : meal,
    goal: activeGoal(user, ctx),
    vegDay: !!vegDayToday(user, ctx),
    fastDay: fastingDay(user, ctx),
    inferredVeg: !!inferredVegDayToday(user, ctx),
    rainy: ctx.weather.kind === 'rain',
    hot: ctx.weather.kind === 'hot' || ctx.weather.tempC >= 33,
    cold: ctx.weather.kind === 'cold' || ctx.weather.tempC <= 15,
    usuals: new Map(user.usuals.map(u => [u.dishId, u])),
  }

  // Layer 1: rules filter. Nothing below can bring a filtered dish back.
  const candidates = cat.menu.filter(d => allowed(d, user, ctx)).map(d => suggest(d, cat.restaurants[d.restaurantId], s))

  const usual = pickUsual(candidates, s)
  const groups = pickGroups(candidates, s, usual)

  return {
    stage: s.stage,
    line: line(s, usual),
    rules: ruleChips(user, ctx),
    ask: ask(s),
    usual,
    groups,
    starters: s.fastDay ? RULE_STARTERS.fasting : s.vegDay ? RULE_STARTERS.vegDay : STARTERS[s.stage],
  }
}

// ---------- scoring ----------

function suggest(dish: Dish, restaurant: Restaurant, s: Signals): Suggestion {
  const open = isOpen(restaurant, s.ctx.now)
  const u = s.usuals.get(dish.id)
  return {
    dish,
    restaurant,
    score: score(dish, restaurant, s) - (open ? 0 : 100),
    tag: tag(dish, s),
    reasons: reasons(dish, restaurant, s),
    open,
    opensLabel: open ? undefined : `Opens ${clockLabel(restaurant.opens)}`,
    customisation: u?.customisation,
  }
}

function score(d: Dish, r: Restaurant, s: Signals) {
  let x = 0
  // Taste memory
  const u = s.usuals.get(d.id)
  if (u) x += 20 + 4 * Math.min(u.times, 6) + (u.meal === s.meal ? 15 : 0)
  if (s.user.favouriteRestaurants.includes(r.id)) x += 10
  if (Math.abs(d.spice - s.user.spice) >= 2) x -= 8
  if (s.user.priceComfort && d.price > s.user.priceComfort * 1.5) x -= 8

  // Meal fit: biryani is not breakfast
  x += d.meals.includes(s.meal) ? 15 : -30

  // Goals
  switch (s.goal?.kind) {
    case 'cutting':
      x += d.kcal <= 450 ? 20 : d.kcal <= 600 ? 8 : d.kcal > 800 ? -25 : 0
      break
    case 'protein':
      x += d.proteinG >= 30 ? 20 : d.proteinG >= 20 ? 8 : d.proteinG < 12 ? -10 : 0
      break
    case 'light':
      x += (d.traits.includes('light') ? 15 : 0) - (d.traits.includes('fried') ? 15 : 0) - (d.kcal > 800 ? 10 : 0)
      break
    case 'budget':
      x += d.price <= (s.goal.budget ?? Infinity) ? 12 : -30
      break
  }

  // Context
  if (s.rainy || s.cold) x += (d.traits.includes('warm') ? 12 : 0) + (d.traits.includes('comfort') ? 4 : 0)
  if (s.hot) x += (d.traits.includes('cool') || d.traits.includes('fresh') ? 12 : 0) - (d.traits.includes('warm') ? 8 : 0)
  // A pattern we noticed but may not enforce: a nudge here, and veg leads each row (pickGroups).
  if (s.inferredVeg && d.diet === 'veg') x += 8

  // Quality and convenience
  x += (r.rating - 4.3) * 20
  if (r.etaMin <= 20) x += 3
  if (d.offerOff) x += 5
  return Math.round(x * 10) / 10
}

function tag(d: Dish, s: Signals): string | undefined {
  if (s.usuals.has(d.id)) return 'Usual'
  if (d.offerOff) return `₹${d.offerOff} off`
  if (s.goal?.kind === 'protein' && d.proteinG >= 20) return `${d.proteinG} g protein`
  if (s.goal?.kind === 'cutting' && d.kcal <= 600) return `${d.kcal} kcal`
  return undefined
}

function reasons(d: Dish, r: Restaurant, s: Signals): string[] {
  const out: string[] = []
  const u = s.usuals.get(d.id)
  if (u) out.push(REASONS.usual(u.times))
  if (s.user.favouriteRestaurants.includes(r.id)) out.push(REASONS.favourite())
  if (s.vegDay) out.push(REASONS.vegDay())
  if (s.fastDay) out.push(REASONS.fasting())
  const g = s.goal
  if (g?.kind === 'cutting' && d.kcal <= 600) out.push(REASONS.cutting())
  if (g?.kind === 'protein' && d.proteinG >= 20) out.push(REASONS.protein(d.proteinG))
  if (g?.kind === 'light' && d.traits.includes('light')) out.push(REASONS.light())
  if (g?.kind === 'budget' && g.budget && d.price <= g.budget) out.push(REASONS.budget(g.budget))
  if (s.rainy && d.traits.includes('warm')) out.push(REASONS.rain())
  if (s.hot && (d.traits.includes('cool') || d.traits.includes('fresh'))) out.push(REASONS.hot(s.ctx.weather.tempC))
  if (d.offerOff) out.push(REASONS.offer(d.offerOff))
  if (r.etaMin <= 20) out.push(REASONS.fast(r.etaMin))
  out.push(REASONS.rating(r.rating, r.ratingCount))
  return out.slice(0, 3)
}

// ---------- your usual ----------

function pickUsual(candidates: Suggestion[], s: Signals): Suggestion | undefined {
  const fits = (c: Suggestion) => {
    const u = s.usuals.get(c.dish.id)
    // A drink goes with a meal; it is never the meal.
    if (!u || has(c, 'drink')) return false
    if (u.meal !== s.meal && !c.dish.meals.includes(s.meal)) return false
    // Late at night a closed usual is just noise.
    return s.meal !== 'late' || c.open
  }
  return candidates
    .filter(fits)
    .sort((a, b) => {
      const ua = s.usuals.get(a.dish.id)!
      const ub = s.usuals.get(b.dish.id)!
      const isVeg = (c: Suggestion) => Number(c.dish.diet === 'veg')
      return (
        // We noticed a veg pattern today: don't contradict it while asking about it.
        (s.inferredVeg ? isVeg(b) - isVeg(a) : 0) ||
        Number(ub.meal === s.meal) - Number(ua.meal === s.meal) ||
        ub.times - ua.times
      )
    })[0]
}

// ---------- groups ----------

interface GroupDef {
  id: string
  title: string
  relevance: number
  test: (c: Suggestion) => boolean
  rank?: (a: Suggestion, b: Suggestion) => number
  /** A rule (fasting) narrows the menu: show what exists rather than an empty screen. */
  ruleDriven?: boolean
}

const has = (c: Suggestion, t: Dish['traits'][number]) => c.dish.traits.includes(t)
/** Rows of meals don't mix in desserts and drinks. */
const isMain = (c: Suggestion) => !has(c, 'sweet') && !has(c, 'drink')
const popularity = (c: Suggestion) => c.restaurant.rating * Math.log10(c.restaurant.ratingCount)

function groupDefs(s: Signals): GroupDef[] {
  const g = s.goal?.kind
  const lightGoal = g === 'cutting' || g === 'light'
  const budget = s.goal?.kind === 'budget' && s.goal.budget ? s.goal.budget : 250
  const wantsWarm = s.rainy || s.cold
  return [
    // First visit leads with it; for everyone else it is the fallback row.
    // Strangers get crowd favourites; people we know get them ranked by their own taste.
    { id: 'popular', title: GROUP_TITLES.popular, relevance: s.stage === 'first' ? 100 : 10, test: isMain, rank: s.stage === 'first' ? (a, b) => popularity(b) - popularity(a) : undefined },
    { id: 'fasting', title: GROUP_TITLES.fasting, relevance: s.fastDay ? 98 : 0, test: () => true, ruleDriven: true },
    { id: 'late', title: GROUP_TITLES.late, relevance: s.meal === 'late' ? 95 : 0, test: () => true },
    { id: 'warmLight', title: GROUP_TITLES.warmLight, relevance: wantsWarm && lightGoal ? 90 : 0, test: c => isMain(c) && has(c, 'warm') && (c.dish.kcal <= 550 || has(c, 'light')) },
    { id: 'warm', title: GROUP_TITLES.warm, relevance: wantsWarm && !lightGoal ? 88 : 0, test: c => isMain(c) && (has(c, 'warm') || has(c, 'comfort')) },
    // In the heat, "fresh" means nothing hot.
    { id: 'fresh', title: GROUP_TITLES.fresh, relevance: s.hot ? 88 : s.meal === 'snack' ? 55 : 0, test: c => (has(c, 'cool') || has(c, 'fresh') || has(c, 'light')) && !(s.hot && has(c, 'warm')) },
    // Cutting + protein means lean protein, not a 900 kcal biryani.
    { id: 'protein', title: GROUP_TITLES.protein, relevance: g === 'protein' ? 85 : g === 'cutting' ? 70 : 0, test: c => isMain(c) && c.dish.proteinG >= 25 && (g !== 'cutting' || c.dish.kcal <= 600) },
    { id: 'budget', title: GROUP_TITLES.budget(budget), relevance: g === 'budget' ? 82 : s.meal === 'lunch' ? 60 : 0, test: c => isMain(c) && c.dish.price <= budget },
    { id: 'veg', title: GROUP_TITLES.veg, relevance: s.vegDay ? 80 : 0, test: isMain },
    { id: 'fast', title: GROUP_TITLES.fast, relevance: s.meal === 'breakfast' ? 75 : s.meal === 'lunch' ? 58 : 0, test: c => c.restaurant.etaMin <= 20 },
    { id: 'sweet', title: GROUP_TITLES.sweet, relevance: s.meal === 'late' ? 70 : s.meal === 'snack' ? 50 : 0, test: c => has(c, 'sweet') },
    { id: 'usuals', title: GROUP_TITLES.usuals, relevance: 40, test: c => s.usuals.has(c.dish.id) },
  ]
}

function pickGroups(candidates: Suggestion[], s: Signals, usual?: Suggestion): Group[] {
  const used = new Set<string>(usual ? [usual.dish.id] : [])
  const limit = s.stage === 'first' ? 1 : MAX_GROUPS
  const groups: Group[] = []
  const defs = groupDefs(s)
    .filter(d => d.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)

  for (const def of defs) {
    if (groups.length >= limit) break
    const perPlace = new Map<string, number>()
    const rank = def.rank ?? ((a: Suggestion, b: Suggestion) => b.score - a.score)
    // While a veg pattern is unconfirmed, veg leads every row; non-veg stays available after it.
    const vegFirst = (a: Suggestion, b: Suggestion) => (s.inferredVeg ? Number(b.dish.diet === 'veg') - Number(a.dish.diet === 'veg') : 0)
    const items = candidates
      .filter(c => c.open && c.dish.meals.includes(s.meal) && !used.has(c.dish.id) && def.test(c))
      .sort((a, b) => vegFirst(a, b) || rank(a, b))
      .filter(c => {
        const n = perPlace.get(c.restaurant.id) ?? 0
        perPlace.set(c.restaurant.id, n + 1)
        return n < MAX_PER_RESTAURANT
      })
      .slice(0, MAX_ITEMS)
    if (items.length < (def.ruleDriven ? 1 : MIN_ITEMS)) continue
    items.forEach(i => used.add(i.dish.id))
    groups.push({ id: def.id, title: def.title, items })
  }
  return groups
}

// ---------- words ----------

function line(s: Signals, usual?: Suggestion): string {
  const { ctx } = s
  if (s.fastDay && s.user.fasting) return LINES.fasting(s.user.fasting.name, s.fastDay)
  if (s.vegDay) return LINES.vegDay(DAY_NAMES[weekday(ctx.now)])
  if (s.stage === 'first') return LINES.first()
  if (s.rainy) return s.goal?.kind === 'cutting' || s.goal?.kind === 'light' ? LINES.rainLight() : LINES.rain(ctx.area)
  if (s.hot) return LINES.hot(ctx.weather.tempC)
  if (s.cold) return LINES.cold(ctx.weather.tempC)
  switch (s.meal) {
    case 'breakfast':
      return LINES.breakfast(usual?.restaurant.etaMin)
    case 'lunch':
      return LINES.lunch(usual?.restaurant.etaMin)
    case 'snack':
      return LINES.snack()
    case 'dinner':
      return LINES.dinner(usual?.restaurant.name)
    case 'late':
      return LINES.late()
  }
}

function ask(s: Signals) {
  const day = weekday(s.ctx.now)
  const v = s.user.vegDays.find(d => !d.confirmed && d.day === day && d.evidence >= 3)
  const id = `vegDay-${day}`
  if (!v || s.ctx.answered.includes(id)) return undefined
  return { id, ...ASKS.vegDay(DAY_NAMES[day]) }
}
