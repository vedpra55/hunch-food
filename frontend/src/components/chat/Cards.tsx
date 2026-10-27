import { CaretRightIcon, CheckCircleIcon, CreditCardIcon, MapPinIcon, ShoppingBagIcon, SparkleIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { DISH_BY_ID } from '../../data/menu'
import { totals, type CartLine, type Plan } from '../../domain/chat'
import { ADDRESS, money, PAYMENT } from '../../domain/copy'
import type { Ask, HomeModel, Prompt, Suggestion, Tracking } from '../../domain/types'
import { spring } from '../../design/motion'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'
import { VegMark } from '../ui/Meta'
import { Photo } from '../ui/Photo'
import { StageIcon } from './StageIcon'

/** Every Hunch turn is one of these: a white card holding the message and what it refers to. */
export function HunchCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-4 overflow-hidden rounded-[24px] bg-white p-4 shadow-e1', className)}>{children}</div>
}

/** The message at the top of a card. */
function Say({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-[22px] text-graphite-900">{children}</p>
}

// ---------- Today card (Home's empty state) ----------

export interface TodayCardProps {
  home: HomeModel
  trackingStep?: number
  onOpen: (s: Suggestion) => void
  onOrder: (s: Suggestion) => void
  onPrompt: (p: Prompt) => void
  onContext: () => void
  onAnswer: (ask: Ask, yes: boolean) => void
}

export function TodayCard({ home, trackingStep = 2, onOpen, onOrder, onPrompt, onContext, onAnswer }: TodayCardProps) {
  const hasRules = home.context.some(c => c.rule)
  return (
    <HunchCard className="gap-5 p-5">
      <ContextRow home={home} onClick={hasRules ? onContext : undefined} />
      <h1 className="text-[22px] font-semibold leading-7 tracking-[-0.015em] text-balance">{home.line}</h1>

      {home.tracking ? <TrackingBlock t={home.tracking} step={trackingStep} /> : home.pick && <PickRow s={home.pick} usual={home.pick === home.usual} onOpen={onOpen} onOrder={onOrder} />}

      <div className="grid gap-0.5">
        <span className="pb-1 text-caption font-normal text-graphite-500">Or ask me</span>
        {home.prompts.map(p => (
          <PromptRow key={p.text} p={p} onClick={() => onPrompt(p)} />
        ))}
      </div>

      {home.ask && (
        <div className="grid gap-3 rounded-[16px] bg-indigo-50 p-3.5">
          <p className="text-label font-normal text-graphite-800">{home.ask.text}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="soft" className="bg-white" onClick={() => onAnswer(home.ask!, true)}>
              {home.ask.yes}
            </Button>
            <Button size="sm" variant="text" onClick={() => onAnswer(home.ask!, false)}>
              {home.ask.no}
            </Button>
          </div>
        </div>
      )}
    </HunchCard>
  )
}

function ContextRow({ home, onClick }: { home: HomeModel; onClick?: () => void }) {
  const items = home.context.map((c, i) => (
    <span key={c.text} className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {i > 0 && <span className="text-graphite-300">·</span>}
      <StageIcon icon={c.icon} size={15} className={c.rule ? 'text-graphite-700' : 'text-graphite-400'} />
      <span className={c.rule ? 'text-graphite-700' : undefined}>{c.text}</span>
    </span>
  ))
  const cls = 'flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-graphite-500'
  if (!onClick) return <div className={cls}>{items}</div>
  return (
    <button type="button" onClick={onClick} aria-label="Today's preferences" className={cn(cls, '-m-1 justify-self-start rounded-full p-1 text-left hover:bg-graphite-50')}>
      {items}
      <CaretRightIcon size={12} className="text-graphite-400" />
    </button>
  )
}

function PickRow({ s, usual, onOpen, onOrder }: { s: Suggestion; usual: boolean; onOpen: (s: Suggestion) => void; onOrder: (s: Suggestion) => void }) {
  return (
    <div className={cn('grid gap-3', !s.open && 'opacity-70')}>
      <button type="button" onClick={() => onOpen(s)} className="flex min-w-0 items-center gap-3.5 text-left">
        <Photo slug={s.dish.id} alt="" px={80} className="size-[68px] shrink-0 rounded-[16px]" />
        <div className="grid min-w-0 gap-0.5">
          <span className="inline-flex items-center gap-1 text-caption text-indigo-600">
            {usual ? (
              'Your usual'
            ) : (
              <>
                <SparkleIcon size={12} weight="fill" /> My pick
              </>
            )}
          </span>
          <span className="flex min-w-0 items-center gap-1.5 text-[15px] font-semibold leading-5">
            <VegMark veg={s.dish.diet === 'veg'} />
            <span className="truncate">{s.dish.name}</span>
          </span>
          <span className="truncate text-[13px] tabular-nums text-graphite-600">
            {s.restaurant.name} · {s.open ? `${s.restaurant.etaMin} min` : s.opensLabel}
          </span>
          {s.customisation && <span className="truncate text-caption font-normal text-graphite-500">{s.customisation.join(' · ')}</span>}
        </div>
      </button>
      {s.open ? (
        <Button block size="lg" onClick={() => onOrder(s)}>
          {usual ? 'Order again' : 'Order'} · <span className="tabular-nums">{money(s.dish.price)}</span>
        </Button>
      ) : (
        <Button block size="lg" disabled>
          {s.opensLabel}
        </Button>
      )}
    </div>
  )
}

function PromptRow({ p, onClick }: { p: Prompt; onClick: () => void }) {
  return (
    <motion.button type="button" onClick={onClick} whileTap={{ scale: 0.98 }} transition={spring.snappy} className="-mx-2 flex items-center gap-3 rounded-[14px] px-2 py-2 text-left transition-colors hover:bg-graphite-50">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-graphite-50 text-graphite-700">
        <StageIcon icon={p.icon} size={16} />
      </span>
      <span className="flex-1 text-[15px]">{p.text}</span>
      <CaretRightIcon size={16} className="text-graphite-300" />
    </motion.button>
  )
}

// ---------- reply card ----------

export function ReplyCard({ text, items, refine, onOpen, onRefine }: { text: string; items: Suggestion[]; refine: Prompt[]; onOpen: (s: Suggestion) => void; onRefine: (p: Prompt) => void }) {
  return (
    <HunchCard>
      <Say>{text}</Say>
      {items.length > 0 && <TileRow items={items} onOpen={onOpen} />}
      {refine.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {refine.map(p => (
            <motion.button key={p.text} type="button" onClick={() => onRefine(p)} whileTap={{ scale: 0.95 }} transition={spring.snappy} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-graphite-50 px-3 text-[13px] font-medium text-graphite-700 hover:bg-graphite-100">
              <StageIcon icon={p.icon} size={14} />
              {p.text}
            </motion.button>
          ))}
        </div>
      )}
    </HunchCard>
  )
}

