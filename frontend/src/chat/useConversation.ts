import { useCallback, useMemo, useRef, useState } from 'react'
import type { CheckoutStatus } from '../components/chat/Cards'
import type { Mood } from '../components/hunch/moods'
import { DISH_BY_ID } from '../data/menu'
import { scenarioById } from '../data/scenarios'
import { openKitchens, parse, plan as makePlan, search, totals, type CartLine, type Plan } from '../domain/chat'
import { CHAT } from '../domain/copy'
import { buildHome } from '../domain/recommend'
import { DAY_NAMES } from '../domain/time'
import type { Ask, Context, HomeModel, NotForMe, RuleChip, Suggestion, Tracking, UserProfile } from '../domain/types'

export type Msg =
  | { id: string; type: 'home' }
  | { id: string; type: 'user'; text: string }
  | { id: string; type: 'hunch'; text: string }
  | { id: string; type: 'results'; text: string; items: Suggestion[] }
  | { id: string; type: 'plan'; text: string; plan: Plan; ordered: boolean }
  | { id: string; type: 'checkout'; lines: CartLine[]; status: CheckoutStatus }
  | { id: string; type: 'tracking'; tracking: Tracking; step: number }

export interface ConversationState {
  scenarioId: string
  user: UserProfile
  ctx: Context
  thread: Msg[]
  cart: CartLine[]
  /** Status under Hunch's name while it works */
  working?: string
  listening: boolean
  /** Mood override for a moment (found it, focused…); falls back to the stage mood */
  mood?: Mood
  sheet?: Suggestion
  /** Set once an order is placed in this session */
  order?: { etaMin: number }
}

let seq = 0
const id = () => `m${++seq}`

function initial(scenarioId: string): ConversationState {
  const s = scenarioById(scenarioId)
  return { scenarioId: s.id, user: s.user, ctx: s.ctx, thread: [{ id: id(), type: 'home' }], cart: [], listening: false }
}

/** Hunch's timings: long enough to feel considered, short enough to never feel slow. */
const T = { think: 1100, plan: 1500, pay: 1400, listen: 2200, mood: 2400, rider: 7000 }

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
    const next = initial(scenarioId)
    ref.current = next
    setState(next)
  }, [])

  // ---------- talking ----------

  const send = useCallback(
    async (text: string) => {
      const s = ref.current
      if (s.working) return
      push({ id: id(), type: 'user', text })

      if (s.order && /where|rider|how long|status/i.test(text)) {
        await wait(600)
        push({ id: id(), type: 'hunch', text: CHAT.track(s.order.etaMin, 'Arjun') })
        return
      }
      if (/issue|wrong|missing|cold food|spilled|refund/i.test(text)) {
        set({ mood: 'care' })
        await wait(700)
        push({ id: id(), type: 'hunch', text: CHAT.support() })
        return
      }

      const intent = parse(text)
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
        push({ id: id(), type: 'results', text: r.text, items: r.items })
        set({ working: undefined })
        flash(r.items.length ? 'found' : 'care')
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

  // ---------- dishes and cart ----------

  const openSheet = useCallback((s: Suggestion) => set({ sheet: s }), [set])
  const closeSheet = useCallback(() => set({ sheet: undefined }), [set])

  const add = useCallback(
    (s: Suggestion, qty: number, customisation: string[]) =>
      set(st => {
        const existing = st.cart.find(l => l.dishId === s.dish.id)
        const cart = existing ? st.cart.map(l => (l.dishId === s.dish.id ? { ...l, qty: l.qty + qty } : l)) : [...st.cart, { dishId: s.dish.id, qty, customisation: customisation.length ? customisation : undefined }]
        return { cart, sheet: undefined }
      }),
    [set],
  )

  const checkout = useCallback(
    (lines: CartLine[]) => {
      set({ cart: lines, sheet: undefined, mood: 'focused' })
      push({ id: id(), type: 'checkout', lines, status: 'open' })
    },
    [set, push],
  )

  const orderAgain = useCallback((s: Suggestion) => checkout([{ dishId: s.dish.id, qty: 1, customisation: s.customisation }]), [checkout])
  const viewCart = useCallback(() => checkout(ref.current.cart), [checkout])

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

  const pay = useCallback(
    async (msgId: string) => {
      const m = ref.current.thread.find(x => x.id === msgId)
      if (m?.type !== 'checkout' || m.status !== 'open') return
      update(msgId, { status: 'paying' })
      set({ working: CHAT.status.placing, mood: 'focused' })
      await wait(T.pay)

      const t = totals(m.lines)
      const restaurant = t.restaurants[0]
      const etaMin = Math.max(...t.restaurants.map(r => r.etaMin))
      update(msgId, { status: 'paid' })
      set(s => ({ cart: [], working: undefined, order: { etaMin }, user: { ...s.user, orderCount: s.user.orderCount + 1 } }))
      const trackId = id()
      push(
        { id: id(), type: 'hunch', text: t.restaurants.length === 1 ? CHAT.placed(restaurant.name, etaMin) : CHAT.placedMany(t.restaurants.length, etaMin) },
        { id: trackId, type: 'tracking', step: 1, tracking: { dish: DISH_BY_ID[m.lines[0].dishId], restaurant, etaMin, rider: 'Arjun' } },
      )
      await flash('found')
      await wait(T.rider)
      update(trackId, { step: 2 })
    },
    [update, set, wait, push, flash],
  )

  const notNow = useCallback(
    (msgId: string) => {
      update(msgId, { status: 'dismissed' })
      set({ mood: undefined })
      push({ id: id(), type: 'hunch', text: CHAT.notNow() })
    },
    [update, set, push],
  )

  // ---------- personalisation in the moment ----------

  const ruleOff = useCallback(
    (r: RuleChip) => {
      set(s => ({ ctx: { ...s.ctx, offToday: [...s.ctx.offToday, r.id] } }))
      push({ id: id(), type: 'hunch', text: CHAT.ruleOff(r.label) })
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

  // ---------- derived ----------

  const home: HomeModel = useMemo(() => buildHome(state.user, state.ctx), [state.user, state.ctx])
  const stageMood: Mood = state.order || home.stage === 'tracking' ? 'onTheWay' : home.stage === 'late' ? 'sleepy' : 'idle'
  const status = state.listening ? CHAT.status.listening : (state.working ?? (state.order ? CHAT.status.onTheWay(state.order.etaMin) : undefined))
  const openCheckout = state.thread.some(m => m.type === 'checkout' && (m.status === 'open' || m.status === 'paying'))

  return {
    state,
    home,
    mood: state.mood ?? stageMood,
    status,
    openCheckout,
    latest: () => ref.current,
    /** Home as it is right now (for async flows that outlive a render) */
    homeNow: () => buildHome(ref.current.user, ref.current.ctx),
    wait,
    reset,
    send,
    mic,
    openSheet,
    closeSheet,
    add,
    orderAgain,
    viewCart,
    orderPlan,
    changePlan,
    pay,
    notNow,
    ruleOff,
    answerAsk,
    notForMe,
  }
}

export type ConversationApi = ReturnType<typeof useConversation>
