import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Mood } from '../components/hunch/moods'
import { addressById, paymentById } from '../data/account'
import { DISH_BY_ID } from '../data/menu'
import { RESTAURANT_BY_ID } from '../data/restaurants'
import { scenarioById } from '../data/scenarios'
import { openKitchens, parse, plan as makePlan, search, totals, type CartLine, type Plan } from '../domain/chat'
import { CHAT, ORDER } from '../domain/copy'
import { betterDeal, delivery, type BetterDeal } from '../domain/orders'
import { buildHome } from '../domain/recommend'
import { ruleChips } from '../domain/rules'
import { DAY_NAMES, mealAt } from '../domain/time'
import type { Ask, Context, Dish, HomeModel, IconKey, NotForMe, Prompt, Restaurant, RuleId, Suggestion, UserProfile } from '../domain/types'

export type CheckoutStatus = 'open' | 'paying' | 'failed' | 'paid' | 'dismissed'

export type Msg =
  | { id: string; type: 'home' }
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
    }
  | { id: string; type: 'tracking'; text?: string; orderId: string }

export type OrderStatus = 'cooking' | 'picked' | 'near' | 'delivered' | 'cancelled'

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
  picker?: 'today' | 'address' | 'payment'
  addressId: string
  paymentId: string
  orders: Record<string, Order>
  /** Dev: compress time so tracking plays out in a minute */
  fastClock: boolean
  /** Dev: the next payment is declined */
  failNextPayment: boolean
}

let seq = 0
const id = () => `m${++seq}`

/** Demo clock: one "minute" of delivery takes this long in fast mode. */
export const FAST_MINUTE_MS = 1500
const RIDERS = ['Arjun', 'Imran', 'Sneha', 'Ravi']

function initial(scenarioId: string, prev?: Pick<ConversationState, 'fastClock' | 'failNextPayment'>): ConversationState {
  const s = scenarioById(scenarioId)
  const orders: Record<string, Order> = {}
  const a = s.ctx.activeOrder
  if (a) {
    // A stage that opens mid-delivery: the order is already live and keeps moving.
    const dish = DISH_BY_ID[a.dishId]
    const restaurant = RESTAURANT_BY_ID[dish.restaurantId]
    orders.live = { id: 'live', dish, restaurant, kitchens: 1, rider: a.rider, etaTotal: restaurant.etaMin, etaLeft: a.etaMin, status: 'picked', amount: dish.price, paymentId: 'gpay' }
  }
  return {
    scenarioId: s.id,
    user: s.user,
    ctx: s.ctx,
    thread: [{ id: id(), type: 'home' }],
    cart: [],
    listening: false,
    addressId: 'home',
    paymentId: 'gpay',
    orders,
    fastClock: prev?.fastClock ?? true,
    failNextPayment: prev?.failNextPayment ?? false,
  }
}

/** Hunch's timings: long enough to feel considered, short enough to never feel slow. */
const T = { think: 1100, plan: 1500, pay: 1400, listen: 2200, mood: 2400 }

/** Where an order is, from how much of its time is left. */
function statusFor(o: Order): OrderStatus {
  if (o.status === 'cancelled' || o.status === 'delivered') return o.status
  if (o.etaLeft <= 0) return 'delivered'
  if (o.etaLeft <= 3) return 'near'
  if (o.etaLeft <= Math.ceil(o.etaTotal * 0.55)) return 'picked'
  return 'cooking'
}

const clock = (d: Date) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })

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
          if (next.status !== 'cooking') next.confirmingCancel = false
          if (next.status === 'delivered') {
            next.deliveredAt = clock(new Date(s.ctx.now.getTime() + o.etaTotal * 60_000))
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
    [push, set, wait, flash],
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
      const { user, ctx, addressId } = ref.current
      update(m.id, { lines, deal: m.saved ? undefined : betterDeal(lines, user, ctx, addressById(addressId)) })
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
    (lines: CartLine[]) => {
      const { user, ctx, addressId } = ref.current
      // Offer discovery happens here, between the cart and paying.
      const deal = betterDeal(lines, user, ctx, addressById(addressId))
      set({ cart: lines, sheet: undefined, mood: deal ? 'delighted' : 'focused' })
      push({ id: id(), type: 'checkout', lines, status: 'open', deal })
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
        const { user, ctx } = ref.current
        update(m.id, { deal: betterDeal(m.lines, user, ctx, addressById(addressId)) })
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
      const address = addressById(ref.current.addressId)
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
      const order: Order = {
        id: orderId,
        dish: DISH_BY_ID[m.lines[0].dishId],
        restaurant: t.restaurants[0],
        kitchens: t.restaurants.length,
        rider: RIDERS[seq % RIDERS.length],
        etaTotal: etaMin,
        etaLeft: etaMin,
        status: 'cooking',
        amount: t.toPay,
        paymentId: method.id,
      }
      update(msgId, { status: 'paid' })
      set(st => ({ cart: [], working: undefined, orders: { ...st.orders, [orderId]: order }, user: { ...st.user, orderCount: st.user.orderCount + 1 } }))
      // The confirmation lives inside the tracking card: one turn, one card.
      push({ id: id(), type: 'tracking', orderId, text: t.restaurants.length === 1 ? CHAT.placed() : CHAT.placedMany(t.restaurants.length) })
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
      if (!o || o.status !== 'cooking') return
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
        return {
          user:
            rating === 'up'
              ? { ...s.user, usuals: has ? usuals.map(u => (u === has ? { ...u, times: u.times + 1 } : u)) : [...usuals, { dishId: o.dish.id, times: 1, meal: mealAt(s.ctx.now) }] }
              : { ...s.user, notForMe: [...s.user.notForMe, { dishId: o.dish.id, reason: 'disliked' }] },
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

  // ---------- dev ----------

  const setDev = useCallback((patch: Partial<Pick<ConversationState, 'fastClock' | 'failNextPayment'>>) => set(patch), [set])

  // ---------- derived ----------

  const home: HomeModel = useMemo(() => buildHome(state.user, state.ctx), [state.user, state.ctx])
  const live = Object.values(state.orders).find(o => o.status !== 'delivered' && o.status !== 'cancelled')
  const stageMood: Mood = live ? 'onTheWay' : home.stage === 'late' ? 'sleepy' : 'idle'
  const status = state.listening
    ? CHAT.status.listening
    : (state.working ?? (live ? (live.status === 'near' ? ORDER.status.near : CHAT.status.onTheWay(live.etaLeft)) : undefined))
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
    setDev,
  }
}

export type ConversationApi = ReturnType<typeof useConversation>
