import { CaretLeftIcon, CaretRightIcon, CheckCircleIcon, CreditCardIcon, MapPinIcon, ShoppingBagIcon, XIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useRef, useState, type ReactNode } from 'react'
import { DISH_BY_ID } from '../../data/menu'
import { RESTAURANT_BY_ID } from '../../data/restaurants'
import { totals, type CartLine, type Plan } from '../../domain/chat'
import { ADDRESS, money, PAYMENT } from '../../domain/copy'
import type { Ask, RuleChip, Suggestion, Tracking } from '../../domain/types'
import { spring } from '../../design/motion'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'
import { Meta, VegMark } from '../ui/Meta'
import { Photo } from '../ui/Photo'

const surface = 'rounded-[20px] bg-white shadow-e1'

// ---------- dish card (glance: 4 facts) ----------

export function DishCard({ s, onOpen }: { s: Suggestion; onOpen: (s: Suggestion) => void }) {
  return (
    <motion.button
      type="button"
      onClick={() => onOpen(s)}
      whileTap={{ scale: 0.97 }}
      transition={spring.snappy}
      aria-label={`${s.dish.name} from ${s.restaurant.name}, ${money(s.dish.price)}, ${s.restaurant.etaMin} minutes`}
      className={cn(surface, 'w-[200px] shrink-0 snap-start overflow-hidden text-left', !s.open && 'opacity-60')}
    >
      <div className="relative">
        <Photo slug={s.dish.id} alt="" px={200} className="aspect-[4/3] w-full" />
        {s.tag && <span className="absolute left-2 top-2 rounded-full bg-white/92 px-2 py-1 text-[11px] font-semibold leading-none text-graphite-800 shadow-e1">{s.tag}</span>}
      </div>
      <div className="grid gap-0.5 px-3 pb-3 pt-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <VegMark veg={s.dish.diet === 'veg'} />
          <span className="truncate text-[15px] font-semibold leading-5">{s.dish.name}</span>
        </div>
        <span className="truncate text-[13px] text-graphite-600">
          {s.restaurant.name} · {s.restaurant.rating}★
        </span>
        {s.open ? <Meta parts={[money(s.dish.price), `${s.restaurant.etaMin} min`]} /> : <span className="text-caption text-graphite-500">{s.opensLabel}</span>}
      </div>
    </motion.button>
  )
}

/** A titled, horizontally scrolling group. The next card peeks in so it reads as scrollable. */
export function DishRow({ title, items, onOpen }: { title?: string; items: Suggestion[]; onOpen: (s: Suggestion) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const by = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * 212, behavior: 'smooth' })
  return (
    <section className="grid gap-2.5">
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">{title}</h3>
          <div className="hidden gap-1 md:flex">
            <button type="button" aria-label="Scroll left" onClick={() => by(-1)} className="grid size-7 place-items-center rounded-full text-graphite-500 hover:bg-graphite-100">
              <CaretLeftIcon size={16} />
            </button>
            <button type="button" aria-label="Scroll right" onClick={() => by(1)} className="grid size-7 place-items-center rounded-full text-graphite-500 hover:bg-graphite-100">
              <CaretRightIcon size={16} />
            </button>
          </div>
        </div>
      )}
      <div ref={ref} className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 pt-0.5 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
        {items.map(s => (
          <DishCard key={s.dish.id} s={s} onOpen={onOpen} />
        ))}
      </div>
    </section>
  )
}

// ---------- your usual (the only button on Home) ----------

export function UsualCard({ s, onOpen, onOrder }: { s: Suggestion; onOpen: (s: Suggestion) => void; onOrder: (s: Suggestion) => void }) {
  return (
    <div className={cn(surface, 'grid gap-3 p-3', !s.open && 'opacity-70')}>
      <button type="button" onClick={() => onOpen(s)} className="flex min-w-0 items-center gap-3 text-left">
        <Photo slug={s.dish.id} alt="" px={96} className="size-[84px] shrink-0 rounded-[14px]" />
        <div className="grid min-w-0 gap-0.5">
          <span className="text-caption text-indigo-600">Your usual</span>
          <div className="flex min-w-0 items-center gap-1.5">
            <VegMark veg={s.dish.diet === 'veg'} />
            <span className="truncate text-[15px] font-semibold">{s.dish.name}</span>
          </div>
          <span className="truncate text-[13px] text-graphite-600">
            {s.restaurant.name} · {s.restaurant.rating}★
          </span>
          {s.customisation && <span className="truncate text-caption font-normal text-graphite-500">{s.customisation.join(' · ')}</span>}
        </div>
      </button>
      {s.open ? (
        <Button block size="lg" onClick={() => onOrder(s)}>
          Order again · <span className="font-mono">{money(s.dish.price)}</span>
        </Button>
      ) : (
        <Button block size="lg" disabled>
          {s.restaurant.name} · {s.opensLabel}
        </Button>
      )}
    </div>
  )
}

