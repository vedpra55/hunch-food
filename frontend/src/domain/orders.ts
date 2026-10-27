import type { Address } from '../data/account'
import { DISH_BY_ID } from '../data/menu'
import { totals, type CartLine } from './chat'
import { allowedSuggestions, signals } from './recommend'
import type { Context, Restaurant, Suggestion, UserProfile } from './types'

/** Kitchens deliver up to this far. */
export const MAX_DELIVERY_KM = 7
/** Minutes added per extra km beyond Indiranagar. */
const MIN_PER_KM = 3
/** An offer has to be worth interrupting checkout for. */
export const MIN_SAVING = 30

export const deliverable = (r: Restaurant, a: Address) => r.distanceKm + a.extraKm <= MAX_DELIVERY_KM
export const etaTo = (r: Restaurant, a: Address) => r.etaMin + Math.round(a.extraKm * MIN_PER_KM)

/** Everything checkout needs to say about getting this order to this address. */
export function delivery(lines: CartLine[], a: Address) {
  const { restaurants } = totals(lines)
  return {
    etaMin: Math.max(0, ...restaurants.map(r => etaTo(r, a))),
    /** Kitchens that can't reach this address */
    unreachable: restaurants.filter(r => !deliverable(r, a)),
  }
}

export interface BetterDeal {
  /** The line it would replace */
  dishId: CartLine['dishId']
  to: Suggestion
  saving: number
}

/**
 * Offer discovery: the same kind of dish (same diet) at another kitchen that makes the
 * whole order at least ₹30 cheaper, delivery fees included. Rules still apply: only dishes
 * this person may eat, from kitchens that are open and can reach them.
 */
export function betterDeal(lines: CartLine[], user: UserProfile, ctx: Context, a: Address): BetterDeal | undefined {
  if (!lines.length) return undefined
  const before = totals(lines).toPay
  const options = allowedSuggestions(signals(user, ctx)).filter(c => c.open && !c.dish.soldOut && deliverable(c.restaurant, a))
  let best: BetterDeal | undefined
  for (const line of lines) {
    const d = DISH_BY_ID[line.dishId]
    for (const c of options) {
      if (c.dish.kind !== d.kind || c.dish.diet !== d.diet || c.restaurant.id === d.restaurantId) continue
      const after = totals(lines.map(l => (l === line ? { dishId: c.dish.id, qty: l.qty } : l))).toPay
      const saving = before - after
      if (saving >= MIN_SAVING && (!best || saving > best.saving)) best = { dishId: line.dishId, to: c, saving }
    }
  }
  return best
}
