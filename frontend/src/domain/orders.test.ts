import { describe, expect, it } from 'vitest'
import { addressById } from '../data/account'
import { DISH_BY_ID } from '../data/menu'
import { RESTAURANT_BY_ID } from '../data/restaurants'
import { SCENARIOS, scenarioById } from '../data/scenarios'
import { parse, plan, search } from './chat'
import { betterDeal, deliverable, delivery, etaTo } from './orders'
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
