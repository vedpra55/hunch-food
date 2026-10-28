import { createClient, type Session } from '@supabase/supabase-js'

/**
 * The real backend. Identity: a guest id kept in this browser, upgraded to a Supabase session
 * (email + 6-digit code) when the person first checks out. Both travel on every request, so the
 * guest's conversation and cart become theirs on sign-in.
 */

export const API = import.meta.env.VITE_API_URL as string | undefined
export const LIVE = !!API && !new URLSearchParams(location.search).has('demo')

export const supabase =
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
    ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
    : null

let session: Session | null = null
supabase?.auth.getSession().then(({ data }) => (session = data.session))
supabase?.auth.onAuthStateChange((_e, s) => (session = s))

function guestId() {
  try {
    let id = localStorage.getItem('hunch-guest')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('hunch-guest', id)
    }
    return id
  } catch {
    return 'guest-ephemeral'
  }
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'X-Guest-Id': guestId() }
  if (session?.access_token) h.Authorization = `Bearer ${session.access_token}`
  return h
}

export class ApiError extends Error {
  status: number
  body: Record<string, unknown>
  constructor(message: string, status: number, body: Record<string, unknown>) {
    super(message)
    this.status = status
    this.body = body
  }
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${API}${path}`, { method: init?.method ?? 'GET', headers: headers(), body: init?.body ? JSON.stringify(init.body) : undefined })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status, body)
  return body as T
}

/** One agent turn, as a stream of events (ack, step, say, cart, profile, done, error). Retried sends with the
 * same turn id are answered from the server's copy, never run twice. */
export async function chat(body: { text: string; turn_id: string }, onEvent: (e: AgentEvent) => void, signal?: AbortSignal) {
  const res = await fetch(`${API}/chat`, { method: 'POST', headers: headers(), body: JSON.stringify(body), signal })
  if (!res.ok || !res.body) {
    const b = await res.json().catch(() => ({}))
    throw new ApiError(b.error ?? 'Hunch could not reply', res.status, b)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let i
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, i)
      buf = buf.slice(i + 2)
      if (chunk.startsWith('data: ')) onEvent(JSON.parse(chunk.slice(6)))
    }
  }
}

export async function sendCode(email: string) {
  if (!supabase) throw new Error('Sign-in is not configured')
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
  if (error) throw error
}

export async function verifyCode(email: string, token: string) {
  if (!supabase) throw new Error('Sign-in is not configured')
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (error) throw error
  session = data.session
}

export async function signOut() {
  await supabase?.auth.signOut()
  session = null
}

// ---------- shapes from the API ----------

export interface DishCard {
  id: string
  name: string
  restaurant: string
  restaurant_id: string
  price: number
  diet: 'veg' | 'egg' | 'nonveg'
  photo: string
  eta_min: number
  distance_km: number
  open: boolean
  opens: string | null
  rating: number
  kcal: number
  protein_g: number
  offer: string | null
  offer_off: number
  times_ordered: number
  reasons: string[]
  review_summary: string[]
  description: string
}

export interface RestaurantCard {
  id: string
  name: string
  cuisines: string[]
  area: string
  rating: number
  rating_count: number
  price_for_two: number
  pure_veg: boolean
  photo: string
  distance_km: number
  delivers_here: boolean
  eta_min: number
  open: boolean
  opens: string | null
  offer: string | null
  top_dishes: { id: string; name: string; price: number; diet: string; photo: string }[]
}

export interface Menu {
  id: string
  name: string
  cuisines: string[]
  area: string
  rating: number
  photo: string
  delivers_here: boolean
  eta_min: number
  open: boolean
  opens: string | null
  offers: string[]
  categories: { name: string; dishes: { id: string; name: string; price: number; diet: string; photo: string; description: string; offer: string | null; rating: number }[] }[]
}

export interface Cart {
  restaurant: string | null
  lines: { id: string; name: string; price: number; qty: number; diet: string; photo: string; note: string }[]
  count: number
  item_total: number
  delivery_fee: number
  discount: number
  total: number
  offer_label: string
}

export interface OrderView {
  id: string
  restaurant: string
  status: string
  stage: 'draft' | 'awaiting_payment' | 'cooking' | 'on_the_way' | 'near' | 'delivered' | 'cancelled' | 'failed'
  eta_left: number
  arrives_at?: string
  items: { name: string; qty: number; price: number }[]
  item_total: number
  delivery_fee: number
  discount: number
  total: number
  offer_label: string
  method: 'online' | 'cod'
  address: string
  handoff: string
  eta_min: number
  phone: string
  can_cancel: boolean
  rating: string
  refund_id: string
}

export type Component =
  | { kind: 'dishes'; items: DishCard[] }
  | { kind: 'restaurants'; items: RestaurantCard[] }
  | { kind: 'menu'; restaurant: Menu }
  | { kind: 'choices'; options: string[]; multi: boolean }
  | { kind: 'collect'; missing: ('name' | 'phone' | 'address' | 'sign_in')[]; name: string; phone: string }
  // Live cards: drawn from the order as it is now, every time the thread is read.
  | { kind: 'checkout'; order_id: string; order: OrderView }
  | { kind: 'order'; order_id: string; order: OrderView }

export interface Step {
  id: string
  label: string
  summary?: string
  status?: 'running' | 'done'
}

export type AgentEvent =
  | { type: 'ack'; delta: string }
  | ({ type: 'step' } & Step)
  | { type: 'say'; delta: string }
  | { type: 'say_reset' }
  | { type: 'cart'; cart: Cart }
  | { type: 'profile'; profile: Profile }
  | { type: 'done'; message: StoredMessage; cart: Cart }
  | { type: 'error'; message: string; retry?: string }

export interface Area {
  id: string
  name: string
  city: string
  campus: boolean
}

export interface Profile {
  id: string
  name: string
  email: string
  phone: string
  signed_in: boolean
  diet: string
  allergies: string[]
  spice: number
  budget: number | null
  veg_days: number[]
  onboarded: boolean
}

export interface Home {
  hello: string
  line: string
  meal: string
  context: { icon: string; text: string; rule?: string }[]
  pick: DishCard | null
  usual: boolean
  prompts: string[]
  order: OrderView | null
  cart: Cart
}

export interface StoredMessage {
  id: number
  role: 'user' | 'hunch' | 'event'
  /** For events: cart, paid, payment_failed, cancelled, setup */
  kind: string
  text: string
  ack: string
  steps: Step[]
  components: Component[]
}
