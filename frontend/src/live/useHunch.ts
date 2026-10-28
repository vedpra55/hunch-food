import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError, chat, type Cart, type Component, type Home, type OrderView, type Profile, type Step, type StoredMessage } from './api'

/** One entry in the thread. Hunch's turns carry what it said, what it did, and what it showed. */
export interface Turn {
  id: string
  role: 'user' | 'hunch' | 'event'
  kind: string
  text: string
  ack: string
  steps: Step[]
  components: Component[]
  /** Streaming right now. */
  live?: boolean
  /** Hunch's words arrived while this turn was on screen (animate them in). */
  streamed?: boolean
  /** A send that didn't go through: the words to try again. */
  failed?: string
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)
const fromStored = (m: StoredMessage): Turn => ({ ...m, id: `m${m.id}` })

/** Unpaid orders shown in the thread: these are the ones worth checking when the person comes back. */
const awaiting = (turns: Turn[]) =>
  [...new Set(turns.flatMap(t => t.components.flatMap(c => ((c.kind === 'checkout' || c.kind === 'order') && c.order.status === 'awaiting_payment' ? [c.order.id] : []))))]

export function useHunch() {
  const [booting, setBooting] = useState(true)
  const [home, setHome] = useState<Home>()
  const [profile, setProfile] = useState<Profile>()
  const [turns, setTurns] = useState<Turn[]>([])
  const [cart, setCart] = useState<Cart>()
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string>()
  /** Orders we're waiting on the bank for (back from the payment page). */
  const [confirming, setConfirming] = useState<string[]>([])
  const busy = useRef(false)
  const abort = useRef<AbortController | null>(null)
  const turnsRef = useRef(turns)
  useEffect(() => {
    turnsRef.current = turns
  }, [turns])

  const load = useCallback(async () => {
    const r = await api<{ home: Home; profile: Profile; messages: StoredMessage[] }>('/home')
    setHome(r.home)
    setProfile(r.profile)
    setCart(r.home.cart)
    setTurns(r.messages.map(fromStored))
    return r
  }, [])

  const patch = (id: string, fn: (t: Turn) => Turn) => setTurns(ts => ts.map(t => (t.id === id ? fn(t) : t)))

  /** Send words and stream Hunch's turn into the thread. */
  const say = useCallback(async (text: string) => {
    if (busy.current || !text.trim()) return
    busy.current = true
    setWorking(true)
    setError(undefined)
    const turnId = newId()
    const uid = `u${turnId}`
    const hid = `h${turnId}`
    const blank = { kind: '', ack: '', steps: [] as Step[], components: [] as Component[] }
    setTurns(ts => [...ts.filter(t => t.failed !== text), { id: uid, role: 'user', text, ...blank }, { id: hid, role: 'hunch', text: '', ...blank, live: true, streamed: true }])
    const ctrl = new AbortController()
    abort.current = ctrl

    const run = () =>
      chat({ text, turn_id: turnId }, e => {
        switch (e.type) {
          case 'ack':
            patch(hid, t => ({ ...t, ack: t.ack + e.delta }))
            break
          case 'step':
            patch(hid, t => ({
              ...t,
              steps: t.steps.some(s => s.id === e.id) ? t.steps.map(s => (s.id === e.id ? { ...s, ...e } : s)) : [...t.steps, { id: e.id, label: e.label, summary: e.summary, status: e.status }],
            }))
            break
          case 'say':
            patch(hid, t => ({ ...t, text: t.text + e.delta }))
            break
          case 'say_reset':
            patch(hid, t => ({ ...t, text: '' }))
            break
          case 'cart':
            setCart(e.cart)
            break
          case 'profile':
            setProfile(e.profile)
            break
          case 'done':
            // The server's copy is the truth; keep this turn's id so nothing on screen re-mounts.
            setCart(e.cart)
            patch(hid, t => ({ ...fromStored(e.message), id: t.id, live: false, streamed: true }))
            break
          case 'error':
            setTurns(ts => ts.filter(t => t.id !== hid).map(t => (t.id === uid ? { ...t, failed: e.retry ?? text } : t)))
            setError(e.message)
            break
        }
      }, ctrl.signal)

    try {
      try {
        await run()
      } catch (err) {
        // A dropped connection: the same turn id makes a retry safe (the server answers from its copy).
        if (ctrl.signal.aborted || err instanceof ApiError) throw err
        patch(hid, t => ({ ...t, ack: '', text: '', steps: [] }))
        await run()
      }
    } catch (err) {
      if (ctrl.signal.aborted) {
        patch(hid, t => ({ ...t, live: false, text: t.text || 'Stopped.', steps: t.steps.map(s => ({ ...s, status: 'done' as const })) }))
      } else {
        setTurns(ts => ts.filter(t => t.id !== hid).map(t => (t.id === uid ? { ...t, failed: text } : t)))
        setError(err instanceof ApiError && err.status === 409 ? err.message : "Couldn't reach Hunch. Check your connection and try again.")
      }
    } finally {
      // Anything left mid-stream is settled, whatever happened.
      patch(hid, t => (t.live ? { ...t, live: false } : t))
      abort.current = null
      busy.current = false
      setWorking(false)
    }
  }, [])

  const stop = useCallback(() => abort.current?.abort(), [])

  // First load: restore the thread.
  useEffect(() => {
    const boot = async () => {
      try {
        await load()
      } catch (e) {
        setError((e as Error).message ?? String(e))
      } finally {
        setBooting(false)
      }
    }
    void boot()
  }, [load])

  /** Show a fresh copy of an order wherever it appears in the thread. */
  const updateOrder = useCallback(
    (o: OrderView) => setTurns(ts => ts.map(t => ({ ...t, components: t.components.map(c => ((c.kind === 'order' || c.kind === 'checkout') && c.order.id === o.id ? { ...c, order: o } : c)) }))),
    [],
  )

  /** Ask the server (which asks the bank) about unpaid orders; reload the thread if any moved. */
  const checkOrders = useCallback(
    async (ids: string[]) => {
      let moved = false
      for (const id of ids) {
        try {
          const { order } = await api<{ order: OrderView }>(`/orders/${id}`)
          if (order.status !== 'awaiting_payment') moved = true
          else updateOrder(order)
        } catch {
          /* the next check will try again */
        }
      }
      if (moved) await load()
      return moved
    },
    [load, updateOrder],
  )

  /** Back from the payment page: confirm with the bank, checking again with growing gaps for up to ~90 s. */
  const confirmPayment = useCallback(
    async (id: string) => {
      setConfirming(c => [...c, id])
      const gaps = [0, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20]
      for (const g of gaps) {
        await new Promise(r => setTimeout(r, g * 1000))
        if (await checkOrders([id])) break
      }
      setConfirming(c => c.filter(x => x !== id))
    },
    [checkOrders],
  )

  // Coming back (Back from the payment page, or switching tabs): check any order still waiting on payment.
  useEffect(() => {
    const onBack = () => {
      if (document.visibilityState !== 'visible') return
      const ids = awaiting(turnsRef.current)
      if (ids.length) void checkOrders(ids)
    }
    // pageshow: Back restored this page from the browser's cache, exactly as it was when they left.
    document.addEventListener('visibilitychange', onBack)
    addEventListener('focus', onBack)
    addEventListener('pageshow', onBack)
    return () => {
      document.removeEventListener('visibilitychange', onBack)
      removeEventListener('focus', onBack)
      removeEventListener('pageshow', onBack)
    }
  }, [checkOrders])

  const setQty = useCallback(async (dishId: string, body: { qty?: number; add?: number }) => {
    try {
      const r = await api<{ cart: Cart }>('/cart', { method: 'POST', body: { dish_id: dishId, ...body } })
      setCart(r.cart)
      return null
    } catch (e) {
      const err = e as ApiError
      if (err.body?.cart) setCart(err.body.cart as Cart)
      return err.message
    }
  }, [])

  /** The step before paying, from the cart bar or the details form: the server writes it into the thread. */
  const checkout = useCallback(async (method: 'online' | 'cod' = 'online') => {
    try {
      const r = await api<{ message: StoredMessage; cart: Cart }>('/checkout', { method: 'POST', body: { method } })
      setCart(r.cart)
      setTurns(ts => [...ts, { ...fromStored(r.message), streamed: true }])
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  const reset = useCallback(async () => {
    const r = await api<{ home: Home }>('/conversation/reset', { method: 'POST' })
    setTurns([])
    setHome(r.home)
    setCart(r.home.cart)
  }, [])

  return { booting, home, profile, turns, cart, working, error, confirming, say, stop, load, setQty, checkout, updateOrder, confirmPayment, reset, setProfile, setError }
}

export type HunchApi = ReturnType<typeof useHunch>
