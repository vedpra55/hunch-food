import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Mood } from '../components/hunch/moods'
import type { SkyMode } from '../design/sky'
import { findAddress, paymentById, type Address } from '../data/account'
import { DISH_BY_ID } from '../data/menu'
import { RESTAURANT_BY_ID } from '../data/restaurants'
import { addressesFor, scenarioById } from '../data/scenarios'
import { openKitchens, parse, plan as makePlan, search, totals, type CartLine, type Plan } from '../domain/chat'
import { CHAT, NUDGE, ONBOARD, ORDER, PROFILE, REORDER } from '../domain/copy'
import { betterDeal, delivery, reorder as reorderLines, type BetterDeal } from '../domain/orders'
import { buildHome, nudgeId } from '../domain/recommend'
import { ruleChips } from '../domain/rules'
import { clockLabel, DAY_NAMES, mealAt } from '../domain/time'
import type { Allergen, Ask, Context, Diet, Dish, GoalKind, HomeModel, IconKey, NotForMe, PastOrder, Prompt, Restaurant, RuleId, Suggestion, UserProfile } from '../domain/types'

export type CheckoutStatus = 'open' | 'paying' | 'failed' | 'paid' | 'dismissed'

export type Msg =
  | { id: string; type: 'home' }
  /** The three onboarding taps; `summary` once answered */
  | { id: string; type: 'onboarding'; summary?: string }
  | { id: string; type: 'user'; text: string }
  | { id: string; type: 'hunch'; text: string }
  | { id: string; type: 'results'; text: string; items: Suggestion[]; refine: Prompt[]; query: string }
  | { id: string; type: 'plan'; text: string; plan: Plan; ordered: boolean }
  | {
      id: string
      type: 'checkout'
      lines: CartLine[]
      status: CheckoutStatus
      /** Offer discovery: found when checkout opens, cleared once answered */
      deal?: BetterDeal
      /** Set after switching, to say what was saved */
      saved?: { place: string; saving: number }
      error?: string
      /** Scheduled delivery, "20:30" (the proactive nudge) */
      scheduleAt?: string
    }
  | { id: string; type: 'tracking'; text?: string; orderId: string }

export type OrderStatus = 'scheduled' | 'cooking' | 'picked' | 'near' | 'delivered' | 'cancelled'

export interface Order {
  id: string
  dish: Dish
  restaurant: Restaurant
  kitchens: number
  rider: string
  etaTotal: number
  etaLeft: number
  status: OrderStatus
  amount: number
  paymentId: string
  /** Delivered at, e.g. "8:47 pm" */
  deliveredAt?: string
  confirmingCancel?: boolean
  rating?: 'up' | 'down'
  /** "8:30 pm" for a scheduled order */
  arrivesAt?: string
  /** "8:00 pm": when the kitchen starts on a scheduled order */
  startsAt?: string
  /** Placed with "Just this once": rating it doesn't teach Hunch anything */
  noLearning?: boolean
}

export interface OnboardingAnswers {
  diet: Diet
  allergies: Allergen[]
  goal?: GoalKind
}

export interface ConversationState {
  scenarioId: string
  user: UserProfile
  ctx: Context
  thread: Msg[]
  cart: CartLine[]
  working?: string
  listening: boolean
  mood?: Mood
  sheet?: Suggestion
  /** Which bottom sheet is open besides the dish sheet */
  picker?: 'today' | 'address' | 'payment' | 'addAddress' | 'diet' | 'goal'
  /** Profile → What Hunch knows, over the conversation */
  profile: boolean
  /** The push notification the proactive moment arrives with */
  banner?: string
  /** Privacy: the next order doesn't change what Hunch knows */
  justOnce: boolean
  addresses: Address[]
  addressId: string
  paymentId: string
  orders: Record<string, Order>
  /** Dev: compress time so tracking plays out in a minute */
  fastClock: boolean
  /** Dev: the next payment is declined */
  failNextPayment: boolean
  /** Dev: the Today card's sky as a colour moment or a subtle tint */
  sky: SkyMode
}

