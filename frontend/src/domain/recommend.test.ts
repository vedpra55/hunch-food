import { describe, expect, it } from 'vitest'
import { DISH_BY_ID } from '../data/menu'
import { RIYA, SCENARIOS, scenarioById } from '../data/scenarios'
import { wordCount } from './copy'
import { buildHome } from './recommend'
import { allowed } from './rules'
import type { HomeModel, Suggestion, UserProfile } from './types'

const all = (m: HomeModel): Suggestion[] => [...(m.usual ? [m.usual] : []), ...m.groups.flatMap(g => g.items)]
const home = (id: string, user?: Partial<UserProfile>, ctx?: object) => {
  const s = scenarioById(id)
  return buildHome({ ...s.user, ...user }, { ...s.ctx, ...ctx })
}

describe('every scenario keeps the spec', () => {
  for (const s of SCENARIOS) {
    const m = buildHome(s.user, s.ctx)
    it(`${s.id}: line ≤ 12 words, no emoji`, () => {
      expect(wordCount(m.line)).toBeLessThanOrEqual(12)
      expect(m.line).not.toMatch(/\p{Extended_Pictographic}/u)
    })
    it(`${s.id}: ≤ 2 groups of 3–6, no dish twice`, () => {
      expect(m.groups.length).toBeLessThanOrEqual(2)
      for (const g of m.groups) {
        // A fasting day may have fewer than 3 options; an empty screen would be worse.
        expect(g.items.length).toBeGreaterThanOrEqual(g.id === 'fasting' ? 1 : 3)
        expect(g.items.length).toBeLessThanOrEqual(6)
      }
      const ids = all(m).map(x => x.dish.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
    it(`${s.id}: ≤ 3 reasons, groups only show open kitchens`, () => {
      for (const x of all(m)) expect(x.reasons.length).toBeLessThanOrEqual(3)
      for (const g of m.groups) for (const x of g.items) expect(x.open).toBe(true)
    })
    it(`${s.id}: 3 starters`, () => expect(m.starters).toHaveLength(3))
    it(`${s.id}: never more than 2 dishes from one kitchen per row`, () => {
      for (const g of m.groups) {
        const counts = new Map<string, number>()
        for (const x of g.items) counts.set(x.restaurant.id, (counts.get(x.restaurant.id) ?? 0) + 1)
        expect(Math.max(...counts.values())).toBeLessThanOrEqual(2)
      }
    })
    it(`${s.id}: Home is never empty`, () => expect(!!(m.usual || m.groups.length || m.tracking)).toBe(true))
  }
})

describe('rules are never broken', () => {
  it('veg day hides every non-veg and egg dish, including the usual', () => {
    const m = home('veg-day')
    expect(m.line).toBe('Thursday, so all veg today.')
    expect(m.rules.map(r => r.id)).toContain('vegDay')
    for (const x of all(m)) expect(x.dish.diet).toBe('veg')
    expect(m.usual?.dish.id).toBe('dal-makhani')
  })

  it('switching veg day off for today brings non-veg back', () => {
    const m = home('veg-day', {}, { offToday: ['vegDay'] })
    expect(m.rules.map(r => r.id)).not.toContain('vegDay')
    expect(all(m).some(x => x.dish.diet === 'nonveg')).toBe(true)
  })

  it('an unconfirmed pattern only asks, it does not filter, and does not contradict itself', () => {
    const m = home('veg-ask')
    expect(m.ask?.text).toBe('You skip non-veg on Thursdays. Should I remember that?')
    expect(m.rules.map(r => r.id)).not.toContain('vegDay')
    expect(m.usual?.dish.diet).toBe('veg')
    for (const g of m.groups) expect(g.items[0].dish.diet).toBe('veg')
    // Still not a rule: non-veg stays orderable.
    const s = scenarioById('veg-ask')
    expect(allowed(DISH_BY_ID['chicken-biryani'], s.user, s.ctx)).toBe(true)
    expect(home('veg-ask', {}, { answered: ['vegDay-4'] }).ask).toBeUndefined()
  })

  it('a vegetarian never sees egg or meat', () => {
    for (const s of SCENARIOS.filter(s => !s.ctx.activeOrder)) {
      const m = buildHome({ ...s.user, diet: 'veg' }, s.ctx)
      for (const x of all(m)) expect(x.dish.diet).toBe('veg')
    }
  })

  it('jain and vegan diets only see marked dishes', () => {
    const jain = buildHome({ ...RIYA, diet: 'jain', vegDays: [], goal: undefined }, scenarioById('breakfast').ctx)
    for (const x of all(jain)) expect(x.dish.jain).toBe(true)
    const vegan = buildHome({ ...RIYA, diet: 'vegan', vegDays: [], goal: undefined }, scenarioById('breakfast').ctx)
    for (const x of all(vegan)) expect(x.dish.vegan).toBe(true)
  })

  it('allergies remove dishes everywhere', () => {
    for (const s of SCENARIOS) {
      const m = buildHome({ ...s.user, allergies: ['dairy'] }, s.ctx)
      for (const x of all(m)) expect(x.dish.allergens).not.toContain('dairy')
    }
  })

  it('fasting shows only fasting-friendly food', () => {
    const m = home('navratri')
    expect(m.line).toBe('Navratri, day 3. All fasting-friendly today.')
    for (const x of all(m)) expect(x.dish.fasting).toBe(true)
  })

  it('"not for me" hides the place', () => {
    const m = home('dinner-rain', { notForMe: [{ restaurantId: 'nawabs', reason: 'not-this-place' }] })
    for (const x of all(m)) expect(x.restaurant.id).not.toBe('nawabs')
  })
})

describe('goals and context shape the screen', () => {
  it('a drink is never "your usual"', () => {
    expect(home('breakfast').usual?.dish.id).toBe('masala-dosa')
    for (const sc of SCENARIOS) expect(buildHome(sc.user, sc.ctx).usual?.dish.traits ?? []).not.toContain('drink')
  })

  it('there is always at least one row to browse (except while tracking)', () => {
    for (const sc of SCENARIOS.filter(sc => !sc.ctx.activeOrder)) expect(buildHome(sc.user, sc.ctx).groups.length).toBeGreaterThan(0)
  })

  it('cutting + high protein stays lean', () => {
    for (const id of ['dinner-rain', 'lunch-hot', 'veg-ask']) {
      for (const g of home(id).groups.filter(g => g.id === 'protein')) for (const x of g.items) expect(x.dish.kcal).toBeLessThanOrEqual(600)
    }
  })

  it('meal rows never mix in desserts or drinks', () => {
    for (const s of SCENARIOS) {
      for (const g of buildHome(s.user, s.ctx).groups.filter(g => ['warm', 'warmLight', 'protein', 'budget', 'veg', 'popular'].includes(g.id))) {
        for (const x of g.items) expect(x.dish.traits.some(t => t === 'sweet' || t === 'drink')).toBe(false)
      }
    }
  })

  it('rain + cutting blends into "Warm and light"', () => {
    const m = home('dinner-rain')
    expect(m.line).toBe('Raining. Something warm, still light?')
    expect(m.groups[0].title).toBe('Warm and light')
    for (const x of m.groups[0].items) expect(x.dish.traits).toContain('warm')
  })

  it('an ended goal stops applying', () => {
    const m = home('dinner-rain', { goal: { kind: 'cutting', until: '2026-10-01', source: 'told' } })
    expect(m.rules.map(r => r.id)).not.toContain('goal')
    expect(m.line).toBe('Raining in Indiranagar. Something warm?')
  })

  it('heat leads with something cool', () => {
    const m = home('lunch-hot')
    expect(m.line).toBe('35° outside. Something cool?')
  })

  it('late night only shows kitchens that are open', () => {
    const m = home('late')
    expect(m.line).toBe('Still up? These are open late.')
    expect(m.groups[0].title).toBe('Open late')
    if (m.usual) expect(m.usual.open).toBe(true)
  })

  it('first visit: no usual, one popular group', () => {
    const m = home('first')
    expect(m.usual).toBeUndefined()
    expect(m.groups.map(g => g.title)).toEqual(['Popular near you'])
  })

  it('order on its way replaces everything', () => {
    const m = home('tracking')
    expect(m.line).toBe('12 min away. Arjun has it.')
    expect(m.groups).toHaveLength(0)
    expect(m.tracking?.dish).toBe(DISH_BY_ID['chicken-biryani'])
  })

  it('the usual carries its tag, customisation and reason', () => {
    const m = home('breakfast')
    expect(m.usual?.tag).toBe('Usual')
    expect(m.usual?.reasons[0]).toMatch(/^Your usual · ordered \d+ times$/)
  })
})
