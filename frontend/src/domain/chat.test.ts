import { describe, expect, it } from 'vitest'
import { DISH_BY_ID } from '../data/menu'
import { scenarioById } from '../data/scenarios'
import { wordCount } from './copy'
import { parse, plan, search, totals } from './chat'

const dinner = scenarioById('dinner-rain')
const vegDay = scenarioById('veg-day')

describe('parse', () => {
  it('reads budget, people and wants', () => {
    expect(parse('something warm, high protein, under ₹300')).toMatchObject({ kind: 'find', budget: 300, warm: true, protein: true })
    expect(parse('Dinner for 4 tonight, under ₹1,200')).toMatchObject({ kind: 'plan', people: 4, budget: 1200 })
    expect(parse('plan dinner for four')).toMatchObject({ kind: 'plan', people: 4 })
    expect(parse('my usual')).toMatchObject({ kind: 'usual' })
    expect(parse('best biryani near me').terms).toEqual(['biryani'])
    expect(parse('non-veg please').veg).toBe(false)
  })
})

describe('search', () => {
  it('respects every constraint and the rules', () => {
    const r = search(parse('something warm, high protein, under ₹300'), dinner.user, dinner.ctx)
    expect(r.items.length).toBeGreaterThan(0)
    for (const x of r.items) {
      expect(x.dish.price).toBeLessThanOrEqual(300)
      expect(x.dish.proteinG).toBeGreaterThanOrEqual(20)
      expect(x.dish.traits).toContain('warm')
      expect(x.open).toBe(true)
    }
    expect(r.text).toContain(r.items[0].dish.name)
  })

  it('a veg day still applies to typed requests', () => {
    const r = search(parse('chicken'), vegDay.user, vegDay.ctx)
    expect(r.items).toHaveLength(0)
  })

  it('replies stay short and name a restaurant when there are results', () => {
    for (const q of ['biryani', 'something light', 'under 200', 'spicy veg', 'dessert', 'coffee']) {
      const r = search(parse(q), dinner.user, dinner.ctx)
      expect(wordCount(r.text)).toBeLessThanOrEqual(14)
      if (r.items.length && !/protein/.test(q)) expect(r.text).toMatch(new RegExp(r.items.map(i => i.restaurant.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')))
    }
  })
})

describe('plan', () => {
  it('feeds everyone from one kitchen within budget', () => {
    const p = plan(parse('dinner for 4 under ₹1200'), dinner.user, dinner.ctx)
    // everyone gets a filling main
    const mains = p.lines.filter(l => DISH_BY_ID[l.dishId].traits.includes('filling') || DISH_BY_ID[l.dishId].kcal >= 500)
    expect(mains.reduce((n, l) => n + l.qty, 0)).toBe(4)
    expect(p.text).toMatch(/₹\d{1,3}(,\d{3})*, ₹\d+ each\.$/)
    expect(p.total).toBeLessThanOrEqual(1200)
    expect(new Set(p.lines.map(l => DISH_BY_ID[l.dishId].restaurantId)).size).toBe(1)
    expect(p.text).toContain(p.restaurant!.name)
  })

  it('says what budget would work when it cannot fit', () => {
    const p = plan(parse('dinner for 4 under ₹200'), dinner.user, dinner.ctx)
    expect(p.lines).toHaveLength(0)
    expect(p.text).toMatch(/₹[\d,]+ works\.$/)
  })

  it('a veg day plan is all veg', () => {
    const p = plan(parse('dinner for 3'), vegDay.user, vegDay.ctx)
    for (const l of p.lines) expect(DISH_BY_ID[l.dishId].diet).toBe('veg')
  })
})

describe('totals', () => {
  it('adds delivery per kitchen and takes offers off', () => {
    const t = totals([{ dishId: 'chicken-bowl', qty: 1 }, { dishId: 'tomato-soup', qty: 2 }])
    expect(t.itemTotal).toBe(269 + 169 * 2)
    expect(t.delivery).toBe(0 + 20)
    expect(t.offer).toBe(54)
    expect(t.toPay).toBe(269 + 338 + 20 - 54)
  })
})
