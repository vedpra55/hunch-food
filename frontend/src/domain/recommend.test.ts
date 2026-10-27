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
    it(`${s.id}: 3 prompts, a context row of ≤ 3 items, and a pick unless tracking`, () => {
      expect(m.prompts).toHaveLength(3)
      expect(m.context.length).toBeGreaterThan(0)
      expect(m.context.length).toBeLessThanOrEqual(3)
      if (!m.tracking) expect(m.pick).toBeDefined()
    })
    it(`${s.id}: tags are only Usual or an offer`, () => {
      for (const x of all(m)) if (x.tag) expect(x.tag).toMatch(/^(Usual|₹\d+ off)$/)
    })
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

  it('veg day and fasting say so once, in the context row', () => {
    const v = home('veg-day')
    expect(v.context.find(c => c.rule === 'vegDay')?.icon).toBe('leaf')
    for (const x of all(v)) expect(x.reasons.join(' ')).not.toMatch(/veg/i)
    const n = home('navratri')
    expect(n.context.find(c => c.rule === 'fasting')?.text).toBe('Navratri · day 3')
    expect(n.prompts.map(p => p.text)).toContain('Vrat thali')
    expect(n.pick?.dish.traits).not.toContain('drink')
  })

  it('first visit: no usual, a best-fit pick, one popular group', () => {
    const m = home('first')
    expect(m.usual).toBeUndefined()
    expect(m.pick).toBe(m.groups[0].items[0])
    expect(m.groups.map(g => g.title)).toEqual(['Popular near you'])
  })

  it('order on its way replaces everything', () => {
    const m = home('tracking')
    expect(m.line).toBe("On its way from Nawab's Kitchen.")
    // the ETA is said once, in the tracking block
    expect([m.line, ...m.context.map(c => c.text)].join(' ')).not.toMatch(/12 min/)
    expect(m.groups).toHaveLength(0)
    expect(m.tracking?.dish).toBe(DISH_BY_ID['chicken-biryani'])
  })

  it('the usual carries its tag, customisation and reason', () => {
    const m = home('breakfast')
    expect(m.usual?.tag).toBe('Usual')
    expect(m.usual?.reasons[0]).toMatch(/^you've had it \d+ times$/)
    expect(m.pick).toBe(m.usual)
  })
})

describe('the proactive moment', () => {
  it('offers the dinner usual at 6 pm, led by the coming rain', () => {
    const m = home('nudge')
    expect(m.nudge?.pick.dish.id).toBe('chicken-biryani')
    expect(m.nudge?.at).toBe('20:30')
    expect(m.line).toBe('Rain from 7 pm. Dinner here by 8:30 pm, before the rush?')
    expect(m.pick).toBe(m.nudge?.pick)
  })
  it('says nothing about weather when weather is off', () => {
    const m = home('nudge', { useWeather: false })
    expect(m.line).toBe('Dinner around 8:30 pm, like usual? I can line it up.')
    expect(m.context.some(c => c.icon === 'rain')).toBe(false)
  })
  it('stays quiet when switched off, answered today, outside the window or without a pattern', () => {
    expect(home('nudge', { nudge: { on: false, at: '18:00' } }).nudge).toBeUndefined()
    expect(home('nudge', { nudge: { on: true, at: '19:00' } }).nudge).toBeUndefined()
    expect(home('nudge', { mealTimes: undefined }).nudge).toBeUndefined()
    expect(home('nudge', { usuals: RIYA.usuals.filter(u => u.meal !== 'dinner') }).nudge).toBeUndefined()
    const s = scenarioById('nudge')
    expect(home('nudge', {}, { answered: [`nudge-${s.ctx.now.getFullYear()}-${s.ctx.now.getMonth() + 1}-${s.ctx.now.getDate()}`] }).nudge).toBeUndefined()
  })
  it('never nudges a dish today rules out', () => {
    const m = home('nudge', { vegDays: [{ day: 2, source: 'told', confirmed: true, evidence: 0 }] })
    expect(m.nudge?.pick.dish.diet).toBe('veg')
  })
})

describe('weather can be switched off', () => {
  it('drops the rain line and rain reasons', () => {
    const m = home('dinner-rain', { useWeather: false })
    expect(m.line).not.toMatch(/rain/i)
    expect(all(m).some(x => x.reasons.includes('warm for the rain'))).toBe(false)
  })
})