// ---------- rules and asks ----------

export function RuleChips({ rules, onOff }: { rules: RuleChip[]; onOff: (r: RuleChip) => void }) {
  if (!rules.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {rules.map(r => (
        <span key={r.id} className="inline-flex h-7 items-center gap-1 rounded-full bg-white pl-3 pr-1 text-[12px] font-medium text-graphite-700 shadow-e1">
          {r.label}
          <button type="button" onClick={() => onOff(r)} aria-label={`Turn off ${r.label} for today`} className="grid size-5 place-items-center rounded-full text-graphite-400 hover:bg-graphite-100 hover:text-graphite-700">
            <XIcon size={12} weight="bold" />
          </button>
        </span>
      ))}
    </div>
  )
}

export function AskCard({ ask, onAnswer }: { ask: Ask; onAnswer: (yes: boolean) => void }) {
  return (
    <div className={cn(surface, 'grid gap-3 p-4')}>
      <p className="text-[15px] leading-[22px]">{ask.text}</p>
      <div className="flex gap-2">
        <Button variant="soft" size="sm" onClick={() => onAnswer(true)}>
          {ask.yes}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onAnswer(false)}>
          {ask.no}
        </Button>
      </div>
    </div>
  )
}

// ---------- order lines (shared by plan and checkout) ----------

function Lines({ lines }: { lines: CartLine[] }) {
  return (
    <ul className="grid gap-2.5">
      {lines.map(l => {
        const d = DISH_BY_ID[l.dishId]
        return (
          <li key={l.dishId} className="flex min-w-0 items-center gap-3">
            <Photo slug={d.id} alt="" px={48} className="size-11 shrink-0 rounded-[10px]" />
            <div className="grid min-w-0 flex-1">
              <span className="truncate text-label font-medium">
                {l.qty > 1 && <span className="font-mono text-graphite-500">{l.qty}× </span>}
                {d.name}
              </span>
              {l.customisation?.length ? <span className="truncate text-caption font-normal text-graphite-500">{l.customisation.join(' · ')}</span> : null}
            </div>
            <span className="font-mono text-label font-normal tabular-nums">{money(d.price * l.qty)}</span>
          </li>
        )
      })}
    </ul>
  )
}

function Row({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] bg-graphite-50 px-3.5 py-2.5">
      <span className="text-graphite-500">{icon}</span>
      <div className="grid min-w-0">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-graphite-500">{label}</span>
        <span className="truncate text-label font-normal">{value}</span>
      </div>
    </div>
  )
}

// ---------- plan ----------

export function PlanCard({ plan, ordered, onOrder, onChange }: { plan: Plan; ordered: boolean; onOrder: () => void; onChange: () => void }) {
  return (
    <div className={cn(surface, 'grid gap-4 p-4')}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] font-semibold">
          For {plan.people} · {plan.restaurant?.name}
        </span>
        <span className="font-mono text-caption font-normal text-graphite-500">{plan.restaurant?.etaMin} min</span>
      </div>
      <Lines lines={plan.lines} />
      <div className="flex items-baseline justify-between border-t border-graphite-50 pt-3">
        <span className="text-label text-graphite-600">{money(Math.round(plan.total / plan.people))} each</span>
        <span className="font-mono text-[15px] font-medium">{money(plan.total)}</span>
      </div>
      {!ordered && (
        <div className="flex gap-2">
          <Button variant="secondary" size="lg" className="flex-1" onClick={onChange}>
            Change
          </Button>
          <Button size="lg" className="flex-[2]" onClick={onOrder}>
            Order · <span className="font-mono">{money(plan.total)}</span>
          </Button>
        </div>
      )}
    </div>
  )
}

// ---------- checkout (Hunch asks before it spends) ----------

export type CheckoutStatus = 'open' | 'paying' | 'paid' | 'dismissed'

