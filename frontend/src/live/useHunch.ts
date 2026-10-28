import { useCallback, useEffect, useRef, useState } from 'react'
import { api, chat, type Cart, type Component, type Home, type OrderView, type Profile, type Step, type StoredMessage } from './api'

/** One message in the thread. Hunch's turns carry what it said, what it did, and what it showed. */
export interface Turn {
  id: string
  role: 'user' | 'hunch'
  text: string
  ack: string
  steps: Step[]
  components: Component[]
  live?: boolean
}

let seq = 0
const tid = () => `t${++seq}`

export function useHunch() {
  const [home, setHome] = useState<Home>()
  const [profile, setProfile] = useState<Profile>()
  const [turns, setTurns] = useState<Turn[]>([])
  const [cart, setCart] = useState<Cart>()
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string>()
  const busy = useRef(false)

  const load = useCallback(async () => {
    const r = await api<{ home: Home; profile: Profile; messages: StoredMessage[] }>('/home')
    setHome(r.home)
    setProfile(r.profile)
    setCart(r.home.cart)
    setTurns(r.messages.map(m => ({ ...m, id: `m${m.id}` })))
    return r
  }, [])

  const patch = (id: string, fn: (t: Turn) => Turn) => setTurns(ts => ts.map(t => (t.id === id ? fn(t) : t)))

  /** Send words (or open the conversation) and stream Hunch's turn into the thread. */
  const say = useCallback(async (text: string, event?: 'open') => {
    if (busy.current) return
    busy.current = true
    setWorking(true)
    setError(undefined)
    const hid = tid()
    setTurns(ts => [...ts, ...(text ? [{ id: tid(), role: 'user' as const, text, ack: '', steps: [], components: [] }] : []), { id: hid, role: 'hunch', text: '', ack: '', steps: [], components: [], live: true }])
    try {
      await chat(event ? { event } : { text }, e => {
        switch (e.type) {
          case 'text':
            patch(hid, t => ({ ...t, text: t.text + e.delta }))
            break
          case 'ack':
            // The words so far were the acknowledgement; the answer comes after the work.
            patch(hid, t => ({ ...t, ack: [t.ack, t.text.trim()].filter(Boolean).join(' '), text: '' }))
            break
          case 'step':
            patch(hid, t => {
              const steps = t.steps.some(s => s.id === e.id) ? t.steps.map(s => (s.id === e.id ? { ...s, ...e } : s)) : [...t.steps, { id: e.id, label: e.label, summary: e.summary, status: e.status }]
              return { ...t, steps }
            })
            break
          case 'component':
            patch(hid, t => ({ ...t, components: [...t.components, e.component] }))
            break
          case 'cart':
            setCart(e.cart)
            break
          case 'profile':
            setProfile(e.profile)
            break
          case 'done':
            setCart(e.cart)
            patch(hid, t => ({ ...t, live: false }))
            break
          case 'error':
            setError(e.message)
            break
        }
      })
    } catch (err) {
      patch(hid, t => ({ ...t, text: "I couldn't reach the kitchen network. Try again in a moment?", live: false }))
      setError(String(err))
    } finally {
      busy.current = false
      setWorking(false)
    }
  }, [])

  // First load: restore the thread; a brand-new person gets Hunch's opening line.
  useEffect(() => {
    const boot = async () => {
      try {
        const r = await load()
        if (!r.messages.length && !r.profile.onboarded) await say('', 'open')
      } catch (e) {
        setError(String(e))
      }
    }
    void boot()
  }, [load, say])

  /** Show a fresh copy of an order wherever it appears in the thread. */
  const updateOrder = (o: OrderView) =>
    setTurns(ts => ts.map(t => ({ ...t, components: t.components.map(c => ((c.kind === 'order' || c.kind === 'checkout') && c.order.id === o.id ? { ...c, order: o } : c)) })))

  const setQty = useCallback(async (dishId: string, body: { qty?: number; add?: number }) => {
    try {
      const r = await api<{ cart: Cart }>('/cart', { method: 'POST', body: { dish_id: dishId, ...body } })
      setCart(r.cart)
      return null
    } catch (e) {
      const err = e as { message: string; body?: { cart?: Cart } }
      if (err.body?.cart) setCart(err.body.cart)
      return err.message
    }
  }, [])

  const reset = useCallback(async () => {
    const r = await api<{ home: Home }>('/conversation/reset', { method: 'POST' })
    setTurns([])
    setHome(r.home)
    setCart(r.home.cart)
  }, [])

  return { home, profile, turns, cart, working, error, say, load, setQty, updateOrder, reset, setProfile, setCart, setTurns }
}

export type HunchApi = ReturnType<typeof useHunch>
