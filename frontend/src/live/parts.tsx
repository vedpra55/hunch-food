import { CheckCircleIcon, CheckIcon, CircleNotchIcon, ForkKnifeIcon, MinusIcon, PlusIcon, SparkleIcon, StarIcon, ThumbsDownIcon, ThumbsUpIcon, XCircleIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { HunchCard } from '../components/chat/Cards'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { VegMark } from '../components/ui/Meta'
import { spring } from '../design/motion'
import { cn } from '../lib/cn'
import { api, sendCode, verifyCode, type Area, type Component, type DishCard, type Menu, type OrderView, type RestaurantCard, type Step } from './api'

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`

/** A photo from the API (URL), with the same quiet placeholder as the demo. */
export function Pic({ src, className }: { src?: string; className?: string }) {
  const [ok, setOk] = useState(true)
  return (
    <div className={cn('relative overflow-hidden bg-indigo-50', className)}>
      {src && ok ? (
        <img src={src} alt="" loading="lazy" decoding="async" onError={() => setOk(false)} className="size-full object-cover" />
      ) : (
        <div className="grid size-full place-items-center text-indigo-300">
          <ForkKnifeIcon size={22} />
        </div>
      )}
    </div>
  )
}

// ---------- what Hunch did ----------

/** The work, visible: each tool call as a line that ticks when done. */
export function Steps({ steps }: { steps: Step[] }) {
  if (!steps.length) return null
  return (
    <ul className="grid gap-1" aria-label="What Hunch did">
      {steps.map(s => (
        <motion.li key={s.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 text-[13px] leading-5 text-graphite-500">
          {s.status === 'running' ? (
            <CircleNotchIcon size={14} className="mt-[3px] shrink-0 animate-spin text-indigo-500" />
          ) : (
            <CheckCircleIcon size={14} weight="fill" className="mt-[3px] shrink-0 text-indigo-400" />
          )}
          <span>
            {s.label}
            {s.summary && s.status !== 'running' && <span className="text-graphite-400"> · {s.summary}</span>}
          </span>
        </motion.li>
      ))}
    </ul>
  )
}

/** The acknowledgement: what Hunch understood, before it went to work. Quieter than the answer. */
export function Ack({ text }: { text: string }) {
  if (!text.trim()) return null
  return <p className="text-[15px] leading-[22px] text-graphite-600">{text.trim()}</p>
}

// ---------- components Hunch hands over ----------

export interface Handlers {
  onDish: (d: DishCard) => void
  /** Add to the cart; resolves to an error to show, or null when it worked (the caller confirms it). */
  onAdd: (dish: { id: string; name: string }, add: number) => Promise<string | null>
  onSay: (text: string) => void
  onCollected: () => void
  onPay: (o: OrderView) => Promise<void>
  onOrder: (o: OrderView) => void
  /** Orders waiting on the bank after the payment page. */
  confirming: string[]
  /** Only the newest turn's questions can still be answered. */
  latest: boolean
}

export function ComponentView({ c, h }: { c: Component; h: Handlers }) {
  switch (c.kind) {
    case 'dishes':
      return <DishRow items={c.items} onDish={h.onDish} />
    case 'restaurants':
      return <RestaurantList items={c.items} onSay={h.onSay} />
    case 'menu':
      return <MenuCard m={c.restaurant} onAdd={h.onAdd} />
    case 'choices':
      return h.latest ? <Choices options={c.options} multi={c.multi} onSay={h.onSay} /> : null
    case 'collect':
      return <Collect c={c} onDone={h.onCollected} />
    case 'checkout':
      return <Checkout o={c.order} onPay={h.onPay} confirming={h.confirming.includes(c.order.id)} />
    case 'order':
      return <OrderCard o={c.order} onChange={h.onOrder} />
  }
}

function DishRow({ items, onDish }: { items: DishCard[]; onDish: (d: DishCard) => void }) {
  return (
    <HunchCard>
      <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((d, i) => (
          <motion.button
            key={d.id}
            type="button"
            onClick={() => onDish(d)}
            whileTap={{ scale: 0.97 }}
            transition={spring.snappy}
            className={cn('grid shrink-0 snap-start content-start gap-2 text-left', i === 0 ? 'w-[168px]' : 'w-[132px]', !d.open && 'opacity-60')}
          >
            <div className="relative">
              <Pic src={d.photo} className="aspect-square w-full rounded-[14px]" />
              {d.offer && <span className="absolute left-1.5 top-1.5 rounded-full bg-white/95 px-1.5 py-[3px] text-[10px] font-semibold leading-none text-indigo-700">{d.offer}</span>}
              {i === 0 && (
                <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-white/95 text-indigo-500">
                  <SparkleIcon size={11} weight="fill" />
                </span>
              )}
            </div>
            <div className="grid gap-0.5 px-0.5">
              <span className="line-clamp-2 text-[14px] font-semibold leading-[18px]">
                <VegMark veg={d.diet === 'veg'} className="mr-1 align-[-1px]" />
                {d.name}
              </span>
              <span className="truncate text-[12px] leading-4 text-graphite-600">{d.restaurant}</span>
              <span className="text-[12px] leading-4 tabular-nums text-graphite-500">{d.open ? `${inr(d.price)} · ${d.eta_min} min` : `${inr(d.price)} · ${d.opens}`}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </HunchCard>
  )
}

function RestaurantList({ items, onSay }: { items: RestaurantCard[]; onSay: (t: string) => void }) {
  return (
    <HunchCard className="gap-3">
      {items.map(r => (
        <button key={r.id} type="button" onClick={() => onSay(`Show me ${r.name}'s menu`)} className={cn('flex items-center gap-3 text-left', !r.delivers_here && 'opacity-60')}>
          <Pic src={r.photo} className="size-14 shrink-0 rounded-[12px]" />
          <div className="grid min-w-0 flex-1 gap-0.5">
            <span className="truncate text-[15px] font-semibold">{r.name}</span>
            <span className="truncate text-[12px] text-graphite-600">
              {r.cuisines.slice(0, 2).join(', ')} · {r.area}
            </span>
            <span className="flex items-center gap-1 text-[12px] tabular-nums text-graphite-500">
              <StarIcon size={11} weight="fill" className="text-graphite-400" />
              {r.rating} · {r.delivers_here ? (r.open ? `${r.eta_min} min` : r.opens) : `${r.distance_km} km, doesn't reach you`}
              {r.offer && <span className="text-indigo-700"> · {r.offer}</span>}
            </span>
          </div>
        </button>
      ))}
    </HunchCard>
  )
}

