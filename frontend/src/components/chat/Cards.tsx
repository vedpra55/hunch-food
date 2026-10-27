import { CaretRightIcon, CheckCircleIcon, MinusIcon, PlusIcon, ShoppingBagIcon, SparkleIcon, ThumbsDownIcon, ThumbsUpIcon, TrashIcon, WarningCircleIcon, XCircleIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import type { CheckoutStatus, Order, OrderStatus } from '../../chat/useConversation'
import { addressIcon, paymentById, type Address, type PaymentMethod } from '../../data/account'
import { DISH_BY_ID } from '../../data/menu'
import { RESTAURANT_BY_ID } from '../../data/restaurants'
import { totals, type CartLine, type Plan } from '../../domain/chat'
import { money, NUDGE, ORDER } from '../../domain/copy'
import { delivery, type BetterDeal } from '../../domain/orders'
import { clockLabel } from '../../domain/time'
import type { Ask, HomeModel, IconKey, Prompt, Suggestion } from '../../domain/types'
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
  /** The live order when the stage opens mid-delivery */
  order?: Order
  orderActions: OrderActions
  onOpen: (s: Suggestion) => void
  onOrder: (s: Suggestion) => void
  onPrompt: (p: Prompt) => void
  onContext: () => void
  onAnswer: (ask: Ask, yes: boolean) => void
  onSchedule: () => void
  onNotTonight: () => void
}