let seq = 0
const id = () => `m${++seq}`

/** Demo clock: one "minute" of delivery takes this long in fast mode. */
export const FAST_MINUTE_MS = 1500
const RIDERS = ['Arjun', 'Imran', 'Sneha', 'Ravi']

function initial(scenarioId: string, prev?: Pick<ConversationState, 'fastClock' | 'failNextPayment' | 'sky'>): ConversationState {
  const s = scenarioById(scenarioId)
  const orders: Record<string, Order> = {}
  const a = s.ctx.activeOrder
  if (a) {
    // A stage that opens mid-delivery: the order is already live and keeps moving.
    const dish = DISH_BY_ID[a.dishId]
    const restaurant = RESTAURANT_BY_ID[dish.restaurantId]
    orders.live = { id: 'live', dish, restaurant, kitchens: 1, rider: a.rider, etaTotal: restaurant.etaMin, etaLeft: a.etaMin, status: 'picked', amount: dish.price, paymentId: 'gpay' }
  }
  const addresses = addressesFor(s)
  const n = buildHome(s.user, s.ctx).nudge
  return {
    scenarioId: s.id,
    user: s.user,
    ctx: s.ctx,
    // A new person answers three taps before the first suggestion.
    thread: [{ id: id(), type: s.user.onboarded === false ? 'onboarding' : 'home' }],
    cart: [],
    listening: false,
    profile: false,
    justOnce: false,
    banner: n ? NUDGE.banner(s.ctx.forecast?.kind === 'rain' ? clockLabel(s.ctx.forecast.at) : undefined, n.pick.dish.name, clockLabel(n.at)) : undefined,
    addresses,
    addressId: addresses[0].id,
    paymentId: 'gpay',
    orders,
    fastClock: prev?.fastClock ?? true,
    failNextPayment: prev?.failNextPayment ?? false,
    sky: prev?.sky ?? 'moment',
  }
}

/** Hunch's timings: long enough to feel considered, short enough to never feel slow. */
const T = { think: 1100, plan: 1500, pay: 1400, listen: 2200, mood: 2400 }

/** Where an order is, from how much of its time is left. */
function statusFor(o: Order): OrderStatus {
  if (o.status === 'cancelled' || o.status === 'delivered') return o.status
  if (o.etaLeft <= 0) return 'delivered'
  // Scheduled: the kitchen hasn't started; it starts etaTotal minutes before delivery.
  if (o.etaLeft > o.etaTotal) return 'scheduled'
  if (o.etaLeft <= 3) return 'near'
  if (o.etaLeft <= Math.ceil(o.etaTotal * 0.55)) return 'picked'
  return 'cooking'
}

const clock = (d: Date) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })

/** Minutes from now until a local "HH:MM" today. */
function minutesUntil(now: Date, hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return Math.max(0, h * 60 + m - (now.getHours() * 60 + now.getMinutes()))
}