function MenuCard({ m, onAdd }: { m: Menu; onAdd: Handlers['onAdd'] }) {
  const [msg, setMsg] = useState<string>()
  return (
    <HunchCard className="gap-3">
      <div className="flex items-center gap-3">
        <Pic src={m.photo} className="size-12 shrink-0 rounded-[12px]" />
        <div className="grid min-w-0">
          <span className="truncate text-[15px] font-semibold">{m.name}</span>
          <span className="text-[12px] tabular-nums text-graphite-500">
            {m.rating}★ · {m.open ? `${m.eta_min} min` : m.opens}
            {m.offers[0] && <span className="text-indigo-700"> · {m.offers[0]}</span>}
          </span>
        </div>
      </div>
      <div className="grid max-h-[360px] gap-4 overflow-y-auto pr-1">
        {m.categories.map(c => (
          <section key={c.name} className="grid gap-2">
            <h3 className="text-caption text-graphite-500">{c.name}</h3>
            {c.dishes.map(d => (
              <div key={d.id} className="flex items-center gap-3">
                <div className="grid min-w-0 flex-1">
                  <span className="truncate text-label">
                    <VegMark veg={d.diet === 'veg'} className="mr-1.5 align-[-1px]" />
                    {d.name}
                  </span>
                  <span className="text-[12px] tabular-nums text-graphite-500">
                    {inr(d.price)}
                    {d.offer && <span className="text-indigo-700"> · {d.offer}</span>}
                  </span>
                </div>
                <AddButton
                  onAdd={async () => {
                    const e = await onAdd(d, 1)
                    setMsg(e ?? undefined)
                    return !e
                  }}
                />
              </div>
            ))}
          </section>
        ))}
      </div>
      {msg && <p className="text-[13px] text-error">{msg}</p>}
    </HunchCard>
  )
}

