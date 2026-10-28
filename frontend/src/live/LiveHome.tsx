import { ArrowLeftIcon, ShoppingBagIcon, XIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HunchVoice, Typing, UserSays } from '../components/chat/Bubbles'
import { BottomSheet } from '../components/chat/BottomSheet'
import { StageIcon } from '../components/chat/StageIcon'
import { TopBar } from '../components/chat/TopBar'
import { Weather } from '../components/chat/TodayCard'
import { AppShell } from '../components/layout/AppShell'
import { Button } from '../components/ui/Button'
import { Composer } from '../components/ui/Composer'
import { IconButton } from '../components/ui/IconButton'
import { VegMark } from '../components/ui/Meta'
import { spring } from '../design/motion'
import { skyFill, skyFor } from '../design/sky'
import type { IconKey } from '../domain/types'
import { cn } from '../lib/cn'
import { api, signOut, type Component, type DishCard, type Home, type OrderView } from './api'
import { Ack, ComponentView, DishDetail, OrderCard, Pic, Steps, type Handlers } from './parts'
import { useHunch, type Turn } from './useHunch'

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`

/** Home, live: the Today card from the API, then the conversation with the real agent. */
export function LiveHome() {
  const h = useHunch()
  const [dish, setDish] = useState<DishCard>()
  const [profileOpen, setProfileOpen] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const talked = h.turns.some(t => t.role === 'user')

  useEffect(() => {
    if (h.turns.length) end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [h.turns])

  /** A turn that needs no model: checkout forms, payment results. Free and instant. */
  const local = useCallback((text: string, components: Component[]) => {
    h.setTurns(ts => [...ts, { id: `l${Date.now()}`, role: 'hunch', text, ack: '', steps: [], components }])
  }, [h])

  const checkout = useCallback(async (method: 'online' | 'cod' = 'online') => {
    try {
      const r = await api<{ order: OrderView }>('/checkout', { method: 'POST', body: { method } })
      local(`${inr(r.order.total)} from ${r.order.restaurant}, about ${r.order.eta_min} min. Tap Pay when you're ready.`, [{ kind: 'checkout', order: r.order }])
    } catch (e) {
      const err = e as { body?: { missing?: string[] }; message: string }
      if (err.body?.missing) local('Before I place it, I need a couple of details.', [{ kind: 'collect', missing: err.body.missing as never, name: h.profile?.name ?? '', phone: h.profile?.phone ?? '' }])
      else local(err.message, [])
    }
  }, [h.profile, local])

  const updateOrder = h.updateOrder
  const handlers: Handlers = useMemo(() => ({
    onDish: setDish,
    onAdd: (id, add) => h.setQty(id, { add }),
    onSay: text => h.say(text),
    onCollected: () => checkout(),
    onPay: async o => {
      const r = await api<{ checkout_url?: string; order: OrderView }>(`/orders/${o.id}/pay`, { method: 'POST' })
      if (r.checkout_url) location.href = r.checkout_url
      else {
        updateOrder(r.order)
        local(`Placed. ${r.order.restaurant} is cooking.`, [{ kind: 'order', order: r.order }])
        h.load()
      }
    },
    onOrder: updateOrder,
  }), [h, checkout, local, updateOrder])

  // Back from the payment page: ask the server (which asks Dodo) how it went.
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('order')
    if (!id) return
    history.replaceState(null, '', location.pathname)
    let tries = 0
    const poll = async () => {
      const { order } = await api<{ order: OrderView }>(`/orders/${id}`)
      if (order.status === 'placed') {
        local(`Paid. ${order.restaurant} is cooking${order.arrives_at ? `, here around ${order.arrives_at}` : ''}.`, [{ kind: 'order', order }])
        h.load()
      } else if (order.status === 'failed') local("The payment didn't go through, and nothing was charged. Want to try again?", [])
      else if (++tries < 8) setTimeout(poll, 2000)
      else local('Still waiting to hear from the bank. I will update this as soon as it confirms.', [{ kind: 'order', order }])
    }
    poll().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const lastHunch = [...h.turns].reverse().find(t => t.role === 'hunch')
  const status = h.working ? (lastHunch?.steps.find(s => s.status === 'running')?.label ?? 'Thinking…') : undefined

  return (
    <>
      <AppShell
        className={cn('gap-6', !talked && 'justify-center pb-16')}
        top={<TopBar mood={h.working ? 'thinking' : 'idle'} status={status} working={h.working} initial={(h.profile?.name || 'H')[0]} onProfile={() => setProfileOpen(true)} />}
        bottom={
          <div className="grid gap-2.5">
            <AnimatePresence>
              {!!h.cart?.count && (
                <motion.button
                  key="cart"
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  onClick={() => checkout()}
                  className="flex h-12 w-full items-center gap-2.5 rounded-full bg-graphite-900 px-5 text-label text-white shadow-e3"
                >
                  <ShoppingBagIcon size={18} />
                  <span className="flex-1 truncate text-left">
                    {h.cart.count} from {h.cart.restaurant} · <span className="tabular-nums">{inr(h.cart.total)}</span>
                  </span>
                  <span className="font-semibold">Checkout</span>
                </motion.button>
              )}
            </AnimatePresence>
            <Composer listening={false} listeningLabel="Listening…" onMicToggle={() => {}} onSubmit={t => h.say(t)} disabled={h.working} />
          </div>
        }
      >
        {h.home && <LiveToday home={h.home} onDish={setDish} onPrompt={p => h.say(p)} onOrder={updateOrder} />}
        {h.turns.map(t => (t.role === 'user' ? <UserSays key={t.id}>{t.text}</UserSays> : <HunchTurn key={t.id} t={t} handlers={handlers} />))}
        <AnimatePresence>{h.working && lastHunch && !lastHunch.text && !lastHunch.ack && !lastHunch.steps.length && <Typing key="typing" />}</AnimatePresence>
        {h.error && !h.working && <p className="text-center text-[13px] text-graphite-500">{h.error.slice(0, 120)}</p>}
        <div ref={end} className="h-px scroll-mb-44" />
      </AppShell>

      <BottomSheet open={!!dish} title={dish?.name ?? ''} onClose={() => setDish(undefined)}>
        {dish && <DishDetail d={dish} onAdd={qty => h.setQty(dish.id, { add: qty })} />}
      </BottomSheet>
      <LiveProfile open={profileOpen} onClose={() => setProfileOpen(false)} onReset={async () => { await h.reset(); setProfileOpen(false) }} />
    </>
  )
}

