import type { Restaurant } from '../domain/types'

// Fictional kitchens around Indiranagar, Bengaluru. Numbers are realistic, not real.
export const RESTAURANTS: Restaurant[] = [
  { id: 'nawabs', name: "Nawab's Kitchen", cuisine: 'Biryani, Mughlai', area: 'Indiranagar', distanceKm: 1.8, rating: 4.6, ratingCount: 2140, opens: '12:00', closes: '23:30', etaMin: 32, deliveryFee: 0, pureVeg: false },
  { id: 'deccan', name: 'Deccan Dum', cuisine: 'Biryani, Hyderabadi', area: 'Domlur', distanceKm: 2.6, rating: 4.4, ratingCount: 1680, opens: '12:00', closes: '23:30', etaMin: 30, deliveryFee: 0, pureVeg: false },
  { id: 'angithi', name: 'Angithi Dhaba', cuisine: 'North Indian', area: 'HAL 2nd Stage', distanceKm: 2.4, rating: 4.5, ratingCount: 3410, opens: '11:30', closes: '23:00', etaMin: 28, deliveryFee: 0, pureVeg: false },
  { id: 'tandoor', name: 'Tandoor Street', cuisine: 'Kebabs, Tandoor', area: 'Indiranagar', distanceKm: 1.2, rating: 4.4, ratingCount: 980, opens: '12:00', closes: '23:00', etaMin: 26, deliveryFee: 25, pureVeg: false },
  { id: 'fitbowl', name: 'FitBowl Co.', cuisine: 'Healthy, Bowls', area: 'Indiranagar', distanceKm: 0.9, rating: 4.5, ratingCount: 1220, opens: '08:00', closes: '22:00', etaMin: 22, deliveryFee: 0, pureVeg: false },
  { id: 'leaf', name: 'Leaf & Ladle', cuisine: 'Salads, Soups', area: 'Domlur', distanceKm: 1.5, rating: 4.3, ratingCount: 640, opens: '09:00', closes: '22:00', etaMin: 24, deliveryFee: 20, pureVeg: true },
  { id: 'forno', name: 'Forno Twelve', cuisine: 'Pizza', area: 'Indiranagar', distanceKm: 2.1, rating: 4.6, ratingCount: 1830, opens: '12:00', closes: '01:00', etaMin: 35, deliveryFee: 0, pureVeg: false },
  { id: 'udupi', name: 'Udupi Corner', cuisine: 'South Indian', area: 'Indiranagar', distanceKm: 0.6, rating: 4.7, ratingCount: 5230, opens: '07:00', closes: '22:00', etaMin: 15, deliveryFee: 0, pureVeg: true },
  { id: 'brewlab', name: 'Brew Lab', cuisine: 'Coffee, Tea', area: 'Indiranagar', distanceKm: 0.4, rating: 4.4, ratingCount: 890, opens: '08:00', closes: '23:00', etaMin: 14, deliveryFee: 15, pureVeg: true },
  { id: 'momos', name: 'Midnight Momos', cuisine: 'Momos, Tibetan', area: 'Domlur', distanceKm: 1.6, rating: 4.3, ratingCount: 1140, opens: '18:00', closes: '03:00', etaMin: 25, deliveryFee: 20, pureVeg: false },
  { id: 'mithai', name: 'Mithai Ghar', cuisine: 'Desserts, Sweets', area: 'Indiranagar', distanceKm: 1.1, rating: 4.6, ratingCount: 2710, opens: '10:00', closes: '00:30', etaMin: 18, deliveryFee: 0, pureVeg: true },
  { id: 'annapurna', name: 'Annapurna Thali', cuisine: 'Gujarati, Thali', area: 'HAL 2nd Stage', distanceKm: 2.2, rating: 4.5, ratingCount: 1560, opens: '11:00', closes: '22:30', etaMin: 30, deliveryFee: 0, pureVeg: true },
]

export const RESTAURANT_BY_ID: Record<string, Restaurant> = Object.fromEntries(RESTAURANTS.map(r => [r.id, r]))