const pad = (n: number) => String(n).padStart(2, '0')
const isoLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`

const GOAL_DAYS = 30
/** "26 Nov": goals always end; onboarding sets one a month out. */
const shortDate = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

export function useConversation(startScenario: string) {
  const [state, setState] = useState(() => initial(startScenario))
  // Mirrors `state` for async flows; kept in sync inside `set` and `reset`.
  const ref = useRef(state)
  const epoch = useRef(0)

  const set = useCallback((patch: Partial<ConversationState> | ((s: ConversationState) => Partial<ConversationState>)) => {
    setState(prev => {
      const next = { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }
      ref.current = next
      return next
    })
  }, [])

  const push = useCallback((...msgs: Msg[]) => set(s => ({ thread: [...s.thread, ...msgs] })), [set])
  const update = useCallback(
    (msgId: string, patch: Partial<Msg>) => set(s => ({ thread: s.thread.map(m => (m.id === msgId ? ({ ...m, ...patch } as Msg) : m)) })),
    [set],
  )
  const updateOrder = useCallback((orderId: string, patch: Partial<Order>) => set(s => ({ orders: { ...s.orders, [orderId]: { ...s.orders[orderId], ...patch } } })), [set])

  /** Resolves after `ms`, unless the conversation was reset meanwhile (then never resolves). */
  const wait = useCallback((ms: number) => {
    const e = epoch.current
    return new Promise<void>(resolve => setTimeout(() => e === epoch.current && resolve(), ms))
  }, [])

  const flash = useCallback(
    async (mood: Mood) => {
      set({ mood })
      await wait(T.mood)
      if (ref.current.mood === mood) set({ mood: undefined })
    },
    [set, wait],
  )

  const reset = useCallback((scenarioId: string) => {
    epoch.current++
    const next = initial(scenarioId, ref.current)
    ref.current = next
    setState(next)
  }, [])

  // ---------- the delivery clock ----------

  useEffect(() => {
    const t = setInterval(
      () => {
        const s = ref.current
        const live = Object.values(s.orders).filter(o => o.status !== 'delivered' && o.status !== 'cancelled')
        if (!live.length) return
        const orders = { ...s.orders }
        let delivered = false
        for (const o of live) {
          const next = { ...o, etaLeft: Math.max(0, o.etaLeft - 1) }
          next.status = statusFor(next)
          if (next.status !== 'cooking' && next.status !== 'scheduled') next.confirmingCancel = false
          if (next.status === 'delivered') {
            next.deliveredAt = o.arrivesAt ?? clock(new Date(s.ctx.now.getTime() + o.etaTotal * 60_000))
            delivered = true
          }
          orders[o.id] = next
        }
        set({ orders })
        if (delivered) flash('found')
      },
      state.fastClock ? FAST_MINUTE_MS : 60_000,
    )
    return () => clearInterval(t)
  }, [state.fastClock, set, flash])

  // ---------- dishes and cart ----------

  const openSheet = useCallback((s: Suggestion) => set({ sheet: s }), [set])
  const closeSheet = useCallback(() => set({ sheet: undefined }), [set])

  const openCheckoutMsg = () => ref.current.thread.find(m => m.type === 'checkout' && (m.status === 'open' || m.status === 'failed'))

  /** Keep the cart and an open checkout card in step. */
  const setLines = useCallback(
    (lines: CartLine[]) => {
      const m = openCheckoutMsg()
      set({ cart: lines })
      if (m?.type !== 'checkout') return
      if (!lines.length) {
        update(m.id, { status: 'dismissed', lines: m.lines, deal: undefined })
        push({ id: id(), type: 'hunch', text: ORDER.emptyCart() })
        set({ mood: undefined })
        return
      }
      const { user, ctx, addresses, addressId } = ref.current
      update(m.id, { lines, deal: m.saved ? undefined : betterDeal(lines, user, ctx, findAddress(addresses, addressId)) })
    },
    [set, update, push],
  )

  const add = useCallback(
    (s: Suggestion, qty: number, customisation: string[]) => {
      const cart = ref.current.cart
      const existing = cart.find(l => l.dishId === s.dish.id)
      const lines = existing ? cart.map(l => (l.dishId === s.dish.id ? { ...l, qty: l.qty + qty } : l)) : [...cart, { dishId: s.dish.id, qty, customisation: customisation.length ? customisation : undefined }]
      set({ sheet: undefined })
      setLines(lines)
    },
    [set, setLines],
  )

  /** Change a quantity from the checkout card; 0 removes the line. */
  const changeQty = useCallback(
    (dishId: CartLine['dishId'], delta: number) => {
      const lines = ref.current.cart.map(l => (l.dishId === dishId ? { ...l, qty: l.qty + delta } : l)).filter(l => l.qty > 0)
      setLines(lines)
    },
    [setLines],
  )

  const checkout = useCallback(
    (lines: CartLine[], scheduleAt?: string) => {
      const { user, ctx, addresses, addressId } = ref.current
      // Offer discovery happens here, between the cart and paying. A scheduled usual is a promise: no switching.
      const deal = scheduleAt ? undefined : betterDeal(lines, user, ctx, findAddress(addresses, addressId))
      set({ cart: lines, sheet: undefined, mood: deal ? 'delighted' : 'focused' })
      push({ id: id(), type: 'checkout', lines, status: 'open', deal, scheduleAt })
    },
    [set, push],
  )

  const orderAgain = useCallback((s: Suggestion) => checkout([{ dishId: s.dish.id, qty: 1, customisation: s.customisation }]), [checkout])
  const viewCart = useCallback(() => checkout(ref.current.cart), [checkout])

  const switchDeal = useCallback(
    (msgId: string) => {
      const m = ref.current.thread.find(x => x.id === msgId)
      if (m?.type !== 'checkout' || !m.deal) return
      const { deal } = m
      const lines = m.lines.map(l => (l.dishId === deal.dishId ? { dishId: deal.to.dish.id, qty: l.qty } : l))
      update(msgId, { lines, deal: undefined, saved: { place: deal.to.restaurant.name, saving: deal.saving } })
      set({ cart: lines, mood: 'focused' })
    },
    [update, set],
  )

  const keepDeal = useCallback((msgId: string) => update(msgId, { deal: undefined }), [update])

  const orderPlan = useCallback(
    (msgId: string) => {
      const m = ref.current.thread.find(x => x.id === msgId)
      if (m?.type !== 'plan') return
      update(msgId, { ordered: true })
      checkout(m.plan.lines)
    },
    [update, checkout],
  )

  const changePlan = useCallback(() => push({ id: id(), type: 'hunch', text: CHAT.change() }), [push])

  // ---------- address and payment ----------

  const openPicker = useCallback((picker: ConversationState['picker']) => set({ picker }), [set])
  const closePicker = useCallback(() => set({ picker: undefined }), [set])

  const chooseAddress = useCallback(
    (addressId: string) => {
      set({ addressId, picker: undefined })
      const m = openCheckoutMsg()
      // A new address can change which deals reach you.
      if (m?.type === 'checkout' && !m.saved) {
        const { user, ctx, addresses } = ref.current
        if (!m.scheduleAt) update(m.id, { deal: betterDeal(m.lines, user, ctx, findAddress(addresses, addressId)) })
      }
    },
    [set, update],
  )

  const choosePayment = useCallback(
    (paymentId: string) => {
      set({ paymentId, picker: undefined })
      const m = openCheckoutMsg()
      if (m?.type === 'checkout' && m.status === 'failed') update(m.id, { status: 'open', error: undefined })
    },
    [set, update],
  )

  // ---------- paying and after ----------

  const pay = useCallback(
    async (msgId: string) => {
      const m = ref.current.thread.find(x => x.id === msgId)
      if (m?.type !== 'checkout' || (m.status !== 'open' && m.status !== 'failed')) return
      const address = findAddress(ref.current.addresses, ref.current.addressId)
      if (delivery(m.lines, address).unreachable.length) return
      update(msgId, { status: 'paying', error: undefined, deal: undefined })
      set({ working: CHAT.status.placing, mood: 'focused' })
      await wait(T.pay)

      const s = ref.current
      const method = paymentById(s.paymentId)
      if (s.failNextPayment && !method.cash) {
        update(msgId, { status: 'failed', error: ORDER.payFailed(method.label.replace(/^UPI · /, '')) })
        set({ working: undefined, failNextPayment: false })
        flash('care')
        return
      }

      const t = totals(m.lines)
      const { etaMin } = delivery(m.lines, address)
      const orderId = id()
      // Scheduled: count down to the promised time; the kitchen starts etaMin before it.
      const until = m.scheduleAt ? minutesUntil(s.ctx.now, m.scheduleAt) : etaMin
      const order: Order = {
        id: orderId,
        dish: DISH_BY_ID[m.lines[0].dishId],
        restaurant: t.restaurants[0],
        kitchens: t.restaurants.length,
        rider: RIDERS[seq % RIDERS.length],
        etaTotal: etaMin,
        etaLeft: until,
        status: until > etaMin ? 'scheduled' : 'cooking',
        amount: t.toPay,
        paymentId: method.id,
        arrivesAt: m.scheduleAt ? clockLabel(m.scheduleAt) : undefined,
        // Kitchens plan in 5-minute slots: start a little early, never late.
        startsAt: m.scheduleAt ? clock(new Date(s.ctx.now.getTime() + Math.floor((until - etaMin) / 5) * 5 * 60_000)) : undefined,
        noLearning: s.justOnce || undefined,
      }
      const past: PastOrder = { id: orderId, at: isoLocal(s.ctx.now), lines: m.lines, amount: t.toPay }
      update(msgId, { status: 'paid' })
      set(st => ({
        cart: [],
        working: undefined,
        justOnce: false,
        orders: { ...st.orders, [orderId]: order },
        // A scheduled usual answers today's nudge.
        ctx: m.scheduleAt ? { ...st.ctx, answered: [...st.ctx.answered, nudgeId(st.ctx.now)] } : st.ctx,
        user: { ...st.user, orderCount: st.user.orderCount + (st.justOnce ? 0 : 1), history: [past, ...(st.user.history ?? [])] },
      }))
      // The confirmation lives inside the tracking card: one turn, one card.
      const text = m.scheduleAt ? NUDGE.scheduled(clockLabel(m.scheduleAt), t.restaurants[0].name) : t.restaurants.length === 1 ? CHAT.placed() : CHAT.placedMany(t.restaurants.length)
      push({ id: id(), type: 'tracking', orderId, text })
      flash('found')
    },
    [update, set, wait, push, flash],
  )

  const notNow = useCallback(
    (msgId: string) => {
      update(msgId, { status: 'dismissed', deal: undefined })
      set({ mood: undefined })
      push({ id: id(), type: 'hunch', text: CHAT.notNow() })
    },
    [update, set, push],
  )

  const askCancel = useCallback((orderId: string, yes: boolean) => updateOrder(orderId, { confirmingCancel: yes }), [updateOrder])

  const cancel = useCallback(
    (orderId: string) => {
      const o = ref.current.orders[orderId]
      if (!o || (o.status !== 'cooking' && o.status !== 'scheduled')) return
      updateOrder(orderId, { status: 'cancelled', confirmingCancel: false })
      flash('care')
    },
    [updateOrder, flash],
  )

  const rate = useCallback(
    (orderId: string, rating: 'up' | 'down') => {
      const o = ref.current.orders[orderId]
      if (!o) return
      updateOrder(orderId, { rating })
      set(s => {
        const usuals = s.user.usuals
        const has = usuals.find(u => u.dishId === o.dish.id)
        const history = (s.user.history ?? []).map(h => (h.id === orderId ? { ...h, rating } : h))
        // "Just this once": the rating is kept on the order, nothing is learned from it.
        if (o.noLearning) return { user: { ...s.user, history } }
        return {
          user:
            rating === 'up'
              ? { ...s.user, history, usuals: has ? usuals.map(u => (u === has ? { ...u, times: u.times + 1 } : u)) : [...usuals, { dishId: o.dish.id, times: 1, meal: mealAt(s.ctx.now) }] }
              : { ...s.user, history, notForMe: [...s.user.notForMe, { dishId: o.dish.id, reason: 'disliked' }] },
        }
      })
      if (rating === 'up') flash('found')
    },
    [updateOrder, set, flash],
  )

  // ---------- personalisation in the moment ----------

  const openToday = useCallback(() => set({ picker: 'today' }), [set])
  const closeToday = closePicker

  /** Switch a situational rule off (or back on) for today. */
  const toggleRule = useCallback(
    (ruleId: RuleId) => {
      const s = ref.current
      const label = ruleChips(s.user, { ...s.ctx, offToday: [] }).find(r => r.id === ruleId)?.label ?? ''
      const off = s.ctx.offToday.includes(ruleId)
      set({ ctx: { ...s.ctx, offToday: off ? s.ctx.offToday.filter(x => x !== ruleId) : [...s.ctx.offToday, ruleId] } })
      push({ id: id(), type: 'hunch', text: off ? CHAT.ruleOn(label) : CHAT.ruleOff(label) })
    },
    [set, push],
  )

  const answerAsk = useCallback(
    (ask: Ask, yes: boolean) => {
      const day = ref.current.ctx.now.getDay()
      set(s =>
        yes
          ? { user: { ...s.user, vegDays: s.user.vegDays.map(v => (v.day === day ? { ...v, confirmed: true, source: 'told' } : v)) } }
          : { user: { ...s.user, vegDays: s.user.vegDays.filter(v => v.day !== day) }, ctx: { ...s.ctx, answered: [...s.ctx.answered, ask.id] } },
      )
      push({ id: id(), type: 'hunch', text: yes ? CHAT.ask.remembered(DAY_NAMES[day]) : CHAT.ask.declined() })
    },
    [set, push],
  )

  const notForMe = useCallback(
    (s: Suggestion, reason: NotForMe['reason']) => {
      const entry: NotForMe = reason === 'not-this-place' ? { restaurantId: s.restaurant.id, reason } : { dishId: s.dish.id, reason }
      set(st => ({
        sheet: undefined,
        user: { ...st.user, notForMe: reason === 'not-today' ? st.user.notForMe : [...st.user.notForMe, entry], spice: reason === 'too-spicy' ? (Math.max(0, st.user.spice - 1) as UserProfile['spice']) : st.user.spice },
      }))
      push({ id: id(), type: 'hunch', text: reason === 'not-this-place' ? CHAT.notForMe[reason](s.restaurant.name) : CHAT.notForMe[reason]() })
    },
    [set, push],
  )

  // ---------- the person: onboarding ----------

  /** Three taps, then the first Today card. Nothing is assumed beyond what they chose. */
  const finishOnboarding = useCallback(
    (a: OnboardingAnswers | null) => {
      const s = ref.current
      const m = s.thread.find(x => x.type === 'onboarding')
      const until = new Date(s.ctx.now.getTime() + GOAL_DAYS * 86_400_000)
      const goal: UserProfile['goal'] = a?.goal ? { kind: a.goal, until: isoLocal(until).slice(0, 10), source: 'told', budget: a.goal === 'budget' ? 250 : undefined } : undefined
      const diet = a?.diet ?? 'nonveg'
      const summary = a
        ? [ONBOARD.diets.find(d => d.id === diet)!.label, a.allergies.length ? `no ${a.allergies.join(', ')}` : '', goal ? PROFILE.goalLabel[goal.kind] : '']
            .filter(Boolean)
            .join(' · ')
        : 'Skipped'
      if (m) update(m.id, { summary })
      set(st => ({ user: { ...st.user, onboarded: true, diet, allergies: a?.allergies ?? [], goal }, mood: 'delighted' }))
      push({ id: id(), type: 'hunch', text: ONBOARD.done(goal && PROFILE.goalLabel[goal.kind], shortDate(until)) }, { id: id(), type: 'home' })
      flash('delighted')
    },
    [update, set, push, flash],
  )

  // ---------- the person: profile ----------

  const openProfile = useCallback(() => set({ profile: true, sheet: undefined }), [set])
  const closeProfile = useCallback(() => set({ profile: false, picker: undefined }), [set])
  /** Profile edits: what Hunch knows, changed by the person. */
  const updateUser = useCallback((patch: (u: UserProfile) => Partial<UserProfile>) => set(s => ({ user: { ...s.user, ...patch(s.user) } })), [set])
  /** Goals always end: a new one runs 30 days from today. */
  const setGoal = useCallback(
    (kind?: GoalKind) =>
      set(s => {
        const until = isoLocal(new Date(s.ctx.now.getTime() + GOAL_DAYS * 86_400_000)).slice(0, 10)
        return { user: { ...s.user, goal: kind ? { kind, until, source: 'told', budget: kind === 'budget' ? 250 : undefined } : undefined } }
      }),
    [set],
  )
  const setJustOnce = useCallback((justOnce: boolean) => set({ justOnce }), [set])

  /** Keep what they told Hunch; drop everything it learned. */
  const forgetLearned = useCallback(() => {
    set(s => ({
      user: {
        ...s.user,
        usuals: [],
        favouriteRestaurants: [],
        vegDays: s.user.vegDays.filter(v => v.source === 'told'),
        goal: s.user.goal?.source === 'told' ? s.user.goal : undefined,
        mealTimes: undefined,
        priceComfort: 0,
        spice: 1,
      },
    }))
  }, [set])

  const addAddress = useCallback(
    (a: Omit<Address, 'id'>) => {
      const address = { ...a, id: id() }
      set(s => ({ addresses: [...s.addresses, address] }))
      chooseAddress(address.id)
    },
    [set, chooseAddress],
  )

  // ---------- the person: history ----------

  /** Order a past order again, as it can be ordered today. */
  const reorder = useCallback(
    (pastId?: string) => {
      const s = ref.current
      const past = pastId ? s.user.history?.find(h => h.id === pastId) : s.user.history?.[0]
      // From Profile, say it in the thread; asked in the conversation, the request is already there.
      if (pastId && past) push({ id: id(), type: 'user', text: `Repeat my ${RESTAURANT_BY_ID[DISH_BY_ID[past.lines[0].dishId].restaurantId].name} order` })
      set({ profile: false })
      if (!past) {
        push({ id: id(), type: 'hunch', text: REORDER.none() })
        return
      }
      const { lines, missing } = reorderLines(past, s.user, s.ctx)
      if (missing.length) {
        // A closed kitchen is said once, however many of its dishes are missing.
        const reasons = [...new Set(missing.map(x => (x.why === 'closed' ? REORDER.why.closed(x.restaurant.name, clockLabel(x.restaurant.opens)) : REORDER.why[x.why](x.dish.name))))]
        push({ id: id(), type: 'hunch', text: REORDER.missing(reasons, !lines.length) })
        flash('care')
      }
      if (lines.length) checkout(lines)
    },
    [push, set, flash, checkout],
  )

  // ---------- talking ----------

  /** `text` is what the user sees they said; `query` is what Hunch acts on (refinements add to the last request). */
  const send = useCallback(
    async (text: string, query = text) => {
      const s = ref.current
      if (s.working) return
      push({ id: id(), type: 'user', text })

      const live = Object.values(s.orders).find(o => o.status !== 'delivered' && o.status !== 'cancelled')
      if (live && /where|rider|how long|status/i.test(text)) {
        await wait(600)
        push({ id: id(), type: 'hunch', text: CHAT.track(live.etaLeft, live.rider) })
        return
      }

      if (/\b(again|repeat|last order|same as last)\b/i.test(text) && s.user.history?.length) {
        await wait(600)
        reorder()
        return
      }

      const intent = parse(query)
      const planning = intent.kind === 'plan'
      set({ working: planning ? CHAT.status.planning(intent.people ?? 2) : CHAT.status.searching(openKitchens(s.ctx)), mood: 'thinking' })
      await wait(planning ? T.plan : T.think)

      const { user, ctx } = ref.current
      if (planning) {
        const p = makePlan(intent, user, ctx)
        push({ id: id(), type: 'plan', text: p.text, plan: p, ordered: false })
        set({ working: undefined })
        flash(p.lines.length ? 'found' : 'care')
      } else {
        const r = search(intent, user, ctx)
        push({ id: id(), type: 'results', text: r.text, items: r.items, refine: r.refine, query })
        set({ working: undefined })
        flash(r.items.length && !r.items[0].dish.soldOut ? 'found' : 'care')
      }
    },
    [push, set, wait, flash, reorder],
  )

  const mic = useCallback(async () => {
    const s = ref.current
    if (s.listening) return set({ listening: false, mood: undefined })
    set({ listening: true, mood: 'listening' })
    await wait(T.listen)
    if (!ref.current.listening) return
    set({ listening: false, mood: undefined })
    const home = buildHome(ref.current.user, ref.current.ctx)
    send(home.stage === 'dinner' ? CHAT.heard.dinner : CHAT.heard.default)
  }, [set, wait, send])

  const refine = useCallback(
    (msgId: string, p: Prompt) => {
      const m = ref.current.thread.find(x => x.id === msgId)
      if (m?.type !== 'results') return
      // "Anything good nearby" starts fresh; other refinements narrow the last request.
      send(p.text, p.icon === 'shuffle' ? p.text : `${m.query}, ${p.text}`)
    },
    [send],
  )

  // ---------- the proactive moment ----------

  const dismissBanner = useCallback(() => set({ banner: undefined }), [set])

  const scheduleNudge = useCallback(() => {
    const n = buildHome(ref.current.user, ref.current.ctx).nudge
    if (!n) return
    set({ banner: undefined })
    checkout([{ dishId: n.pick.dish.id, qty: 1, customisation: n.pick.customisation }], n.at)
  }, [set, checkout])

  const dismissNudge = useCallback(() => {
    set(s => ({ banner: undefined, ctx: { ...s.ctx, answered: [...s.ctx.answered, nudgeId(s.ctx.now)] } }))
    push({ id: id(), type: 'hunch', text: NUDGE.quiet() })
  }, [set, push])

  // ---------- dev ----------

  const setDev = useCallback((patch: Partial<Pick<ConversationState, 'fastClock' | 'failNextPayment' | 'sky'>>) => set(patch), [set])

  // ---------- derived ----------

  const home: HomeModel = useMemo(() => buildHome(state.user, state.ctx), [state.user, state.ctx])
  const live = Object.values(state.orders).find(o => o.status !== 'delivered' && o.status !== 'cancelled')
  const stageMood: Mood = live ? 'onTheWay' : home.stage === 'late' ? 'sleepy' : 'idle'
  const liveStatus = live && (live.status === 'scheduled' ? ORDER.status.scheduled(live.arrivesAt ?? '') : live.status === 'near' ? ORDER.status.near : CHAT.status.onTheWay(live.etaLeft))
  const status = state.listening ? CHAT.status.listening : (state.working ?? liveStatus)
  const openCheckout = state.thread.some(m => m.type === 'checkout' && (m.status === 'open' || m.status === 'paying' || m.status === 'failed'))
  const goalIcon: Record<string, IconKey> = { cutting: 'target', protein: 'barbell', light: 'leaf', budget: 'tag' }
  const todayRules = ruleChips(state.user, { ...state.ctx, offToday: [] }).map(r => ({
    id: r.id,
    label: r.label,
    icon: (r.id === 'fasting' ? 'lotus' : r.id === 'vegDay' ? 'leaf' : goalIcon[state.user.goal?.kind ?? 'cutting']) as IconKey,
    on: !state.ctx.offToday.includes(r.id),
  }))

  return {
    state,
    home,
    mood: state.mood ?? stageMood,
    status,
    openCheckout,
    todayRules,
    latest: () => ref.current,
    /** Home as it is right now (for async flows that outlive a render) */
    homeNow: () => buildHome(ref.current.user, ref.current.ctx),
    wait,
    reset,
    send,
    mic,
    refine,
    openSheet,
    closeSheet,
    add,
    changeQty,
    orderAgain,
    viewCart,
    switchDeal,
    keepDeal,
    orderPlan,
    changePlan,
    openPicker,
    closePicker,
    chooseAddress,
    choosePayment,
    pay,
    notNow,
    askCancel,
    cancel,
    rate,
    openToday,
    closeToday,
    toggleRule,
    answerAsk,
    notForMe,
    finishOnboarding,
    openProfile,
    closeProfile,
    updateUser,
    setGoal,
    setJustOnce,
    forgetLearned,
    addAddress,
    reorder,
    dismissBanner,
    scheduleNudge,
    dismissNudge,
    setDev,
  }
}

export type ConversationApi = ReturnType<typeof useConversation>
