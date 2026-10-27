import type { DishId } from '../domain/types'
import { MENU } from './menu'
import photos from './photos.json'
import { RESTAURANT_BY_ID } from './restaurants'

export type PhotoSlug = DishId

/** Local copy first (after `npm run photos`), then the Unsplash CDN. */
export function photoSources(slug: PhotoSlug, px = 400) {
  const { id } = photos[slug]
  const size = Math.round(Math.min(px * 2, 800))
  return {
    local: `/food/${slug}.jpg`,
    remote: `https://images.unsplash.com/${id}?w=${size}&h=${size}&fit=crop&crop=entropy&auto=format&q=70`,
  }
}

/**
 * Flattened dish view used by the step-1 building blocks.
 * Step 3 moves the screens onto `domain/` Suggestions and this goes away.
 */
export interface Dish {
  id: PhotoSlug
  name: string
  restaurant: string
  price: number
  etaMin: number
  rating: number
  veg: boolean
  kcal?: number
  proteinG?: number
}

export const DISHES = Object.fromEntries(
  MENU.map(d => {
    const r = RESTAURANT_BY_ID[d.restaurantId]
    return [d.id, { id: d.id, name: d.name, restaurant: r.name, price: d.price, etaMin: r.etaMin, rating: r.rating, veg: d.diet === 'veg', kcal: d.kcal, proteinG: d.proteinG }]
  }),
) as Record<PhotoSlug, Dish>

export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
