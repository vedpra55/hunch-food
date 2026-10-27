import { describe, expect, it } from 'vitest'
import { addressById } from '../data/account'
import { DISH_BY_ID } from '../data/menu'
import { RESTAURANT_BY_ID } from '../data/restaurants'
import { SCENARIOS, scenarioById } from '../data/scenarios'
import { parse, plan, search } from './chat'
import { betterDeal, deliverable, delivery, etaTo, kitchensReaching, reorder } from './orders'
import { buildHome } from './recommend'

const dinner = scenarioById('dinner-rain')
const home = addressById('home')

describe('offer discovery', () => {
  it('finds the same biryani cheaper at another kitchen', () => {
    const d = betterDeal([{ dishId: 'chicken-biryani', qty: 1 }], dinner.user, dinner.ctx, home)
    expect(d?.to.dish.id).toBe('deccan-chicken-biryani')
    expect(d?.saving).toBe(289 - (299 - 80))
  })

  it('counts delivery fees, not just prices', () => {
    // Tandoor Street: ₹249 + ₹25 delivery. Angithi: ₹229 − ₹30, free delivery.
    const d = betterDeal([{ dishId: 'paneer-tikka', qty: 1 }], dinner.user, dinner.ctx, home)
    expect(d?.to.dish.id).toBe('angithi-paneer-tikka')
    expect(d?.saving).toBe(249 + 25 - (229 - 30))
  })

  it('stays quiet when the saving is small or nothing similar exists', () => {
    expect(betterDeal([{ dishId: 'chicken-bowl', qty: 1 }], dinner.user, dinner.ctx, home)).toBeUndefined()
  })

  it('never offers what the rules forbid', () => {
    const veg = scenarioById('veg-day')
    const d = betterDeal([{ dishId: 'paneer-tikka', qty: 1 }], veg.user, veg.ctx, home)
    expect(d?.to.dish.diet).toBe('veg')
  })
})

describe('delivery', () => {
  it("knows which kitchens reach an address and how long it takes", () => {
    expect(deliverable(RESTAURANT_BY_ID.nawabs, addressById('parents'))).toBe(false)
    expect(deliverable(RESTAURANT_BY_ID.udupi, addressById('parents'))).toBe(true)
    expect(etaTo(RESTAURANT_BY_ID.nawabs, addressById('work'))).toBe(32 + 8)
    expect(delivery([{ dishId: 'chicken-biryani', qty: 1 }], addressById('parents')).unreachable.map(r => r.id)).toEqual(['nawabs'])
  })
})

describe('sold out', () => {
  it('is never the pick, never planned, never leads a reply', () => {
    expect(DISH_BY_ID['mutton-biryani'].soldOut).toBe(true)
    for (const s of SCENARIOS) expect(buildHome(s.user, s.ctx).pick?.dish.soldOut).toBeFalsy()
    const r = search(parse('mutton biryani'), dinner.user, dinner.ctx)
    expect(r.items[0]?.dish.soldOut).toBeFalsy()
    for (const l of plan(parse('dinner for 4'), dinner.user, dinner.ctx).lines) expect(DISH_BY_ID[l.dishId].soldOut).toBeFalsy()
  })
})

describe('reorder', () => {
  const past = (lines: { dishId: 'mutton-biryani' | 'gulab-jamun' | 'chicken-biryani'; qty: number }[]) => ({ id: 'p', at: '2026-10-24T21:00:00', lines, amount: 0 })
  it('drops what is sold out and names it', () => {
    const r = reorder(past([{ dishId: 'mutton-biryani', qty: 1 }, { dishId: 'gulab-jamun', qty: 2 }]), dinner.user, dinner.ctx)
    expect(r.lines).toEqual([{ dishId: 'gulab-jamun', qty: 2, customisation: undefined }])
    expect(r.missing.map(m => [m.dish.id, m.why])).toEqual([['mutton-biryani', 'soldOut']])
  })
  it("respects today's rules", () => {
    const veg = scenarioById('veg-day')
    expect(reorder(past([{ dishId: 'chicken-biryani', qty: 1 }]), veg.user, veg.ctx).lines).toEqual([])
  })
})

describe('adding an address', () => {
  it('counts the kitchens that reach it', () => {
    expect(kitchensReaching(0)).toBe(12)
    expect(kitchensReaching(12)).toBe(0)
    expect(kitchensReaching(5.5)).toBeLessThan(12)
  })
})