/** Tiles scroll inside the card; the first is Hunch's pick. */
function TileRow({ items, onOpen }: { items: Suggestion[]; onOpen: (s: Suggestion) => void }) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((s, i) => (
        <Tile key={s.dish.id} s={s} pick={i === 0} onOpen={onOpen} />
      ))}
    </div>
  )
}

export function Tile({ s, pick, onOpen }: { s: Suggestion; pick?: boolean; onOpen: (s: Suggestion) => void }) {
  return (
    <motion.button
      type="button"
      onClick={() => onOpen(s)}
      whileTap={{ scale: 0.97 }}
      transition={spring.snappy}
      aria-label={`${pick ? "Hunch's pick: " : ''}${s.dish.name} from ${s.restaurant.name}, ${money(s.dish.price)}, ${s.restaurant.etaMin} minutes`}
      className={cn('grid w-[132px] shrink-0 snap-start content-start gap-2 text-left', !s.open && 'opacity-60')}
    >
      <div className="relative">
        <Photo slug={s.dish.id} alt="" px={140} className="aspect-square w-full rounded-[14px]" />
        {s.tag && <span className="absolute left-1.5 top-1.5 rounded-full bg-white/95 px-1.5 py-[3px] text-[10px] font-semibold leading-none text-graphite-800">{s.tag}</span>}
        {pick && (
          <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-white/95 text-indigo-500">
            <SparkleIcon size={11} weight="fill" />
          </span>
        )}
      </div>
      <div className="grid gap-0.5 px-0.5">
        <span className="line-clamp-2 text-[14px] font-semibold leading-[18px]">
          <VegMark veg={s.dish.diet === 'veg'} className="mr-1 align-[-1px]" />
          {s.dish.name}
        </span>
        <span className="truncate text-[12px] leading-4 text-graphite-600">{s.restaurant.name}</span>
        <span className="text-[12px] leading-4 tabular-nums text-graphite-500">{s.open ? `${money(s.dish.price)} · ${s.restaurant.etaMin} min` : s.opensLabel}</span>
      </div>
    </motion.button>
  )
}

