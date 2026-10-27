import type { Context, UserProfile } from '../domain/types'

/**
 * Sample people and moments, one per Home stage. Used by the app preview (?stage=…) and tests.
 * Dates are local time. 29 Oct 2026 is a Thursday.
 */

/** A returning user: eats non-veg, usually skips it on Thursdays, cutting until year end. */
export const RIYA: UserProfile = {
  firstName: 'Riya',
  diet: 'nonveg',
  allergies: [],
  vegDays: [{ day: 4, source: 'learned', confirmed: true, evidence: 6 }],
  goal: { kind: 'cutting', until: '2026-12-31', source: 'told' },
  usuals: [
    { dishId: 'chicken-biryani', times: 6, meal: 'dinner', customisation: ['Medium spice', 'Extra raita'] },
    { dishId: 'dal-makhani', times: 4, meal: 'dinner' },
    { dishId: 'chicken-bowl', times: 5, meal: 'lunch', customisation: ['Extra chicken', 'No onion'] },
    { dishId: 'masala-dosa', times: 5, meal: 'breakfast', customisation: ['Extra chutney'] },
    { dishId: 'filter-coffee', times: 7, meal: 'breakfast' },
    { dishId: 'cold-coffee', times: 3, meal: 'snack', customisation: ['No sugar'] },
  ],
  favouriteRestaurants: ['nawabs', 'udupi'],
  notForMe: [],
  spice: 2,
  priceComfort: 300,
  orderCount: 38,
}

export const NEW_USER: UserProfile = {
  firstName: 'Kabir',
  diet: 'nonveg',
  allergies: [],
  vegDays: [],
  usuals: [],
  favouriteRestaurants: [],
  notForMe: [],
  spice: 1,
  priceComfort: 0,
  orderCount: 0,
}

const ctx = (iso: string, weather: Context['weather'], extra: Partial<Context> = {}): Context => ({
  now: new Date(iso),
  weather,
  area: 'Indiranagar',
  offToday: [],
  answered: [],
  ...extra,
})

export interface Scenario {
  id: string
  label: string
  user: UserProfile
  ctx: Context
}

export const SCENARIOS: Scenario[] = [
  { id: 'first', label: 'First visit · lunch', user: NEW_USER, ctx: ctx('2026-10-27T13:10:00', { kind: 'clear', tempC: 29 }) },
  { id: 'breakfast', label: 'Breakfast · Wednesday', user: RIYA, ctx: ctx('2026-10-28T08:40:00', { kind: 'clear', tempC: 24 }) },
  { id: 'lunch-hot', label: 'Lunch · 35°', user: RIYA, ctx: ctx('2026-10-28T13:20:00', { kind: 'hot', tempC: 35 }) },
  { id: 'dinner-rain', label: 'Dinner · raining · cutting', user: RIYA, ctx: ctx('2026-10-27T20:15:00', { kind: 'rain', tempC: 23 }) },
  { id: 'veg-day', label: 'Thursday · veg day', user: RIYA, ctx: ctx('2026-10-29T20:10:00', { kind: 'clear', tempC: 26 }) },
  {
    id: 'veg-ask',
    label: 'Thursday · pattern not confirmed',
    user: { ...RIYA, vegDays: [{ day: 4, source: 'learned', confirmed: false, evidence: 3 }] },
    ctx: ctx('2026-10-29T20:10:00', { kind: 'clear', tempC: 26 }),
  },
  { id: 'late', label: 'Late night · Friday', user: RIYA, ctx: ctx('2026-10-31T00:40:00', { kind: 'clear', tempC: 21 }) },
  {
    id: 'navratri',
    label: 'Navratri · fasting',
    user: { ...RIYA, fasting: { name: 'Navratri', start: '2026-10-26', days: 9 } },
    ctx: ctx('2026-10-28T13:05:00', { kind: 'clear', tempC: 28 }),
  },
  {
    id: 'tracking',
    label: 'Order on its way',
    user: RIYA,
    ctx: ctx('2026-10-27T20:40:00', { kind: 'rain', tempC: 23 }, { activeOrder: { dishId: 'chicken-biryani', etaMin: 12, rider: 'Arjun' } }),
  },
]

export const scenarioById = (id: string | null) => SCENARIOS.find(s => s.id === id) ?? SCENARIOS[3]
