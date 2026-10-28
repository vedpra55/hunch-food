import { ArrowClockwiseIcon, ArrowLeftIcon, CheckCircleIcon, ShoppingBagIcon, SparkleIcon, WarningCircleIcon, WifiSlashIcon, XCircleIcon, XIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { HunchMark, UserSays } from '../components/chat/Bubbles'
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
import { api, signOut, transcribeVoice, type DishCard, type Home, type OrderView } from './api'
import { Onboarding } from './Onboarding'
import { Ack, ComponentView, DishDetail, OrderCard, Pic, Steps, type Handlers } from './parts'
import { useHunch, type HunchApi, type Turn } from './useHunch'
import { useVoiceInput } from '../lib/useVoiceInput'

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`

/** Live: loading, then first-run setup for someone new, then home with the real agent. */
export function LiveHome() {
  const h = useHunch()
  if (h.booting) return <Loading />
  if (!h.profile) return <CantReach error={h.error} />
  if (!h.profile.onboarded) {
    return (
      <Onboarding
        onDone={p => {
          h.setProfile(p)
          void h.load()
        }}
      />
    )
  }
  return <Main h={h} />
}

interface Toast {
  id: number
  text: string
  undo?: () => void
}

function Main({ h }: { h: HunchApi }) {
  const [dish, setDish] = useState<DishCard>()
  const [profileOpen, setProfileOpen] = useState(false)
  const [toast, setToast] = useState<Toast>()
  const online = useOnline()
  const end = useRef<HTMLDivElement>(null)

  const voice = useVoiceInput({
    onAutoSend: text => {
      if (text.trim()) {
        void h.say(text.trim())
      }
    },
    onTranscribeFallback: async blob => {
      return await transcribeVoice(blob)
    },
    onError: err => {
      setToast({ id: Date.now(), text: err })
    },
  })

  useEffect(() => {
    if (h.turns.length) end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [h.turns])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(undefined), 2800)
    return () => clearTimeout(t)
  }, [toast])

  // Back from the payment page (?order=…): confirm with the bank before saying anything.
  const { confirmPayment } = h
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('order')
    if (!id) return
    history.replaceState(null, '', location.pathname)
    void confirmPayment(id)
  }, [confirmPayment])

  /** Add to the cart and say so: a toast with Undo, and the cart bar bumps. */
  const add = useCallback(
    async (d: { id: string; name: string }, n: number) => {
      const err = await h.setQty(d.id, { add: n })
      if (!err) setToast({ id: Date.now(), text: `Added ${n}× ${d.name}`, undo: () => void h.setQty(d.id, { add: -n }).then(() => setToast(undefined)) })
      return err
    },
    [h],
  )

  const handlers: Omit<Handlers, 'latest'> = useMemo(
    () => ({
      onDish: setDish,
      onAdd: add,
      onSay: text => void h.say(text),
      onCollected: () => void h.checkout(),
      onPay: async o => {
        const r = await api<{ checkout_url?: string; order: OrderView }>(`/orders/${o.id}/pay`, { method: 'POST' })
        if (r.checkout_url) {
          // Mark it waiting first: if they come back with Back, the restored page knows to check it.
          h.updateOrder(r.order)
          location.href = r.checkout_url
        } else await h.load()
      },
      onOrder: h.updateOrder,
      confirming: h.confirming,
    }),
    [h, add],
  )

  const last = h.turns[h.turns.length - 1]
  const lastHunch = [...h.turns].reverse().find(t => t.role === 'hunch')
  const status = h.working ? (lastHunch?.steps.find(s => s.status === 'running')?.label ?? (lastHunch?.text ? 'Answering…' : 'Thinking…')) : undefined

  return (
    <>
      <AppShell
        className="gap-6"
        top={<TopBar mood={h.working ? 'thinking' : 'idle'} status={status} working={h.working} initial={h.profile?.name?.[0]} onProfile={() => setProfileOpen(true)} />}
        bottom={
          <div className="grid gap-2.5">
            <AnimatePresence>
              {!online && (
                <motion.p key="offline" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center justify-center gap-2 rounded-full bg-graphite-900/90 px-4 py-2 text-[13px] text-white">
                  <WifiSlashIcon size={15} /> You're offline. I'll be here when you're back.
                </motion.p>
              )}
              {toast && (
                <motion.div key={toast.id} initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6 }} transition={spring.snappy} role="status" className="flex items-center gap-2.5 rounded-full bg-white py-2 pl-4 pr-2 text-[14px] shadow-e3">
                  <CheckCircleIcon size={18} weight="fill" className="shrink-0 text-indigo-500" />
                  <span className="min-w-0 flex-1 truncate">{toast.text}</span>
                  {toast.undo && (
                    <Button size="sm" variant="text" onClick={toast.undo}>
                      Undo
                    </Button>
                  )}
                </motion.div>
              )}
              {!!h.cart?.count && (
                <motion.button
                  key="cart"
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  onClick={() => void h.checkout()}
                  className="flex h-12 w-full items-center gap-2.5 rounded-full bg-graphite-900 px-5 text-label text-white shadow-e3"
                >
                  <motion.span key={h.cart.count} initial={{ scale: 1.5 }} animate={{ scale: 1 }} transition={spring.snappy} className="grid size-6 place-items-center rounded-full bg-white/15 text-[12px] tabular-nums">
                    {h.cart.count}
                  </motion.span>
                  <span className="flex-1 truncate text-left">
                    {h.cart.restaurant} · <span className="tabular-nums">{inr(h.cart.total)}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <ShoppingBagIcon size={16} /> Checkout
                  </span>
                </motion.button>
              )}
            </AnimatePresence>
            <Composer
              listening={voice.isListening || voice.isProcessing}
              listeningLabel={voice.isProcessing ? 'Transcribing…' : 'Listening…'}
              transcript={voice.transcript}
              voiceLevel={voice.level}
              onMicToggle={voice.toggle}
              onSubmit={t => void h.say(t)}
              working={h.working}
              onStop={voice.stop}
            />
          </div>
        }
      >
        {h.home && <LiveToday home={h.home} onDish={setDish} onPrompt={p => void h.say(p)} onOrder={h.updateOrder} />}
        {h.turns.map(t =>
          t.role === 'user' ? (
            <div key={t.id} className="grid justify-items-end gap-1.5">
              <UserSays>{t.text}</UserSays>
              {t.failed && !h.working && (
                <button type="button" onClick={() => void h.say(t.failed!)} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-indigo-600">
                  <ArrowClockwiseIcon size={14} /> Didn't go through · Try again
                </button>
              )}
            </div>
          ) : t.role === 'event' ? (
            t.kind === 'cart' ? null : <EventRow key={t.id} t={t} handlers={{ ...handlers, latest: false }} />
          ) : (
            <HunchTurn key={t.id} t={t} handlers={{ ...handlers, latest: t === last }} />
          ),
        )}
        {h.error && !h.working && (
          <p className="flex items-center justify-center gap-2 text-center text-[13px] text-graphite-500">
            <WarningCircleIcon size={15} className="shrink-0" /> {h.error.slice(0, 140)}
            <button type="button" aria-label="Dismiss" onClick={() => h.setError(undefined)} className="text-graphite-400 hover:text-graphite-700">
              <XIcon size={13} />
            </button>
          </p>
        )}
        <div ref={end} className="h-px scroll-mb-44" />
      </AppShell>

      <BottomSheet open={!!dish} title={dish?.name ?? ''} onClose={() => setDish(undefined)}>
        {dish && <DishDetail key={dish.id} d={dish} onAdd={qty => add(dish, qty)} onClose={() => setDish(undefined)} />}
      </BottomSheet>
      <LiveProfile open={profileOpen} onClose={() => setProfileOpen(false)} onReset={async () => { await h.reset(); setProfileOpen(false) }} />
    </>
  )
}

/** One Hunch turn as one block: Hunch once, then what it understood, what it did, what it says, and what it hands over. */
function HunchTurn({ t, handlers }: { t: Turn; handlers: Handlers }) {
  const nothingYet = !t.ack.trim() && !t.text && !t.steps.length
  return (
    <div className="grid gap-3">
      <div className="flex gap-1.5 pr-4">
        <HunchMark mood={t.live ? 'thinking' : 'idle'} />
        <div className="grid min-w-0 flex-1 gap-2">
          {t.live && nothingYet && <Dots />}
          <Ack text={t.ack} />
          <Steps steps={t.steps} />
          {t.text && <Voice text={t.text} animate={!!t.streamed} />}
        </div>
      </div>
      {t.components.map((c, i) => (
        <motion.div key={i} initial={t.streamed ? { opacity: 0, y: 10 } : false} animate={{ opacity: 1, y: 0 }} transition={spring.gentle}>
          <ComponentView c={c} h={handlers} />
        </motion.div>
      ))}
    </div>
  )
}

/** Hunch's words. Words that arrive while you watch fade in as they come; old ones are just there. */
function Voice({ text, animate }: { text: string; animate: boolean }) {
  const words = text.split(' ')
  return (
    <p aria-label={text} className="text-[20px] font-medium leading-7 tracking-[-0.012em] text-pretty text-graphite-900">
      {words.map((w, i) => (
        <motion.span key={i} aria-hidden initial={animate ? { opacity: 0, filter: 'blur(4px)' } : false} animate={{ opacity: 1, filter: 'blur(0px)' }} transition={{ duration: 0.25 }} className="inline-block whitespace-pre">
          {i < words.length - 1 ? `${w} ` : w}
        </motion.span>
      ))}
    </p>
  )
}

function Dots() {
  return (
    <span className="mt-[11px] flex h-4 gap-1" aria-label="Hunch is thinking">
      {[0, 1, 2].map(i => (
        <motion.i key={i} className="block size-1.5 rounded-full bg-graphite-400" animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
      ))}
    </span>
  )
}

const EVENT_ICON: Record<string, ReactNode> = {
  paid: <CheckCircleIcon size={16} weight="fill" className="text-indigo-500" />,
  payment_failed: <WarningCircleIcon size={16} weight="fill" className="text-error" />,
  cancelled: <XCircleIcon size={16} className="text-graphite-500" />,
  setup: <SparkleIcon size={15} weight="fill" className="text-indigo-400" />,
}

/** Something that happened in the app (paid, cancelled, set up): a quiet line, and its card if it has one. */
function EventRow({ t, handlers }: { t: Turn; handlers: Handlers }) {
  return (
    <motion.div initial={t.streamed ? { opacity: 0 } : false} animate={{ opacity: 1 }} className="grid gap-3">
      <p className="flex items-center justify-center gap-1.5 text-center text-[13px] text-graphite-600">
        {EVENT_ICON[t.kind]}
        {t.text}
      </p>
      {t.components.map((c, i) => (
        <ComponentView key={i} c={c} h={handlers} />
      ))}
    </motion.div>
  )
}

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    addEventListener('online', on)
    addEventListener('offline', off)
    return () => {
      removeEventListener('online', on)
      removeEventListener('offline', off)
    }
  }, [])
  return online
}

/** First load: the shape of home, shimmering, so the screen is never blank. */
function Loading() {
  return (
    <AppShell top={<TopBar mood="thinking" status="Waking up…" working />}>
      <div aria-hidden className="grid gap-5 rounded-[28px] bg-indigo-50 p-5">
        <div className="h-3 w-40 animate-pulse rounded-full bg-indigo-100" />
        <div className="grid gap-2">
          <div className="h-3 w-24 animate-pulse rounded-full bg-indigo-100" />
          <div className="h-7 w-full animate-pulse rounded-[10px] bg-indigo-100" />
          <div className="h-7 w-2/3 animate-pulse rounded-[10px] bg-indigo-100" />
        </div>
        <div className="h-[92px] animate-pulse rounded-[20px] bg-white/70" />
        <div className="flex gap-2">
          {[64, 96, 56].map(w => (
            <div key={w} className="h-8 animate-pulse rounded-full bg-white/70" style={{ width: w }} />
          ))}
        </div>
      </div>
    </AppShell>
  )
}

function CantReach({ error }: { error?: string }) {
  return (
    <AppShell top={<TopBar mood="sleepy" />}>
      <div className="grid flex-1 place-items-center">
        <div className="grid justify-items-center gap-3 text-center">
          <WifiSlashIcon size={28} className="text-graphite-400" />
          <p className="text-[17px] font-medium">I can't reach the kitchen network.</p>
          <p className="max-w-[300px] text-[13px] text-graphite-500">{error ?? 'Check your connection.'}</p>
          <Button onClick={() => location.reload()} icon={<ArrowClockwiseIcon size={16} />}>
            Try again
          </Button>
        </div>
      </div>
    </AppShell>
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
  notes: { id: number; text: string }[]
}

const DIET_LABEL: Record<string, string> = { nonveg: 'Eats everything', eggetarian: 'Veg + eggs', veg: 'Vegetarian', jain: 'Jain', vegan: 'Vegan' }

/** Profile, live: what Hunch knows (rules and tastes), where it delivers, past orders, and the off switches. */
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
            {!me ? (
              <div className="grid gap-3" aria-hidden>
                {[80, 140, 100].map(h => (
                  <div key={h} className="animate-pulse rounded-[24px] bg-white" style={{ height: h }} />
                ))}
              </div>
            ) : (
              <>
                <div className="grid gap-0.5">
                  <h1 className="text-title">{me.profile.name || 'You'}</h1>
                  <span className="text-label font-normal text-graphite-500">{me.profile.signed_in ? me.profile.email : 'On this device'}</span>
                </div>
                <Card title="Food rules">
                  <p className="text-label font-normal">
                    {DIET_LABEL[me.profile.diet] ?? me.profile.diet} · {me.profile.allergies.length ? `no ${me.profile.allergies.join(', ')}` : 'no allergies'}
                  </p>
                  <p className="text-caption font-normal text-graphite-500">Tell Hunch to change these, e.g. "I'm vegetarian now".</p>
                </Card>
                <Card title="Your tastes">
                  {me.notes.length ? (
                    me.notes.map(m => (
                      <div key={m.id} className="flex items-center gap-3">
                        <span className="flex-1 text-label font-normal">{m.text}</span>
                        <IconButton aria-label="Forget this" variant="ghost" size="sm" icon={<XIcon size={14} />} onClick={async () => { await api(`/notes/${m.id}`, { method: 'DELETE' }); setMe({ ...me, notes: me.notes.filter(x => x.id !== m.id) }) }} />
                      </div>
                    ))
                  ) : (
                    <p className="text-label font-normal text-graphite-500">Nothing yet. Tell Hunch things like "I hate coriander".</p>
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
                  {me.notes.length > 0 && (
                    <Button variant="text" onClick={async () => { await api('/notes/forget', { method: 'POST' }); setMe({ ...me, notes: [] }) }}>
                      Forget my tastes
                    </Button>
                  )}
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

const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="grid gap-2 rounded-[24px] bg-white p-4 shadow-e1">
    <h2 className="text-[15px] font-semibold">{title}</h2>
    {children}
  </section>
)
