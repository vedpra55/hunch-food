import { daysBetween, localDate, weekday } from './time'
import type { Context, Dish, Diet, Goal, RuleChip, UserProfile, VegDay } from './types'

/**
 * Layer 1 of personalisation: rules are never broken.
 * Permanent rules (diet, allergies, "not for me") always apply.
 * Situational rules (veg day, fasting) apply unless switched off for today.
 */

export function vegDayToday(user: UserProfile, ctx: Context): VegDay | undefined {
  if (ctx.offToday.includes('vegDay')) return undefined
  return user.vegDays.find(v => v.confirmed && v.day === weekday(ctx.now))
}

/** A pattern Hunch noticed but hasn't been allowed to enforce yet. */
export function inferredVegDayToday(user: UserProfile, ctx: Context): VegDay | undefined {
  return user.vegDays.find(v => !v.confirmed && v.day === weekday(ctx.now))
}

/** 1-based day number if a fast is running today. */
export function fastingDay(user: UserProfile, ctx: Context): number | undefined {
  if (!user.fasting || ctx.offToday.includes('fasting')) return undefined
  const n = daysBetween(localDate(user.fasting.start), ctx.now) + 1
  return n >= 1 && n <= user.fasting.days ? n : undefined
}

export function activeGoal(user: UserProfile, ctx: Context): Goal | undefined {
  const g = user.goal
  if (!g || ctx.offToday.includes('goal')) return undefined
  return daysBetween(ctx.now, localDate(g.until)) >= 0 ? g : undefined
}

function fitsDiet(dish: Dish, diet: Diet) {
  switch (diet) {
    case 'nonveg':
      return true
    case 'eggetarian':
      return dish.diet !== 'nonveg'
    case 'veg':
      return dish.diet === 'veg'
    case 'jain':
      return dish.diet === 'veg' && !!dish.jain
    case 'vegan':
      return dish.diet === 'veg' && !!dish.vegan
  }
}

/** The hard filter. A dish that fails this never appears anywhere. */
export function allowed(dish: Dish, user: UserProfile, ctx: Context): boolean {
  if (!fitsDiet(dish, user.diet)) return false
  if (dish.allergens.some(a => user.allergies.includes(a))) return false
  if (user.notForMe.some(n => n.dishId === dish.id || n.restaurantId === dish.restaurantId)) return false
  if (vegDayToday(user, ctx) && dish.diet !== 'veg') return false
  if (fastingDay(user, ctx) && !dish.fasting) return false
  return true
}

const GOAL_LABEL = { cutting: 'Cutting', protein: 'High protein', light: 'Eating light' } as const

/** Situational rules shown under Hunch's line. Permanent diet lives in Profile, not here. */
export function ruleChips(user: UserProfile, ctx: Context): RuleChip[] {
  const chips: RuleChip[] = []
  if (fastingDay(user, ctx) && user.fasting) chips.push({ id: 'fasting', label: user.fasting.name })
  if (vegDayToday(user, ctx)) chips.push({ id: 'vegDay', label: 'Veg day' })
  const g = activeGoal(user, ctx)
  if (g) chips.push({ id: 'goal', label: g.kind === 'budget' ? `Under ₹${g.budget}` : GOAL_LABEL[g.kind] })
  return chips
}