export function TodayCard({ home, order, orderActions, onOpen, onOrder, onPrompt, onContext, onAnswer, onSchedule, onNotTonight }: TodayCardProps) {
  const hasRules = home.context.some(c => c.rule)
  return (
    <HunchCard className="gap-5 p-5">
      <ContextRow home={home} onClick={hasRules ? onContext : undefined} />
      <h1 className="text-[22px] font-semibold leading-7 tracking-[-0.015em] text-balance">{home.line}</h1>

      {order ? (
        <OrderBlock o={order} actions={orderActions} />
      ) : home.nudge ? (
        <NudgeRow s={home.nudge.pick} at={clockLabel(home.nudge.at)} onOpen={onOpen} onSchedule={onSchedule} onOrderNow={() => onOrder(home.nudge!.pick)} onNotTonight={onNotTonight} />
      ) : (
        home.pick && <PickRow s={home.pick} usual={home.pick === home.usual} onOpen={onOpen} onOrder={onOrder} />
      )}

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

/** The proactive moment: the usual, offered for later. Scheduling is the main action; saying no is one tap. */
function NudgeRow({ s, at, onOpen, onSchedule, onOrderNow, onNotTonight }: { s: Suggestion; at: string; onOpen: (s: Suggestion) => void; onSchedule: () => void; onOrderNow: () => void; onNotTonight: () => void }) {
  return (
    <div className="grid gap-3">
      <button type="button" onClick={() => onOpen(s)} className="flex min-w-0 items-center gap-3.5 text-left">
        <Photo slug={s.dish.id} alt="" px={80} className="size-[68px] shrink-0 rounded-[16px]" />
        <div className="grid min-w-0 gap-0.5">
          <span className="text-caption text-indigo-600">Your usual dinner</span>
          <span className="flex min-w-0 items-center gap-1.5 text-[15px] font-semibold leading-5">
            <VegMark veg={s.dish.diet === 'veg'} />
            <span className="truncate">{s.dish.name}</span>
          </span>
          <span className="truncate text-[13px] tabular-nums text-graphite-600">
            {s.restaurant.name} · {money(s.dish.price)}
          </span>
          {s.customisation && <span className="truncate text-caption font-normal text-graphite-500">{s.customisation.join(' · ')}</span>}
        </div>
      </button>
      <Button block size="lg" onClick={onSchedule}>
        {NUDGE.schedule(at)}
      </Button>
      <div className="flex justify-center gap-2">
        <Button size="sm" variant="text" onClick={onOrderNow}>
          Order now
        </Button>
        <Button size="sm" variant="text" onClick={onNotTonight}>
          {NUDGE.notTonight}
        </Button>
      </div>
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
      {items.length > 0 && <TileRow items={items} onOpen={onOpen} pickFirst={!items[0].dish.soldOut} />}
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
function TileRow({ items, onOpen, pickFirst = true }: { items: Suggestion[]; onOpen: (s: Suggestion) => void; pickFirst?: boolean }) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((s, i) => (
        <Tile key={s.dish.id} s={s} pick={pickFirst && i === 0} onOpen={onOpen} />
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
      className={cn('grid w-[132px] shrink-0 snap-start content-start gap-2 text-left', (!s.open || s.dish.soldOut) && 'opacity-55')}
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
        <span className="text-[12px] leading-4 tabular-nums text-graphite-500">{s.dish.soldOut ? ORDER.soldOut : s.open ? `${money(s.dish.price)} · ${s.restaurant.etaMin} min` : s.opensLabel}</span>
      </div>
    </motion.button>
  )
}

// ---------- order lines (plan and checkout) ----------

function Lines({ lines, onQty }: { lines: CartLine[]; onQty?: (dishId: CartLine['dishId'], delta: number) => void }) {
  return (
    <ul className="grid gap-2.5">
      {lines.map(l => {
        const d = DISH_BY_ID[l.dishId]
        return (
          <li key={l.dishId} className="flex min-w-0 items-center gap-3">
            <Photo slug={d.id} alt="" px={48} className="size-11 shrink-0 rounded-[10px]" />
            <div className="grid min-w-0 flex-1">
              <span className="line-clamp-2 text-label leading-5 font-medium">
                {!onQty && l.qty > 1 && <span className="tabular-nums text-graphite-500">{l.qty}× </span>}
                {d.name}
              </span>
              <span className="truncate text-caption font-normal tabular-nums text-graphite-500">
                {[RESTAURANT_BY_ID[d.restaurantId].name, ...(l.customisation ?? [])].join(' · ')}
              </span>
            </div>
            {onQty ? (
              <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-graphite-50 p-0.5">
                <button type="button" onClick={() => onQty(l.dishId, -1)} aria-label={l.qty === 1 ? `Remove ${d.name}` : `One less ${d.name}`} className="grid size-7 place-items-center rounded-full text-graphite-700 hover:bg-white">
                  {l.qty === 1 ? <TrashIcon size={14} /> : <MinusIcon size={14} />}
                </button>
                <span className="w-5 text-center text-label tabular-nums" aria-live="polite">
                  {l.qty}
                </span>
                <button type="button" onClick={() => onQty(l.dishId, 1)} aria-label={`One more ${d.name}`} className="grid size-7 place-items-center rounded-full text-graphite-700 hover:bg-white">
                  <PlusIcon size={14} />
                </button>
              </div>
            ) : null}
            <span className="w-14 shrink-0 text-right text-label font-normal tabular-nums">{money(d.price * l.qty)}</span>
          </li>
        )
      })}
    </ul>
  )
}

/** A tappable row inside a card (address, payment). */
function Row({ icon, label, value, onClick, alert }: { icon: IconKey; label: string; value: string; onClick?: () => void; alert?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick} className={cn('flex w-full items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-left transition-colors', alert ? 'bg-[#FDF1F0]' : 'bg-graphite-50 hover:enabled:bg-graphite-100')}>
      <StageIcon icon={icon} size={18} className={alert ? 'text-error' : 'text-graphite-500'} />
      <div className="grid min-w-0 flex-1">
        <span className="text-[12px] text-graphite-500">{label}</span>
        <span className="truncate text-label font-normal">{value}</span>
      </div>
      {onClick && <span className="text-label text-indigo-600">Change</span>}
    </button>
  )
}

function ErrorLine({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 text-label font-normal leading-5 text-error">
      <WarningCircleIcon size={18} className="mt-px shrink-0" />
      <span>{children}</span>
    </p>
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

export interface CheckoutCardProps {
  lines: CartLine[]
  status: CheckoutStatus
  deal?: BetterDeal
  saved?: { place: string; saving: number }
  error?: string
  scheduleAt?: string
  /** "Just this once" is on for this order */
  justOnce?: boolean
  address: Address
  payment: PaymentMethod
  onQty: (dishId: CartLine['dishId'], delta: number) => void
  onSwitch: () => void
  onKeep: () => void
  onAddress: () => void
  onPayment: () => void
  onPay: () => void
  onNotNow: () => void
}

export function CheckoutCard({ lines, status, deal, saved, error, scheduleAt, justOnce, address, payment, onQty, onSwitch, onKeep, onAddress, onPayment, onPay, onNotNow }: CheckoutCardProps) {
  const t = totals(lines)
  const { etaMin, unreachable } = delivery(lines, address)
  const [details, setDetails] = useState(false)
  const editable = status === 'open' || status === 'failed'
  const title = scheduleAt
    ? `Dinner from ${t.restaurants[0].name}, at ${clockLabel(scheduleAt)}`
    : t.restaurants.length === 1
      ? `Placing your order at ${t.restaurants[0].name}`
      : `Placing your order from ${t.restaurants.length} kitchens`

  if (status === 'paid') {
    return (
      <div className="flex items-center gap-3 rounded-[20px] bg-white px-4 py-3 shadow-e1">
        <CheckCircleIcon size={20} weight="fill" className="text-indigo-500" />
        <span className="min-w-0 flex-1 truncate text-label font-normal">
          {payment.cash ? 'Ordered' : 'Paid'} · {t.restaurants.map(r => r.name).join(', ')}
        </span>
        <span className="text-label font-normal tabular-nums">{money(t.toPay)}</span>
      </div>
    )
  }

  return (
    <HunchCard className={cn('shadow-e2', status === 'dismissed' && 'opacity-60')}>
      {/* Offer discovery: Hunch found the same thing cheaper while preparing checkout. */}
      {deal && editable && (
        <div className="grid gap-3 rounded-[16px] bg-indigo-50 p-3.5">
          <div className="flex items-center gap-3">
            <Photo slug={deal.to.dish.id} alt="" px={48} className="size-11 shrink-0 rounded-[10px]" />
            <p className="min-w-0 flex-1 text-label font-normal text-graphite-800">
              <span className="inline-flex items-center gap-1 font-medium text-indigo-700">
                <SparkleIcon size={12} weight="fill" /> Found a better deal
              </span>
              <br />
              {ORDER.offer(deal.to.dish.kind, deal.to.restaurant.name, deal.saving)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="soft" className="bg-white" onClick={onSwitch}>
              {ORDER.offerSwitch(deal.saving)}
            </Button>
            <Button size="sm" variant="text" onClick={onKeep}>
              Keep mine
            </Button>
          </div>
        </div>
      )}
      {saved && editable && (
        <p className="flex items-center gap-2 rounded-[14px] bg-indigo-50 px-3.5 py-2.5 text-label font-normal text-indigo-700">
          <CheckCircleIcon size={18} weight="fill" /> {ORDER.switched(saved.place, saved.saving)}
        </p>
      )}

      <div className="flex items-center gap-2.5">
        <ShoppingBagIcon size={20} className="text-graphite-700" />
        <span className="text-[15px] font-semibold">{title}</span>
      </div>
      <Lines lines={lines} onQty={editable ? onQty : undefined} />

      <div className="grid gap-2">
        {/* The time sits with the label so a long address never hides it. */}
        <Row icon={addressIcon(address)} label={`Deliver to ${address.label} · ${scheduleAt ? `at ${clockLabel(scheduleAt)}` : `${etaMin} min`}`} value={address.line} onClick={editable ? onAddress : undefined} alert={unreachable.length > 0} />
        <Row icon={payment.icon} label="Pay with" value={`${payment.label} ${payment.detail}`} onClick={editable ? onPayment : undefined} alert={status === 'failed'} />
      </div>

      {unreachable.map(r => (
        <ErrorLine key={r.id}>
          {ORDER.unreachable(r.name, address.area)} Change the address, or ask me for something nearby.
        </ErrorLine>
      ))}
      {error && <ErrorLine>{error}</ErrorLine>}

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
          <Button size="lg" block onClick={onPay} disabled={status === 'paying' || unreachable.length > 0}>
            {status === 'paying' ? (
              'Placing your order…'
            ) : payment.cash ? (
              <>Place order · <span className="tabular-nums">{money(t.toPay)}</span></>
            ) : (
              <>{status === 'failed' ? 'Try again' : 'Pay'} <span className="tabular-nums">{money(t.toPay)}</span></>
            )}
          </Button>
          {editable && (
            <Button size="lg" variant="secondary" block onClick={onNotNow}>
              Not now
            </Button>
          )}
          <span className="text-center text-caption font-normal text-graphite-400">
            {justOnce ? `${ORDER.justOnce} · ` : ''}
            {payment.cash ? ORDER.cashNote(t.toPay) : 'Razorpay · test mode'}
          </span>
        </div>
      )}
    </HunchCard>
  )
}

// ---------- tracking ----------

const STEPS = ['Confirmed', 'Cooking', 'On the way', 'Delivered']
const STEP_OF: Record<OrderStatus, number> = { scheduled: 0, cooking: 1, picked: 2, near: 2, delivered: 3, cancelled: 0 }

export interface OrderActions {
  onAskCancel: (orderId: string, yes: boolean) => void
  onCancel: (orderId: string) => void
  onRate: (orderId: string, rating: 'up' | 'down') => void
}

/** The live order: ETA counts down, steps advance, then delivered + a quick rating; or cancelled + refund. */
function OrderBlock({ o, actions }: { o: Order; actions: OrderActions }) {
  const method = paymentById(o.paymentId)
  const step = STEP_OF[o.status]
  const cancellable = o.status === 'cooking' || o.status === 'scheduled'
  const caption =
    o.status === 'scheduled'
      ? NUDGE.caption(o.restaurant.name, o.startsAt ?? '')
      : o.status === 'cooking'
      ? o.kitchens > 1
        ? ORDER.caption.cookingMany(o.kitchens)
        : ORDER.caption.cooking(o.restaurant.name)
      : o.status === 'picked'
        ? ORDER.caption.picked(o.rider)
        : o.status === 'near'
          ? ORDER.caption.near(o.rider)
          : ''

  if (o.status === 'cancelled') {
    return (
      <div className="flex items-start gap-3 rounded-[16px] bg-graphite-50 p-3.5">
        <XCircleIcon size={20} className="mt-0.5 shrink-0 text-graphite-500" />
        <p className="text-label font-normal text-graphite-700">{ORDER.cancelled(o.amount, `${method.label.replace(/^UPI · /, '')} ${method.detail}`, !!method.cash)}</p>
      </div>
    )
  }

  return (
    <div className="grid gap-3.5">
      <div className="flex items-center gap-3.5">
        <Photo slug={o.dish.id} alt="" px={64} className="size-14 shrink-0 rounded-[14px]" />
        <div className="grid min-w-0 flex-1">
          {o.status === 'delivered' ? (
            <>
              <span className="text-caption font-normal text-graphite-500">{o.restaurant.name}</span>
              <span className="text-[22px] font-semibold leading-8 tracking-[-0.02em]">{ORDER.caption.delivered(o.deliveredAt ?? '')}</span>
            </>
          ) : o.status === 'scheduled' ? (
            <>
              <span className="text-caption font-normal text-graphite-500">Arriving at</span>
              <span className="text-[26px] font-semibold leading-8 tracking-[-0.02em] tabular-nums">{o.arrivesAt}</span>
            </>
          ) : (
            <>
              <span className="text-caption font-normal text-graphite-500">{o.status === 'near' ? 'Arriving' : 'Arriving in'}</span>
              <span className="text-[26px] font-semibold leading-8 tracking-[-0.02em] tabular-nums">{o.status === 'near' ? 'now' : `${o.etaLeft} min`}</span>
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1" role="img" aria-label={`Step ${step + 1} of 4: ${STEPS[step]}`}>
        {STEPS.map((_, i) => (
          <span key={i} className={cn('h-1 rounded-full transition-colors duration-500', i <= step ? 'bg-indigo-500' : 'bg-graphite-100')} />
        ))}
      </div>

      {caption && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-label font-normal text-graphite-700">{caption}</span>
          {cancellable && !o.confirmingCancel && (
            <Button size="sm" variant="text" onClick={() => actions.onAskCancel(o.id, true)}>
              Cancel order
            </Button>
          )}
        </div>
      )}

      {cancellable && o.confirmingCancel && (
        <div className="grid gap-3 rounded-[16px] bg-graphite-50 p-3.5">
          <p className="text-label font-normal text-graphite-800">{ORDER.cancelAsk(o.amount, !!method.cash)}</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => actions.onCancel(o.id)}>
              Cancel order
            </Button>
            <Button size="sm" variant="text" onClick={() => actions.onAskCancel(o.id, false)}>
              Keep it
            </Button>
          </div>
        </div>
      )}

      {o.status === 'delivered' &&
        (o.rating ? (
          <p className="text-label font-normal text-graphite-700">{ORDER.rated[o.rating]}</p>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="text-label font-normal text-graphite-700">{ORDER.rateAsk}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" icon={<ThumbsUpIcon size={16} />} onClick={() => actions.onRate(o.id, 'up')}>
                Loved it
              </Button>
              <Button size="sm" variant="secondary" icon={<ThumbsDownIcon size={16} />} onClick={() => actions.onRate(o.id, 'down')}>
                Not great
              </Button>
            </div>
          </div>
        ))}
    </div>
  )
}

export function TrackingCard({ text, order, actions }: { text?: string; order: Order; actions: OrderActions }) {
  return (
    <HunchCard>
      {text && order.status !== 'cancelled' && <Say>{text}</Say>}
      <OrderBlock o={order} actions={actions} />
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
