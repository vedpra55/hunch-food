import photos from './photos.json'

export type PhotoSlug = Exclude<keyof typeof photos, '_note'>

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
  /** Short line under the name, e.g. the usual customisation */
  note?: string
}

/** Local copy first (after `npm run photos`), then the Unsplash CDN. */
export function photoSources(slug: PhotoSlug, px = 400) {
  const { id } = photos[slug]
  const size = Math.round(Math.min(px * 2, 800))
  return {
    local: `/food/${slug}.jpg`,
    remote: `https://images.unsplash.com/${id}?w=${size}&h=${size}&fit=crop&crop=entropy&auto=format&q=70`,
  }
}

// Sample data for the building blocks. Restaurants are fictional.
export const DISHES: Record<PhotoSlug, Dish> = {
  'chicken-biryani': { id: 'chicken-biryani', name: 'Chicken Dum Biryani', restaurant: "Nawab's Kitchen", price: 289, etaMin: 32, rating: 4.6, veg: false, kcal: 780, note: 'Extra raita · medium spice' },
  'dal-makhani': { id: 'dal-makhani', name: 'Dal Makhani + 2 Butter Naan', restaurant: 'Angithi Dhaba', price: 238, etaMin: 28, rating: 4.5, veg: true, kcal: 640 },
  'paneer-tikka': { id: 'paneer-tikka', name: 'Paneer Tikka', restaurant: 'Tandoor Street', price: 249, etaMin: 30, rating: 4.4, veg: true, kcal: 420, proteinG: 24 },
  'chicken-bowl': { id: 'chicken-bowl', name: 'Grilled Chicken Bowl', restaurant: 'FitBowl Co.', price: 269, etaMin: 26, rating: 4.5, veg: false, kcal: 380, proteinG: 38, note: 'Extra chicken · no onion' },
  'green-salad': { id: 'green-salad', name: 'Green Goddess Salad', restaurant: 'Leaf & Ladle', price: 219, etaMin: 24, rating: 4.3, veg: true, kcal: 290, proteinG: 12 },
  margherita: { id: 'margherita', name: 'Margherita Pizza', restaurant: 'Forno Twelve', price: 349, etaMin: 35, rating: 4.6, veg: true, kcal: 920 },
  'masala-dosa': { id: 'masala-dosa', name: 'Masala Dosa', restaurant: 'Udupi Corner', price: 129, etaMin: 22, rating: 4.7, veg: true, kcal: 410 },
  'cold-coffee': { id: 'cold-coffee', name: 'Cold Coffee', restaurant: 'Brew Lab', price: 149, etaMin: 18, rating: 4.4, veg: true, kcal: 180, note: 'No sugar · your usual' },
}

export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