// ---------- order lines (plan and checkout) ----------

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
                {l.qty > 1 && <span className="tabular-nums text-graphite-500">{l.qty}× </span>}
                {d.name}
              </span>
              {l.customisation?.length ? <span className="truncate text-caption font-normal text-graphite-500">{l.customisation.join(' · ')}</span> : null}
            </div>
            <span className="text-label font-normal tabular-nums">{money(d.price * l.qty)}</span>
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
        <span className="text-[12px] text-graphite-500">{label}</span>
        <span className="truncate text-label font-normal">{value}</span>
      </div>
    </div>
  )
}

// ---------- plan ----------

export function PlanCard({ text, plan, ordered, onOrder, onChange }: { text: string; plan: Plan; ordered: boolean; onOrder: () => void; onChange: () => void }) {
  return (
    <HunchCard>
      <Say>{text}</Say>
      {plan.lines.length > 0 && (
        <>
          <Lines lines={plan.lines} />
          <div className="flex items-baseline justify-between rounded-[14px] bg-graphite-50 px-3.5 py-2.5">
            <span className="text-label font-normal text-graphite-600">
              {plan.restaurant?.etaMin} min · <span className="tabular-nums">{money(Math.round(plan.total / plan.people))}</span> each
            </span>
            <span className="text-[15px] font-semibold tabular-nums">{money(plan.total)}</span>
          </div>
          {!ordered && (
            <div className="flex gap-2">
              <Button variant="secondary" size="lg" className="flex-1" onClick={onChange}>
                Change
              </Button>
              <Button size="lg" className="flex-[2]" onClick={onOrder}>
                Order · <span className="tabular-nums">{money(plan.total)}</span>
              </Button>
            </div>
          )}
        </>
      )}
    </HunchCard>
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
      <div className="flex items-center gap-3 rounded-[20px] bg-white px-4 py-3 shadow-e1">
        <CheckCircleIcon size={20} weight="fill" className="text-indigo-500" />
        <span className="min-w-0 flex-1 truncate text-label font-normal">Paid · {t.restaurants.map(r => r.name).join(', ')}</span>
        <span className="text-label font-normal tabular-nums">{money(t.toPay)}</span>
      </div>
    )
  }

  return (
    <HunchCard className={cn('shadow-e2', status === 'dismissed' && 'opacity-60')}>
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
            To pay <span className="text-caption font-normal text-graphite-500">· {details ? 'Hide' : 'Details'}</span>
          </span>
          <span className="text-[17px] font-semibold tabular-nums">{money(t.toPay)}</span>
        </button>
        {details && (
          <div className="grid gap-1 text-caption font-normal tabular-nums text-graphite-500">
            <div className="flex justify-between"><span>Items</span><span>{money(t.itemTotal)}</span></div>
            <div className="flex justify-between"><span>Delivery</span><span>{t.delivery ? money(t.delivery) : 'Free'}</span></div>
            {t.offer > 0 && <div className="flex justify-between text-indigo-700"><span>Offers</span><span>−{money(t.offer)}</span></div>}
          </div>
        )}
      </div>
      {status !== 'dismissed' && (
        <div className="grid gap-2">
          <Button size="lg" block onClick={onPay} disabled={status === 'paying'}>
            {status === 'paying' ? 'Placing your order…' : <>Pay <span className="tabular-nums">{money(t.toPay)}</span></>}
          </Button>
          {status === 'open' && (
            <Button size="lg" variant="secondary" block onClick={onNotNow}>
              Not now
            </Button>
          )}
          <span className="text-center text-caption font-normal text-graphite-400">Razorpay · test mode</span>
        </div>
      )}
    </HunchCard>
  )
}

// ---------- tracking ----------

const STEPS = ['Confirmed', 'Cooking', 'On the way', 'Delivered']

function TrackingBlock({ t, step }: { t: Tracking; step: number }) {
  const caption = [`${t.restaurant.name} has your order`, `${t.restaurant.name} is cooking`, `${t.rider} picked it up`, 'Delivered'][step]
  return (
    <div className="grid gap-3.5">
      <div className="flex items-center gap-3.5">
        <Photo slug={t.dish.id} alt="" px={64} className="size-14 shrink-0 rounded-[14px]" />
        <div className="grid min-w-0 flex-1">
          <span className="text-caption font-normal text-graphite-500">Arriving in</span>
          <span className="text-[26px] font-semibold leading-8 tracking-[-0.02em] tabular-nums">{t.etaMin} min</span>
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

export function TrackingCard({ text, t, step = 1 }: { text?: string; t: Tracking; step?: number }) {
  return (
    <HunchCard>
      {text && <Say>{text}</Say>}
      <TrackingBlock t={t} step={step} />
    </HunchCard>
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
        {count} {count === 1 ? 'item' : 'items'} · <span className="tabular-nums">{money(t.itemTotal)}</span>
      </span>
      <span className="font-semibold">View</span>
    </motion.button>
  )
}