/** A small Add that shows it worked: a spinner, then a tick for a moment. */
function AddButton({ onAdd }: { onAdd: () => Promise<boolean> }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  return (
    <Button
      size="sm"
      variant={state === 'done' ? 'primary' : 'secondary'}
      disabled={state === 'busy'}
      className="min-w-[72px]"
      onClick={async () => {
        setState('busy')
        const ok = await onAdd()
        setState(ok ? 'done' : 'idle')
        if (ok) setTimeout(() => setState('idle'), 1400)
      }}
    >
      {state === 'busy' ? <CircleNotchIcon size={14} className="animate-spin" /> : state === 'done' ? <CheckIcon size={14} weight="bold" /> : 'Add'}
    </Button>
  )
}

function Choices({ options, multi, onSay }: { options: string[]; multi: boolean; onSay: (t: string) => void }) {
  const [picked, setPicked] = useState<string[]>([])
  const [sent, setSent] = useState(false)
  if (sent) return null
  return (
    <div className="flex flex-wrap gap-2 pl-[38px]">
      {options.map(o => (
        <Chip
          key={o}
          variant="filter"
          selected={picked.includes(o)}
          onClick={() => {
            if (!multi) {
              setSent(true)
              onSay(o)
            } else setPicked(p => (p.includes(o) ? p.filter(x => x !== o) : [...p, o]))
          }}
        >
          {o}
        </Chip>
      ))}
      {multi && (
        <Button
          size="sm"
          onClick={() => {
            setSent(true)
            onSay(picked.length ? picked.join(', ') : 'Nothing')
          }}
        >
          Done
        </Button>
      )}
    </div>
  )
}

// ---------- before money moves ----------

