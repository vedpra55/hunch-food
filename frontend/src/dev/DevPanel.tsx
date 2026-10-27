import { CodeIcon, PlayIcon, XIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { FAST_MINUTE_MS, type ConversationApi } from '../chat/useConversation'
import { SCENARIOS } from '../data/scenarios'
import { money } from '../domain/copy'
import { DAY_NAMES } from '../domain/time'
import { spring } from '../design/motion'
import { cn } from '../lib/cn'

type Flow = { id: string; label: string; note: string; scenario: string; run: (api: ConversationApi) => Promise<void> }

const firstItem = (api: ConversationApi) => {
  const last = [...api.latest().thread].reverse().find(m => m.type === 'results')
  return last?.type === 'results' ? last.items[0] : undefined
}
const lastCheckout = (api: ConversationApi) => [...api.latest().thread].reverse().find(m => m.type === 'checkout')?.id
const lastPlan = (api: ConversationApi) => [...api.latest().thread].reverse().find(m => m.type === 'plan')?.id

/** The main flows, played end to end. Each step waits so you can watch it happen. */
const FLOWS: Flow[] = [
  {
    id: 'first',
    label: 'First-time user',
    note: 'Three taps, asks for biryani, adds, pays',
    scenario: 'first',
    run: async api => {
      await api.wait(1400)
      api.finishOnboarding({ diet: 'nonveg', allergies: ['nuts'], goal: 'protein' })
      await api.wait(1800)
      api.send('Best biryani nearby')
      await api.wait(2400)
      const s = firstItem(api)
      if (!s) return
      api.openSheet(s)
      await api.wait(2200)
      api.add(s, 1, [])
      await api.wait(1000)
      api.viewCart()
      await api.wait(1800)
      const c = lastCheckout(api)
      if (c) api.pay(c)
    },
  },
  {
    id: 'repeat',
    label: 'Repeat user',
    note: 'One tap on the usual, then pay',
    scenario: 'dinner-rain',
    run: async api => {
      await api.wait(1800)
      const u = api.homeNow().usual
      if (!u) return
      api.orderAgain(u)
      await api.wait(1800)
      const c = lastCheckout(api)
      if (c) api.pay(c)
    },
  },
  {
    id: 'texting',
    label: 'Order while texting',
    note: 'Two requests, two kitchens, one checkout',
    scenario: 'dinner-rain',
    run: async api => {
      await api.wait(1200)
      api.send('Something warm, high protein, under ₹300')
      await api.wait(2400)
      const a = firstItem(api)
      if (!a) return
      api.openSheet(a)
      await api.wait(2000)
      api.add(a, 1, [])
      await api.wait(1000)
      api.send('And a masala chai')
      await api.wait(2400)
      const b = firstItem(api)
      if (!b) return
      api.add(b, 1, [])
      await api.wait(1200)
      api.viewCart()
      await api.wait(2000)
      const c = lastCheckout(api)
      if (c) api.pay(c)
    },
  },
  {
    id: 'plan',
    label: 'Plan + order',
    note: 'Dinner for 4 under ₹1,200',
    scenario: 'dinner-rain',
    run: async api => {
      await api.wait(1200)
      api.send('Dinner for 4 tonight, under ₹1,200')
      await api.wait(2800)
      const p = lastPlan(api)
      if (!p) return
      api.orderPlan(p)
      await api.wait(2000)
      const c = lastCheckout(api)
      if (c) api.pay(c)
    },
  },
  {
    id: 'deal',
    label: 'Better deal',
    note: 'Hunch finds the same thing cheaper at checkout',
    scenario: 'dinner-rain',
    run: async api => {
      await api.wait(1800)
      const u = api.homeNow().usual
      if (!u) return
      api.orderAgain(u)
      await api.wait(2600)
      const c = lastCheckout(api)
      if (!c) return
      api.switchDeal(c)
      await api.wait(2000)
      api.pay(c)
    },
  },
  {
    id: 'edit',
    label: 'Edit cart, change address',
    note: 'One more, remove one, an address that is out of reach',
    scenario: 'dinner-rain',
    run: async api => {
      await api.wait(1200)
      api.send('Chicken biryani')
      await api.wait(2400)
      const a = firstItem(api)
      if (!a) return
      api.add(a, 1, [])
      await api.wait(900)
      api.send('And a masala chai')
      await api.wait(2400)
      const b = firstItem(api)
      if (!b) return
      api.add(b, 1, [])
      await api.wait(900)
      api.viewCart()
      await api.wait(1600)
      api.changeQty(a.dish.id, 1)
      await api.wait(1200)
      api.changeQty(b.dish.id, -1)
      await api.wait(1400)
      api.openPicker('address')
      await api.wait(1600)
      api.chooseAddress('parents')
      await api.wait(2600)
      api.openPicker('address')
      await api.wait(1400)
      api.chooseAddress('work')
    },
  },
  {
    id: 'fail',
    label: 'Payment fails',
    note: 'Declined, switch to PhonePe, try again',
    scenario: 'dinner-rain',
    run: async api => {
      api.setDev({ failNextPayment: true })
      await api.wait(1500)
      const u = api.homeNow().usual
      if (!u) return
      api.orderAgain(u)
      await api.wait(1500)
      const c = lastCheckout(api)
      if (!c) return
      api.keepDeal(c)
      await api.wait(800)
      api.pay(c)
      await api.wait(3200)
      api.openPicker('payment')
      await api.wait(1400)
      api.choosePayment('phonepe')
      await api.wait(1400)
      api.pay(c)
    },
  },
  {
    id: 'cancel',
    label: 'Cancel an order',
    note: 'Pay, then cancel before pickup',
    scenario: 'breakfast',
    run: async api => {
      await api.wait(1500)
      const u = api.homeNow().usual
      if (!u) return
      api.orderAgain(u)
      await api.wait(1500)
      const c = lastCheckout(api)
      if (!c) return
      api.pay(c)
      await api.wait(3200)
      const o = Object.values(api.latest().orders).find(x => x.status === 'cooking')
      if (!o) return
      api.askCancel(o.id, true)
      await api.wait(1800)
      api.cancel(o.id)
    },
  },
  {
    id: 'nudge',
    label: '6 PM nudge',
    note: 'Notification, schedule the usual for 8:30, pay',
    scenario: 'nudge',
    run: async api => {
      await api.wait(3500)
      api.scheduleNudge()
      await api.wait(2000)
      const c = lastCheckout(api)
      if (c) api.pay(c)
    },
  },
  {
    id: 'reorder',
    label: 'Reorder from history',
    note: 'Profile, repeat an order with a sold-out dish',
    scenario: 'dinner-rain',
    run: async api => {
      await api.wait(1000)
      api.openProfile()
      await api.wait(2200)
      api.reorder('h3')
    },
  },
  {
    id: 'address',
    label: 'Add an address',
    note: 'Out of reach for the cart, so add one that works',
    scenario: 'dinner-rain',
    run: async api => {
      await api.wait(1200)
      const u = api.homeNow().usual
      if (!u) return
      api.orderAgain(u)
      await api.wait(1600)
      api.openPicker('address')
      await api.wait(1400)
      api.openPicker('addAddress')
      await api.wait(1800)
      api.addAddress({ label: 'Gym', line: '3rd Cross, Ulsoor', area: 'Ulsoor', extraKm: 3 })
    },
  },
]

/** Dev only: switch Home scenarios and auto-play the main flows. Open with ?dev in production builds. */
export function DevPanel({ api }: { api: ConversationApi }) {
  // Desktop has room beside the column; on a phone the panel would cover the conversation.
  const wide = () => innerWidth >= 1024
  const [open, setOpen] = useState(wide)
  const [playing, setPlaying] = useState<string>()
  const { state, home } = api
  const { user, ctx } = state

  const play = async (f: Flow) => {
    setPlaying(f.id)
    if (!wide()) setOpen(false)
    api.reset(f.scenario)
    // reset() changes state; let React render the new home before reading it
    await new Promise(r => setTimeout(r, 0))
    await f.run(api)
    setPlaying(undefined)
  }

  const time = `${DAY_NAMES[ctx.now.getDay()].slice(0, 3)} ${ctx.now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`

  // Top-right: the top bar's right slot is empty on purpose, so dev mode never covers content. Sheets sit above it.
  return (
    <div className="fixed right-3 top-[max(18px,env(safe-area-inset-top))] z-[45] flex flex-col items-end gap-2 font-sans lg:top-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex h-7 items-center gap-1 rounded-full bg-graphite-900/85 px-2.5 text-[11px] font-semibold text-white shadow-e2 backdrop-blur lg:h-8 lg:bg-graphite-900 lg:px-3 lg:text-[12px]"
        aria-expanded={open}
      >
        {open ? <XIcon size={14} weight="bold" /> : <CodeIcon size={14} weight="bold" />}
        Dev
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={spring.snappy}
            style={{ transformOrigin: '100% 0%' }}
            className="grid max-h-[60dvh] w-[min(300px,calc(100vw-24px))] lg:max-h-[calc(100dvh-64px)] gap-4 overflow-y-auto rounded-[20px] bg-white p-4 text-graphite-900 shadow-e3"
          >
            <Block title="Play a flow">
              {FLOWS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  disabled={!!playing}
                  onClick={() => play(f)}
                  className={cn('flex items-center gap-2.5 rounded-[12px] px-2.5 py-2 text-left transition-colors hover:bg-graphite-50 disabled:opacity-50', playing === f.id && 'bg-indigo-50')}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-graphite-900 text-white">
                    <PlayIcon size={12} weight="fill" />
                  </span>
                  <span className="grid">
                    <span className="text-[13px] font-semibold">{f.label}</span>
                    <span className="text-[12px] text-graphite-500">{f.note}</span>
                  </span>
                </button>
              ))}
            </Block>

            <Block title="Home stage">
              {SCENARIOS.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setPlaying(undefined)
                    api.reset(s.id)
                  }}
                  className={cn('rounded-[10px] px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-graphite-50', state.scenarioId === s.id && 'bg-graphite-900 text-white hover:bg-graphite-800')}
                >
                  {s.label}
                </button>
              ))}
            </Block>

            <Block title="Right now">
              <dl className="grid grid-cols-[84px_1fr] gap-x-2 gap-y-1 text-[12px]">
                <Item k="Person" v={`${user.firstName} · ${user.orderCount} orders`} />
                <Item k="Diet" v={user.diet} />
                <Item k="Time" v={`${time} · ${home.stage}`} />
                <Item k="Weather" v={`${ctx.weather.kind} · ${ctx.weather.tempC}°`} />
                <Item k="Rules" v={home.rules.map(r => r.label).join(', ') || '—'} />
                <Item k="Off today" v={ctx.offToday.join(', ') || '—'} />
                <Item k="Cart" v={state.cart.length ? `${state.cart.reduce((n, l) => n + l.qty, 0)} items` : '—'} />
                <Item k="Orders" v={Object.values(state.orders).map(o => `${o.status}${o.status === 'delivered' || o.status === 'cancelled' ? '' : ` · ${o.etaLeft} min`}`).join(', ') || '—'} />
                <Item k="Usual" v={home.usual ? `${home.usual.dish.name} · ${money(home.usual.dish.price)}` : '—'} />
              </dl>
            </Block>

            <Block title="Simulate">
              <Toggle label={`Fast clock · 1 min = ${FAST_MINUTE_MS / 1000} s`} on={state.fastClock} onChange={v => api.setDev({ fastClock: v })} />
              <Toggle label="Next payment fails" on={state.failNextPayment} onChange={v => api.setDev({ failNextPayment: v })} />
            </Block>

            <button type="button" onClick={() => api.reset(state.scenarioId)} className="h-9 rounded-full bg-graphite-50 text-[13px] font-medium hover:bg-graphite-100">
              Restart this stage
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-1">
      <h3 className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-graphite-500">{title}</h3>
      {children}
    </section>
  )
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[10px] px-2.5 py-1.5 text-[13px] hover:bg-graphite-50">
      {label}
      <input type="checkbox" checked={on} onChange={e => onChange(e.target.checked)} className="size-4 accent-graphite-900" />
    </label>
  )
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-graphite-500">{k}</dt>
      <dd className="truncate">{v}</dd>
    </>
  )
}
