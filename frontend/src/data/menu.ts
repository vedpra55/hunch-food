import type { Dish, DishId } from '../domain/types'

const SPICE = { label: 'Spice', choices: ['Mild', 'Medium', 'Hot'], default: 'Medium' }

// 26 dishes across 11 kitchens. Nutrition is per serving, approximate but plausible.
export const MENU: Dish[] = [
  // Nawab's Kitchen
  { id: 'chicken-biryani', restaurantId: 'nawabs', name: 'Chicken Dum Biryani', price: 289, diet: 'nonveg', allergens: ['dairy'], kcal: 780, proteinG: 36, spice: 2, traits: ['warm', 'comfort', 'filling'], meals: ['lunch', 'dinner', 'late'], reviews: ['Fragrant, not oily', 'Generous chicken', 'Raita is a must'], options: [SPICE, { label: 'Add-on', choices: ['None', 'Extra raita', 'Mirchi ka salan'], default: 'None' }] },
  { id: 'mutton-biryani', restaurantId: 'nawabs', name: 'Mutton Biryani', price: 389, diet: 'nonveg', allergens: ['dairy'], kcal: 860, proteinG: 38, spice: 2, traits: ['warm', 'comfort', 'filling'], meals: ['lunch', 'dinner'], reviews: ['Meat falls off the bone', 'Rich and slow-cooked', 'Worth the price'], options: [SPICE], offerOff: 50 },

  // Angithi Dhaba
  { id: 'dal-makhani', restaurantId: 'angithi', name: 'Dal Makhani + 2 Butter Naan', price: 238, diet: 'veg', allergens: ['dairy', 'gluten'], kcal: 640, proteinG: 18, spice: 1, traits: ['warm', 'comfort', 'filling'], meals: ['lunch', 'dinner'], reviews: ['Creamy and smoky', 'Naan stays soft', 'Tastes like home'] },
  { id: 'butter-chicken', restaurantId: 'angithi', name: 'Butter Chicken + Naan', price: 329, diet: 'nonveg', allergens: ['dairy', 'gluten', 'nuts'], kcal: 820, proteinG: 34, spice: 1, traits: ['warm', 'comfort', 'filling'], meals: ['lunch', 'dinner'], reviews: ['Silky gravy', 'Mildly sweet', 'Big portion'] },
  { id: 'rajma-chawal', restaurantId: 'angithi', name: 'Rajma Chawal', price: 189, diet: 'veg', allergens: [], kcal: 560, proteinG: 17, spice: 1, traits: ['warm', 'comfort'], meals: ['lunch', 'dinner'], reviews: ['Proper Punjabi taste', 'Light on the stomach', 'Great value'], offerOff: 30 },
  { id: 'chole-bhature', restaurantId: 'angithi', name: 'Chole Bhature', price: 199, diet: 'veg', allergens: ['gluten', 'dairy'], kcal: 720, proteinG: 16, spice: 2, traits: ['warm', 'fried', 'filling'], meals: ['breakfast', 'lunch'], reviews: ['Fluffy bhature', 'Tangy chole', 'Heavy but worth it'] },

  // Tandoor Street
  { id: 'paneer-tikka', restaurantId: 'tandoor', name: 'Paneer Tikka', price: 249, diet: 'veg', allergens: ['dairy'], kcal: 420, proteinG: 24, spice: 2, traits: ['warm'], meals: ['snack', 'dinner'], reviews: ['Charred, not dry', 'Soft paneer', 'Mint chutney is great'] },
  { id: 'chicken-tikka', restaurantId: 'tandoor', name: 'Chicken Tikka', price: 299, diet: 'nonveg', allergens: ['dairy'], kcal: 380, proteinG: 42, spice: 2, traits: ['warm', 'light'], meals: ['snack', 'dinner'], reviews: ['Juicy pieces', 'Smoky flavour', 'High on protein'] },

  // FitBowl Co.
  { id: 'chicken-bowl', restaurantId: 'fitbowl', name: 'Grilled Chicken Bowl', price: 269, diet: 'nonveg', allergens: [], kcal: 380, proteinG: 38, spice: 1, traits: ['light', 'fresh'], meals: ['lunch', 'dinner'], reviews: ['Filling but light', 'Fresh greens', 'Great post-gym'], offerOff: 54 },
  { id: 'masala-omelette', restaurantId: 'fitbowl', name: 'Masala Omelette + Toast', price: 159, diet: 'egg', allergens: ['egg', 'gluten'], kcal: 360, proteinG: 22, spice: 1, traits: ['warm', 'light'], meals: ['breakfast'], reviews: ['Fluffy', 'Just enough masala', 'Quick breakfast'] },

  // Leaf & Ladle
  { id: 'green-salad', restaurantId: 'leaf', name: 'Green Goddess Salad', price: 219, diet: 'veg', vegan: true, allergens: ['nuts'], kcal: 290, proteinG: 12, spice: 0, traits: ['light', 'fresh', 'cool'], meals: ['lunch', 'snack', 'dinner'], reviews: ['Crunchy and fresh', 'Dressing is excellent', 'Actually filling'] },
  { id: 'tomato-soup', restaurantId: 'leaf', name: 'Roasted Tomato Soup', price: 169, diet: 'veg', allergens: ['dairy', 'gluten'], kcal: 210, proteinG: 6, spice: 0, traits: ['warm', 'light', 'comfort'], meals: ['lunch', 'snack', 'dinner'], reviews: ['Rich and tangy', 'Perfect rainy-day soup', 'Croutons stay crisp'] },
  { id: 'fruit-bowl', restaurantId: 'leaf', name: 'Seasonal Fruit Bowl', price: 149, diet: 'veg', vegan: true, jain: true, fasting: true, allergens: [], kcal: 180, proteinG: 3, spice: 0, traits: ['light', 'fresh', 'cool', 'sweet'], meals: ['breakfast', 'lunch', 'snack'], reviews: ['Fresh cut', 'Good portion', 'No tired fruit'] },

  // Forno Twelve
  { id: 'margherita', restaurantId: 'forno', name: 'Margherita Pizza', price: 349, diet: 'veg', allergens: ['gluten', 'dairy'], kcal: 920, proteinG: 34, spice: 0, traits: ['comfort', 'filling'], meals: ['lunch', 'dinner', 'late'], reviews: ['Thin, blistered crust', 'Real mozzarella', 'Arrives hot'] },
  { id: 'pepperoni', restaurantId: 'forno', name: 'Pepperoni Pizza', price: 429, diet: 'nonveg', allergens: ['gluten', 'dairy'], kcal: 1080, proteinG: 44, spice: 1, traits: ['comfort', 'filling'], meals: ['dinner', 'late'], reviews: ['Loaded with pepperoni', 'Crispy edges', 'Great for sharing'] },

  // Udupi Corner
  { id: 'masala-dosa', restaurantId: 'udupi', name: 'Masala Dosa', price: 129, diet: 'veg', allergens: ['dairy'], kcal: 410, proteinG: 9, spice: 1, traits: ['warm'], meals: ['breakfast', 'lunch', 'snack'], reviews: ['Crisp, golden dosa', 'Sambar is spot on', 'Fast delivery'], options: [{ label: 'Chutney', choices: ['Regular', 'Extra chutney'], default: 'Regular' }] },
  { id: 'idli-vada', restaurantId: 'udupi', name: 'Idli Vada Combo', price: 99, diet: 'veg', vegan: true, allergens: [], kcal: 380, proteinG: 11, spice: 1, traits: ['warm', 'light'], meals: ['breakfast', 'snack'], reviews: ['Soft idlis', 'Crispy vada', 'Light breakfast'] },
  { id: 'filter-coffee', restaurantId: 'udupi', name: 'Filter Coffee', price: 49, diet: 'veg', jain: true, allergens: ['dairy'], kcal: 90, proteinG: 3, spice: 0, traits: ['warm', 'drink'], meals: ['breakfast', 'snack'], reviews: ['Strong decoction', 'Just the right sugar', 'Arrives hot'] },

  // Brew Lab
  { id: 'cold-coffee', restaurantId: 'brewlab', name: 'Cold Coffee', price: 149, diet: 'veg', jain: true, fasting: true, allergens: ['dairy'], kcal: 180, proteinG: 6, spice: 0, traits: ['cool', 'drink', 'sweet'], meals: ['breakfast', 'lunch', 'snack', 'late'], reviews: ['Thick and creamy', 'Not too sweet', 'Big glass'], options: [{ label: 'Sugar', choices: ['No sugar', 'Less', 'Regular'], default: 'Regular' }] },
  { id: 'masala-chai', restaurantId: 'brewlab', name: 'Masala Chai', price: 59, diet: 'veg', jain: true, allergens: ['dairy'], kcal: 110, proteinG: 3, spice: 1, traits: ['warm', 'drink'], meals: ['breakfast', 'snack', 'late'], reviews: ['Proper adrak chai', 'Comes in a kulhad', 'Perfect in the rain'] },

  // Midnight Momos
  { id: 'veg-momos', restaurantId: 'momos', name: 'Veg Steamed Momos', price: 139, diet: 'veg', allergens: ['gluten', 'soy'], kcal: 330, proteinG: 9, spice: 2, traits: ['warm', 'light'], meals: ['snack', 'dinner', 'late'], reviews: ['Thin wrappers', 'Fiery red chutney', 'Great late at night'] },
  { id: 'chicken-momos', restaurantId: 'momos', name: 'Chicken Steamed Momos', price: 169, diet: 'nonveg', allergens: ['gluten', 'soy'], kcal: 360, proteinG: 22, spice: 2, traits: ['warm', 'light'], meals: ['snack', 'dinner', 'late'], reviews: ['Juicy filling', 'Generous portion', 'Chutney has a kick'] },

  // Mithai Ghar
  { id: 'rose-milk', restaurantId: 'mithai', name: 'Rose Milk', price: 79, diet: 'veg', jain: true, fasting: true, allergens: ['dairy'], kcal: 210, proteinG: 7, spice: 0, traits: ['cool', 'drink', 'sweet'], meals: ['lunch', 'snack', 'dinner'], reviews: ['Chilled and fragrant', 'Not syrupy', 'Big bottle'] },
  { id: 'gulab-jamun', restaurantId: 'mithai', name: 'Gulab Jamun (2 pcs)', price: 89, diet: 'veg', allergens: ['dairy', 'gluten'], kcal: 300, proteinG: 4, spice: 0, traits: ['sweet', 'warm'], meals: ['snack', 'dinner', 'late'], reviews: ['Soft and syrupy', 'Served warm', 'Not too sweet'] },

  // Annapurna Thali
  { id: 'veg-thali', restaurantId: 'annapurna', name: 'Gujarati Thali', price: 279, diet: 'veg', allergens: ['dairy', 'gluten'], kcal: 850, proteinG: 22, spice: 1, traits: ['warm', 'comfort', 'filling'], meals: ['lunch', 'dinner'], reviews: ['Endless variety', 'Sweet-salty balance', 'Very filling'] },
  { id: 'vrat-thali', restaurantId: 'annapurna', name: 'Vrat Thali', price: 249, diet: 'veg', jain: true, fasting: true, allergens: ['dairy', 'nuts'], kcal: 690, proteinG: 15, spice: 1, traits: ['warm', 'comfort'], meals: ['lunch', 'dinner'], reviews: ['Sabudana khichdi is great', 'Kuttu puri, no shortcuts', 'Feels homemade'] },
]

export const DISH_BY_ID = Object.fromEntries(MENU.map(d => [d.id, d])) as Record<DishId, Dish>