/** Name, phone, where exactly, and a verified email: only what's missing, in one card. */
function Collect({ c, onDone }: { c: Extract<Component, { kind: 'collect' }>; onDone: () => void }) {
  const need = new Set(c.missing)
  const [name, setName] = useState(c.name)
  const [phone, setPhone] = useState(c.phone)
  const [areas, setAreas] = useState<Area[]>([])
  const [area, setArea] = useState('lpu-bh')
  const [line, setLine] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [err, setErr] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(!c.missing.length)

  useEffect(() => {
    if (!need.has('address')) return
    api<{ areas: Area[] }>('/areas').then(r => setAreas(r.areas))
    // Start from where they said they are; only the block and room (or street) is new.
    api<{ addresses: { area_id: string; is_default: boolean }[] }>('/me').then(r => {
      const a = r.addresses.find(x => x.is_default) ?? r.addresses[0]
      if (a) setArea(a.area_id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const campus = areas.find(a => a.id === area)?.campus
  const submit = async () => {
    setErr(undefined)
    setBusy(true)
    try {
      if (need.has('sign_in')) {
        if (!codeSent) {
          await sendCode(email.trim())
          setCodeSent(true)
          setBusy(false)
          return
        }
        await verifyCode(email.trim(), code.trim())
      }
      if (need.has('name') || need.has('phone'))
        await api('/me', {
          method: 'PATCH',
          body: {
            ...(need.has('name') && { name }),
            ...(need.has('phone') && { phone }),
          },
        })
      if (need.has('address'))
        await api('/addresses', {
          method: 'POST',
          body: { area_id: area, line },
        })
      setDone(true)
      onDone()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <p className="flex items-center gap-2 pl-[38px] text-[14px] text-graphite-600">
        <CheckCircleIcon size={16} weight="fill" className="text-indigo-500" /> Details saved
      </p>
    )
  }
  const field = 'h-11 w-full rounded-[12px] bg-graphite-50 px-3.5 text-[15px] outline-none placeholder:text-graphite-400 focus:ring-2 focus:ring-indigo-200'
  return (
    <HunchCard className="gap-3">
      {need.has('name') && <input className={field} placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />}
      {need.has('phone') && <input className={field} inputMode="numeric" placeholder="Phone for the rider (10 digits)" value={phone} onChange={e => setPhone(e.target.value)} />}
      {need.has('address') && (
        <>
          <select className={field} value={area} onChange={e => setArea(e.target.value)} aria-label="Area">
            {areas.map(a => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <input className={field} placeholder={campus ? 'Block and room, e.g. BH-4, Room 212' : 'House, street, landmark'} value={line} onChange={e => setLine(e.target.value)} />
          {campus && <p className="-mt-1 text-[12px] text-graphite-500">Riders meet you at Gate 1.</p>}
        </>
      )}
      {need.has('sign_in') && (
        <>
          <input className={field} type="email" placeholder="Email, for a 6-digit code" value={email} onChange={e => setEmail(e.target.value)} disabled={codeSent} />
          {codeSent && <input className={cn(field, 'tracking-[0.4em]')} inputMode="numeric" maxLength={6} placeholder="------" value={code} onChange={e => setCode(e.target.value)} autoFocus />}
        </>
      )}
      {err && <p className="text-[13px] text-error">{err}</p>}
      <Button block onClick={submit} disabled={busy}>
        {busy ? 'One sec…' : need.has('sign_in') && !codeSent ? 'Send code' : 'Save and continue'}
      </Button>
    </HunchCard>
  )
}

function Checkout({ o, onPay, confirming }: { o: OrderView; onPay: (o: OrderView) => Promise<void>; confirming: boolean }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string>()
  // Back from the payment page restores this card mid-"Opening payment…": let it be tapped again.
  useEffect(() => {
    const again = () => setBusy(false)
    addEventListener('pageshow', again)
    return () => removeEventListener('pageshow', again)
  }, [])
  const live = o.status === 'draft' || o.status === 'awaiting_payment'
  if (o.status === 'placed') {
    return (
      <HunchCard>
        <div className="flex items-center gap-3">
          <CheckCircleIcon size={24} weight="fill" className="shrink-0 text-indigo-500" />
          <span className="grid min-w-0">
            <span className="text-[15px] font-semibold">
              {o.method === 'cod' ? 'Placed' : 'Paid'} · {inr(o.total)}
            </span>
            <span className="truncate text-[13px] text-graphite-500">
              {o.restaurant} · {o.items.map(i => `${i.qty}× ${i.name}`).join(', ')}
            </span>
          </span>
        </div>
      </HunchCard>
    )
  }
  if (!live) {
    return (
      <HunchCard className="gap-1">
        <span className="text-[15px] font-semibold text-graphite-500">Your order from {o.restaurant}</span>
        <span className="text-[13px] text-graphite-500">{o.status === 'cancelled' ? 'Cancelled.' : 'Not paid. A newer checkout replaced this one.'}</span>
      </HunchCard>
    )
  }
  return (
    <HunchCard className="gap-3">
      <span className="text-[15px] font-semibold">Your order from {o.restaurant}</span>
      <ul className="grid gap-1.5">
        {o.items.map(i => (
          <li key={i.name} className="flex justify-between text-label font-normal">
            <span>
              <span className="tabular-nums text-graphite-500">{i.qty}× </span>
              {i.name}
            </span>
            <span className="tabular-nums">{inr(i.price * i.qty)}</span>
          </li>
        ))}
      </ul>
      <div className="grid gap-1 rounded-[14px] bg-graphite-50 px-3.5 py-2.5 text-[13px] text-graphite-600">
        <span>
          {o.address}
          {o.handoff && ` · ${o.handoff}`}
        </span>
        <span className="tabular-nums">
          About {o.eta_min} min · {o.phone}
        </span>
      </div>
      <div className="grid gap-1 text-[13px] tabular-nums text-graphite-500">
        <Row label="Items" value={inr(o.item_total)} />
        <Row label="Delivery" value={o.delivery_fee ? inr(o.delivery_fee) : 'Free'} />
        {o.discount > 0 && <Row label={o.offer_label} value={`−${inr(o.discount)}`} className="text-indigo-700" />}
        <Row label="To pay" value={inr(o.total)} className="text-[15px] font-semibold text-graphite-900" />
      </div>
      {err && <p className="text-[13px] text-error">{err}</p>}
      {confirming ? (
        <div className="flex h-12 items-center justify-center gap-2 rounded-full bg-indigo-50 text-[15px] font-medium text-indigo-700">
          <CircleNotchIcon size={18} className="animate-spin" />
          <span className="text-shimmer">Confirming your payment…</span>
        </div>
      ) : (
        <Button
          size="lg"
          block
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            setErr(undefined)
            try {
              await onPay(o)
            } catch (e) {
              setErr((e as Error).message)
              setBusy(false)
            }
          }}
        >
          {busy ? 'Opening payment…' : o.method === 'cod' ? `Place order · ${inr(o.total)}` : `Pay ${inr(o.total)}`}
        </Button>
      )}
      <span className="text-center text-caption font-normal text-graphite-400">{o.method === 'cod' ? 'Cash on delivery' : 'UPI or card · Dodo Payments test mode'}</span>
    </HunchCard>
  )
}

const Row = ({ label, value, className }: { label: string; value: string; className?: string }) => (
  <div className={cn('flex justify-between', className)}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
)

const STAGES = ['cooking', 'on_the_way', 'near', 'delivered'] as const
const STAGE_TEXT: Record<string, string> = {
  cooking: 'is cooking',
  on_the_way: 'is on its way',
  near: 'is almost there',
  delivered: 'was delivered',
}

/** The live order: moves with the clock, cancel only while cooking (refund in full), rate once delivered. */
export function OrderCard({ o, onChange }: { o: OrderView; onChange: (o: OrderView) => void }) {
  const [asking, setAsking] = useState(false)
  const [err, setErr] = useState<string>()
  const active = ['cooking', 'on_the_way', 'near'].includes(o.stage)

  useEffect(() => {
    if (!active) return
    const t = setInterval(() => api<{ order: OrderView }>(`/orders/${o.id}`).then(r => onChange(r.order)), 30_000)
    return () => clearInterval(t)
  }, [active, o.id, onChange])

  if (o.stage === 'cancelled') {
    return (
      <HunchCard>
        <div className="flex items-start gap-3">
          <XCircleIcon size={20} className="mt-0.5 shrink-0 text-graphite-500" />
          <p className="text-label font-normal text-graphite-700">
            Cancelled. {o.method === 'online' ? `${inr(o.total)} is on its way back${o.refund_id ? ` (refund ${o.refund_id.slice(-6)})` : ''}, usually in 3–5 days.` : 'Nothing to pay.'}
          </p>
        </div>
      </HunchCard>
    )
  }
  const step = STAGES.indexOf(o.stage as (typeof STAGES)[number])
  return (
    <HunchCard className="gap-3.5">
      <div className="grid">
        <span className="text-caption font-normal text-graphite-500">
          {o.restaurant} {STAGE_TEXT[o.stage] ?? ''}
        </span>
        <span className="text-[26px] font-semibold leading-8 tracking-[-0.02em] tabular-nums">{o.stage === 'delivered' ? 'Delivered' : o.stage === 'near' ? 'Arriving now' : `${o.eta_left} min`}</span>
        {o.arrives_at && active && (
          <span className="text-[13px] text-graphite-500">
            Around {o.arrives_at}
            {o.handoff ? ` · ${o.handoff}` : ''}
          </span>
        )}
      </div>
      <div className="grid grid-cols-4 gap-1">
        {STAGES.map((_, i) => (
          <span key={i} className={cn('h-1 rounded-full', i <= step ? 'bg-indigo-500' : 'bg-graphite-100')} />
        ))}
      </div>
      {err && <p className="text-[13px] text-error">{err}</p>}
      {o.can_cancel &&
        (asking ? (
          <div className="flex items-center justify-between gap-2 rounded-[14px] bg-graphite-50 p-3 text-label font-normal">
            <span>Cancel? {o.method === 'online' ? `${inr(o.total)} comes back.` : ''}</span>
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    onChange((await api<{ order: OrderView }>(`/orders/${o.id}/cancel`, { method: 'POST' })).order)
                  } catch (e) {
                    setErr((e as Error).message)
                  }
                  setAsking(false)
                }}
              >
                Cancel order
              </Button>
              <Button size="sm" variant="text" onClick={() => setAsking(false)}>
                Keep it
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="text" className="justify-self-start" onClick={() => setAsking(true)}>
            Cancel order
          </Button>
        ))}
      {o.stage === 'delivered' &&
        (o.rating ? (
          <p className="text-label font-normal text-graphite-600">{o.rating === 'up' ? "Glad you liked it. I'll remember." : "Noted. I'll steer you away from it."}</p>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-label font-normal">How was it?</span>
            <div className="flex gap-2">
              {(['up', 'down'] as const).map(r => (
                <Button
                  key={r}
                  size="sm"
                  variant="secondary"
                  icon={r === 'up' ? <ThumbsUpIcon size={16} /> : <ThumbsDownIcon size={16} />}
                  onClick={async () => onChange((await api<{ order: OrderView }>(`/orders/${o.id}/rate`, { method: 'POST', body: { rating: r } })).order)}
                >
                  {r === 'up' ? 'Loved it' : 'Not great'}
                </Button>
              ))}
            </div>
          </div>
        ))}
    </HunchCard>
  )
}

/** Dish details: why Hunch picked it, what people say, and a quantity to add. */
export function DishDetail({ d, onAdd, onClose }: { d: DishCard; onAdd: (qty: number) => Promise<string | null>; onClose: () => void }) {
  const [qty, setQty] = useState(1)
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [err, setErr] = useState<string>()
  const add = async () => {
    setState('busy')
    setErr(undefined)
    const e = await onAdd(qty)
    if (e) {
      setErr(e)
      setState('idle')
      return
    }
    setState('done')
    // Long enough to see the tick land, then out of the way.
    setTimeout(onClose, 750)
  }
  return (
    <div className="grid gap-4">
      <Pic src={d.photo} className="aspect-[16/10] w-full rounded-[18px]" />
      <div className="grid gap-1">
        <span className="text-[13px] text-graphite-500">
          {d.restaurant} · {d.open ? `${d.eta_min} min` : d.opens} · {d.rating}★
        </span>
        <p className="text-[14px] leading-5 text-graphite-700">{d.description}</p>
      </div>
      {d.reasons.length > 0 && <Note icon={<SparkleIcon size={14} weight="fill" className="text-indigo-500" />}>{d.reasons.join(' · ')}</Note>}
      {d.review_summary.length > 0 && <Note>{d.review_summary.join(' · ')}</Note>}
      <span className="text-[12px] tabular-nums text-graphite-500">
        {d.kcal} kcal · {d.protein_g} g protein
      </span>
      {err && <p className="rounded-[14px] bg-graphite-50 px-3.5 py-2.5 text-[13px] leading-5 text-graphite-800">{err}</p>}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-full bg-graphite-50 p-1">
          <button type="button" aria-label="One less" onClick={() => setQty(q => Math.max(1, q - 1))} className="grid size-9 place-items-center rounded-full hover:bg-white">
            <MinusIcon size={16} />
          </button>
          <span className="w-6 text-center tabular-nums">{qty}</span>
          <button type="button" aria-label="One more" onClick={() => setQty(q => q + 1)} className="grid size-9 place-items-center rounded-full hover:bg-white">
            <PlusIcon size={16} />
          </button>
        </div>
        <Button size="lg" className={cn('flex-1', state === 'done' && 'bg-indigo-600 hover:bg-indigo-600')} disabled={!d.open} aria-busy={state === 'busy'} onClick={() => state === 'idle' && add()}>
          <AnimatePresenceSwap k={state}>
            {state === 'busy' ? (
              <CircleNotchIcon size={20} className="animate-spin" />
            ) : state === 'done' ? (
              <span className="inline-flex items-center gap-2">
                <CheckIcon size={18} weight="bold" /> Added to cart
              </span>
            ) : d.open ? (
              `Add · ${inr(d.price * qty)}`
            ) : (
              d.opens
            )}
          </AnimatePresenceSwap>
        </Button>
      </div>
    </div>
  )
}

/** Cross-fades a button's label when its state changes. */
function AnimatePresenceSwap({ k, children }: { k: string; children: ReactNode }) {
  return (
    <motion.span key={k} initial={{ opacity: 0, y: 6, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring.snappy} className="inline-flex items-center">
      {children}
    </motion.span>
  )
}

const Note = ({ children, icon }: { children: ReactNode; icon?: ReactNode }) => (
  <p className="flex items-start gap-2 rounded-[14px] bg-graphite-50 px-3.5 py-2.5 text-[13px] leading-5 text-graphite-700">
    {icon && <span className="mt-[3px]">{icon}</span>}
    <span>{children}</span>
  </p>
)