function HunchTurn({ t, handlers }: { t: Turn; handlers: Handlers }) {
  const question = t.components.find(c => c.kind === 'choices')
  const voice = t.text.trim() || (question && question.kind === 'choices' ? question.question : '')
  return (
    <div className="grid gap-3">
      <Ack text={t.ack} />
      <Steps steps={t.steps} />
      {voice && <HunchVoice key={voice.length > 0 ? 'v' : 'e'} text={voice} mood={t.live ? 'thinking' : 'idle'} />}
      {t.components.map((c, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={spring.gentle}>
          <ComponentView c={c} h={handlers} />
        </motion.div>
      ))}
    </div>
  )
}

/** The Today card from the API: the sky of right now, Hunch's line, one pick, three prompts. */
function LiveToday({ home, onDish, onPrompt, onOrder }: { home: Home; onDish: (d: DishCard) => void; onPrompt: (p: string) => void; onOrder: (o: OrderView) => void }) {
  // The sky is set when the card appears; it doesn't need to change while you're looking at it.
  const [sky] = useState(() => skyFor(new Date(), { kind: 'clear', tempC: 26 }))
  const dark = sky.dark
  const p = home.pick
  return (
    <div className="relative overflow-hidden rounded-[28px] shadow-e2" style={{ background: skyFill(sky) }}>
      <Weather sky={sky} />
      <div className="relative grid gap-5 p-5">
        <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px]', dark ? 'text-white/75' : 'text-graphite-600')}>
          {home.context.map(c => (
            <span key={c.text} className="inline-flex items-center gap-1.5">
              <StageIcon icon={c.icon as IconKey} size={15} />
              {c.text}
            </span>
          ))}
        </div>
        <div className="grid gap-1">
          <span className={cn('text-[15px]', dark ? 'text-white/80' : 'text-graphite-600')}>{home.hello}</span>
          <h1 className={cn('text-[26px] font-semibold leading-8 tracking-[-0.02em] text-balance', dark ? 'text-white' : 'text-graphite-900')}>{home.line}</h1>
        </div>
        {home.order ? (
          <OrderCard o={home.order} onChange={onOrder} />
        ) : (
          p && (
            <button type="button" onClick={() => onDish(p)} className="flex items-center gap-3 rounded-[20px] bg-white p-2.5 pr-3 text-left shadow-e1">
              <Pic src={p.photo} className="size-[72px] shrink-0 rounded-[14px]" />
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="text-[12px] font-medium text-indigo-600">{home.usual ? 'Your usual' : 'My pick'}</span>
                <span className="line-clamp-2 text-[15px] font-semibold leading-5">
                  <VegMark veg={p.diet === 'veg'} className="mr-1.5 align-[-1px]" />
                  {p.name}
                </span>
                <span className="truncate text-[13px] tabular-nums text-graphite-600">
                  {p.restaurant} · {p.eta_min} min
                </span>
                {p.offer && <span className="truncate text-[12px] text-indigo-700">{p.offer}</span>}
              </span>
              <span className="shrink-0 rounded-full bg-graphite-900 px-3.5 py-2 text-[13px] font-medium tabular-nums text-white">{inr(p.price)}</span>
            </button>
          )
        )}
        <div className="flex flex-wrap gap-2">
          {home.prompts.map(t => (
            <button key={t} type="button" onClick={() => onPrompt(t)} className={cn('inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium backdrop-blur-sm', dark ? 'bg-white/12 text-white hover:bg-white/20' : 'bg-white/65 text-graphite-800 hover:bg-white/85')}>
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

interface Me {
  profile: { name: string; email: string; phone: string; diet: string; allergies: string[]; signed_in: boolean }
  addresses: { id: number; label: string; line: string; area: string; handoff: string }[]
  orders: OrderView[]
  memories: { id: string; text: string }[]
}

/** Profile, live: what Hunch knows (rules and memories), where it delivers, past orders, and the off switches. */
function LiveProfile({ open, onClose, onReset }: { open: boolean; onClose: () => void; onReset: () => void }) {
  const [me, setMe] = useState<Me>()
  useEffect(() => {
    if (open) api<Me>('/me').then(setMe)
  }, [open])
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0, x: -32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -32 }} transition={spring.gentle} className="fixed inset-0 z-[35] overflow-y-auto bg-graphite-25" role="dialog" aria-label="Profile">
          <div className="mx-auto grid w-full max-w-[420px] gap-6 px-4 pb-16 pt-4">
            <IconButton aria-label="Back to Hunch" variant="ghost" size="sm" className="bg-white shadow-e1" icon={<ArrowLeftIcon size={18} />} onClick={onClose} />
            {me && (
              <>
                <div className="grid gap-0.5">
                  <h1 className="text-title">{me.profile.name || 'You'}</h1>
                  <span className="text-label font-normal text-graphite-500">{me.profile.signed_in ? me.profile.email : 'Guest · signs in at your first order'}</span>
                </div>
                <Card title="Food rules">
                  <p className="text-label font-normal">
                    {me.profile.diet} · {me.profile.allergies.length ? `no ${me.profile.allergies.join(', ')}` : 'no allergies'}
                  </p>
                  <p className="text-caption font-normal text-graphite-500">Tell Hunch to change these, e.g. "I'm vegetarian now".</p>
                </Card>
                <Card title="What Hunch remembers">
                  {me.memories.length ? (
                    me.memories.map(m => (
                      <div key={m.id} className="flex items-center gap-3">
                        <span className="flex-1 text-label font-normal">{m.text}</span>
                        <IconButton aria-label="Forget this" variant="ghost" size="sm" icon={<XIcon size={14} />} onClick={async () => { await api(`/memories/${m.id}`, { method: 'DELETE' }); setMe({ ...me, memories: me.memories.filter(x => x.id !== m.id) }) }} />
                      </div>
                    ))
                  ) : (
                    <p className="text-label font-normal text-graphite-500">Nothing yet. Order a few times.</p>
                  )}
                </Card>
                <Card title="Delivers to">
                  {me.addresses.length ? me.addresses.map(a => <p key={a.id} className="text-label font-normal">{a.label} · {a.line}{a.handoff ? ` · ${a.handoff}` : ''}</p>) : <p className="text-label font-normal text-graphite-500">Set at your first order.</p>}
                  {me.profile.phone && <p className="text-caption font-normal text-graphite-500">Rider calls {me.profile.phone}</p>}
                </Card>
                <Card title="Your orders">
                  {me.orders.length ? me.orders.map(o => <p key={o.id} className="text-label font-normal">{o.restaurant} · {inr(o.total)} · {o.stage.replace('_', ' ')}</p>) : <p className="text-label font-normal text-graphite-500">None yet.</p>}
                </Card>
                <div className="grid gap-2">
                  <Button variant="secondary" block onClick={onReset}>
                    Reset conversation
                  </Button>
                  <Button variant="text" onClick={async () => { await api('/memories/forget', { method: 'POST' }); setMe({ ...me, memories: [] }) }}>
                    Forget what Hunch learned
                  </Button>
                  {me.profile.signed_in && (
                    <Button variant="text" onClick={async () => { await signOut(); location.reload() }}>
                      Sign out
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="grid gap-2 rounded-[24px] bg-white p-4 shadow-e1">
    <h2 className="text-[15px] font-semibold">{title}</h2>
    {children}
  </section>
)