export function CheckoutCard({ lines, status, onPay, onNotNow }: { lines: CartLine[]; status: CheckoutStatus; onPay: () => void; onNotNow: () => void }) {
  const t = totals(lines)
  const [details, setDetails] = useState(false)
  const title = t.restaurants.length === 1 ? `Placing your order at ${t.restaurants[0].name}` : `Placing your order from ${t.restaurants.length} kitchens`

  if (status === 'paid') {
    return (
      <div className={cn(surface, 'flex items-center gap-3 px-4 py-3')}>
        <CheckCircleIcon size={22} weight="fill" className="text-indigo-500" />
        <span className="flex-1 text-label">Paid · {t.restaurants.map(r => r.name).join(', ')}</span>
        <span className="font-mono text-label font-normal">{money(t.toPay)}</span>
      </div>
    )
  }

  return (
    <div className={cn('grid gap-4 rounded-[24px] bg-white p-4 shadow-e2', status === 'dismissed' && 'opacity-60')}>
      <div className="flex items-center gap-2.5">
        <ShoppingBagIcon size={20} className="text-graphite-700" />
        <span className="text-[15px] font-semibold">{title}</span>
      </div>
      <Lines lines={lines} />
      <div className="grid gap-2">
        <Row icon={<MapPinIcon size={18} />} label="Deliver to" value={ADDRESS} />
        <Row icon={<CreditCardIcon size={18} />} label="Pay with" value={PAYMENT} />
      </div>
      <div className="grid gap-1.5">
        <button type="button" onClick={() => setDetails(d => !d)} className="flex items-baseline justify-between text-left" aria-expanded={details}>
          <span className="text-[15px] font-medium">
            To pay <span className="text-caption font-normal text-graphite-500">{details ? 'Hide details' : 'Details'}</span>
          </span>
          <span className="font-mono text-[17px] font-medium">{money(t.toPay)}</span>
        </button>
        {details && (
          <div className="grid gap-1 font-mono text-caption font-normal text-graphite-500">
            <div className="flex justify-between"><span>Items</span><span>{money(t.itemTotal)}</span></div>
            <div className="flex justify-between"><span>Delivery</span><span>{t.delivery ? money(t.delivery) : 'Free'}</span></div>
            {t.offer > 0 && <div className="flex justify-between text-indigo-700"><span>Offers</span><span>−{money(t.offer)}</span></div>}
          </div>
        )}
      </div>
      {status !== 'dismissed' && (
        <div className="grid gap-2">
          <Button size="lg" block onClick={onPay} disabled={status === 'paying'}>
            {status === 'paying' ? 'Placing your order…' : <>Pay <span className="font-mono">{money(t.toPay)}</span></>}
          </Button>
          {status === 'open' && (
            <Button size="lg" variant="secondary" block onClick={onNotNow}>
              Not now
            </Button>
          )}
          <span className="text-center text-caption font-normal text-graphite-400">Razorpay · test mode</span>
        </div>
      )}
    </div>
  )
}

// ---------- tracking ----------

const STEPS = ['Confirmed', 'Cooking', 'On the way', 'Delivered']

export function TrackingCard({ t, step = 1 }: { t: Tracking; step?: number }) {
  const r = RESTAURANT_BY_ID[t.restaurant.id]
  const caption = [`${r.name} has your order`, `${r.name} is cooking`, `${t.rider} picked it up`, 'Delivered'][step]
  return (
    <div className={cn(surface, 'grid gap-3.5 p-4')}>
      <div className="flex items-center gap-3">
        <Photo slug={t.dish.id} alt="" px={56} className="size-14 shrink-0 rounded-[14px]" />
        <div className="grid min-w-0 flex-1">
          <span className="text-caption font-normal text-graphite-500">Arriving in</span>
          <span className="font-mono text-[26px] font-medium leading-8 tracking-[-0.02em]">{t.etaMin} min</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1" role="img" aria-label={`Step ${step + 1} of 4: ${STEPS[step]}`}>
        {STEPS.map((_, i) => (
          <span key={i} className={cn('h-1 rounded-full', i <= step ? 'bg-indigo-500' : 'bg-graphite-100')} />
        ))}
      </div>
      <span className="text-label font-normal text-graphite-700">{caption}</span>
    </div>
  )
}

// ---------- cart pill ----------

export function CartPill({ lines, onView }: { lines: CartLine[]; onView: () => void }) {
  const count = lines.reduce((n, l) => n + l.qty, 0)
  const t = totals(lines)
  return (
    <motion.button
      type="button"
      onClick={onView}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      whileTap={{ scale: 0.98 }}
      className="flex h-12 w-full items-center gap-2.5 rounded-full bg-graphite-900 px-5 text-label text-white shadow-e3"
    >
      <ShoppingBagIcon size={18} />
      <span className="flex-1 text-left">
        {count} {count === 1 ? 'item' : 'items'} · <span className="font-mono">{money(t.itemTotal)}</span>
      </span>
      <span className="font-semibold">View</span>
    </motion.button>
  )
}
