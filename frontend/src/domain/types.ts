import type photos from '../data/photos.json'

/** Every dish has exactly one photo; its id is the photo slug. */
export type DishId = Exclude<keyof typeof photos, '_note'>

/** 0 = Sunday … 6 = Saturday, same as Date#getDay */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type Meal = 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'late'

/** What a dish is. */
export type DishDiet = 'veg' | 'egg' | 'nonveg'
/** What a person eats. */
export type Diet = 'veg' | 'eggetarian' | 'nonveg' | 'jain' | 'vegan'
export type Allergen = 'dairy' | 'gluten' | 'nuts' | 'egg' | 'soy'
export type Trait = 'warm' | 'comfort' | 'light' | 'fresh' | 'cool' | 'sweet' | 'drink' | 'fried' | 'filling'

// ---------- catalogue ----------

export interface Restaurant {
  id: string
  name: string
  cuisine: string
  area: string
  distanceKm: number
  rating: number
  ratingCount: number
  /** Local time "HH:MM". `closes` earlier than `opens` means it closes after midnight. */
  opens: string
  closes: string
  /** Typical door-to-door minutes */
  etaMin: number
  /** ₹0 = free delivery */
  deliveryFee: number
  pureVeg: boolean
}

export interface DishOption {
  label: string
  choices: string[]
  default: string
}

export interface Dish {
  id: DishId
  restaurantId: string
  name: string
  price: number
  diet: DishDiet
  /** No onion, garlic or root vegetables */
  jain?: boolean
  vegan?: boolean
  /** Suitable for vrat / fasting days */
  fasting?: boolean
  allergens: Allergen[]
  kcal: number
  proteinG: number
  /** 0 mild … 3 very hot */
  spice: 0 | 1 | 2 | 3
  traits: Trait[]
  meals: Meal[]
  /** Three short phrases summarising reviews */
  reviews: [string, string, string]
  options?: DishOption[]
  /** Flat rupees off today */
  offerOff?: number
}

// ---------- the person ----------

/** Where a piece of knowledge came from. Shown in Profile → What Hunch knows. */
export type Source = 'told' | 'learned'

export interface VegDay {
  day: Weekday
  source: Source
  /** Inferred patterns only become rules after the user says "Remember". */
  confirmed: boolean
  /** Matching weeks seen */
  evidence: number
}

export type GoalKind = 'cutting' | 'protein' | 'light' | 'budget'

export interface Goal {
  kind: GoalKind
  /** ISO date (inclusive). Goals always end. */
  until: string
  /** Rupees per meal, for `budget` */
  budget?: number
  source: Source
}

export interface Fasting {
  name: string
  /** ISO date of day 1 */
  start: string
  days: number
}

export interface Usual {
  dishId: DishId
  times: number
  meal: Meal
  /** Customisation applied by default */
  customisation?: string[]
}

export interface NotForMe {
  dishId?: DishId
  restaurantId?: string
  reason: 'too-spicy' | 'too-pricey' | 'not-this-place' | 'not-today'
}

export interface UserProfile {
  firstName: string
  diet: Diet
  allergies: Allergen[]
  vegDays: VegDay[]
  fasting?: Fasting
  goal?: Goal
  usuals: Usual[]
  favouriteRestaurants: string[]
  notForMe: NotForMe[]
  /** Preferred heat, 0 … 3 */
  spice: 0 | 1 | 2 | 3
  /** Typical spend per meal, learned */
  priceComfort: number
  orderCount: number
}

// ---------- the moment ----------

export type RuleId = 'vegDay' | 'fasting' | 'goal'

export interface Weather {
  kind: 'rain' | 'clear' | 'hot' | 'cold'
  tempC: number
}

export interface ActiveOrder {
  dishId: DishId
  etaMin: number
  rider: string
}

export interface Context {
  now: Date
  weather: Weather
  area: string
  /** Situational rules the user switched off for today */
  offToday: RuleId[]
  /** Ask ids already answered */
  answered: string[]
  activeOrder?: ActiveOrder
}

// ---------- what Home shows ----------

export type Stage = 'first' | 'tracking' | Meal

export interface Suggestion {
  dish: Dish
  restaurant: Restaurant
  score: number
  /** One tag max: Usual › ₹X off › goal metric */
  tag?: string
  /** Up to 3 lowercase phrases, strongest first, written to read inside a sentence. */
  reasons: string[]
  open: boolean
  /** "Opens 7 pm" when closed */
  opensLabel?: string
  /** Prefilled from the user's usual */
  customisation?: string[]
}

export interface Group {
  id: string
  title: string
  items: Suggestion[]
}

export interface RuleChip {
  id: RuleId
  label: string
}

export interface Ask {
  id: string
  text: string
  yes: string
  no: string
}

export interface Tracking {
  dish: Dish
  restaurant: Restaurant
  etaMin: number
  rider: string
}

/** Icons carry one meaning each (HOME_SPEC icon map). The UI maps keys to Phosphor icons. */
export type IconKey =
  | 'sun' | 'moon' | 'rain' | 'hot' | 'cold' | 'clock' | 'pin'
  | 'leaf' | 'lotus' | 'target' | 'barbell' | 'fire' | 'bowl'
  | 'coffee' | 'egg' | 'cake' | 'cookie' | 'shuffle' | 'moped' | 'tag' | 'chat'

/** One piece of the Today card's context row, e.g. CloudRain "Light rain". */
export interface ContextItem {
  icon: IconKey
  text: string
  /** A situational rule the user can switch off for today */
  rule?: RuleId
}

/** Something the user can say with one tap. */
export interface Prompt {
  icon: IconKey
  text: string
}

export interface HomeModel {
  stage: Stage
  context: ContextItem[]
  line: string
  rules: RuleChip[]
  ask?: Ask
  /** The one suggestion on the Today card: the usual when it fits, otherwise the best fit. */
  pick?: Suggestion
  usual?: Suggestion
  /** Ranked rows behind the scenes; they choose the pick and feed replies. Not shown on Home. */
  groups: Group[]
  prompts: Prompt[]
  tracking?: Tracking
}
