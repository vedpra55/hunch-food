import { CaretRightIcon, SparkleIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import type { Order } from '../../chat/useConversation'
import { capital, money, NUDGE } from '../../domain/copy'
import { clockLabel } from '../../domain/time'
import type { Ask, ContextItem, HomeModel, Prompt, Suggestion } from '../../domain/types'
import { spring } from '../../design/motion'
import { skyFill, skyTint, type Sky, type SkyMode } from '../../design/sky'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'
import { VegMark } from '../ui/Meta'
import { Photo } from '../ui/Photo'
import { OrderBlock, type OrderActions } from './Cards'
import { StageIcon } from './StageIcon'

export interface TodayCardProps {
  home: HomeModel
  sky: Sky
  /** Dev: colour moment or a subtle tint */
  skyMode: SkyMode
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

/**
 * The first card is a moment, not a form (HOME_SPEC §2): the sky of right now with Hunch's line on it,
 * then the one thing Hunch is holding out, then three things you could say instead.
 */
export function TodayCard({ home, sky, skyMode, order, orderActions, onOpen, onOrder, onPrompt, onContext, onAnswer, onSchedule, onNotTonight }: TodayCardProps) {
  const moment = skyMode === 'moment'
  const onDark = moment && sky.dark
  const hasRules = home.context.some(c => c.rule)
  const pill = moment
    ? onDark
      ? 'bg-white/12 text-white hover:bg-white/20'
      : 'bg-white/65 text-graphite-800 hover:bg-white/85'
    : 'bg-graphite-50 text-graphite-800 hover:bg-graphite-100'

  return (
    // The whole card is the sky; what you act on sits on white so it always reads.
    <div className="relative overflow-hidden rounded-[28px] shadow-e2" style={{ background: moment ? skyFill(sky) : skyTint(sky) }}>
      {moment && <Weather sky={sky} />}
      <div className="relative grid gap-5 p-5">
        <ContextRow items={home.context} dark={onDark} onClick={hasRules ? onContext : undefined} />
        <h1 className={cn('-mt-1 pr-12 text-[26px] font-semibold leading-8 tracking-[-0.02em] text-balance', onDark ? 'text-white' : 'text-graphite-900')}>{home.line}</h1>

        {order ? (
          <div className="rounded-[20px] bg-white p-4 shadow-e1">
            <OrderBlock o={order} actions={orderActions} />
          </div>
        ) : home.nudge ? (
          <div className="grid gap-3">
            <Ticket s={home.nudge.pick} label="Your usual dinner" onOpen={onOpen} />
            <Button block onClick={onSchedule}>
              {NUDGE.schedule(clockLabel(home.nudge.at))}
            </Button>
            <div className="-mt-1 flex justify-center gap-2">
              {/* Text actions on the sky: plain buttons, coloured for it. */}
              <button type="button" className={cn('h-9 px-2 text-[13px] font-medium', onDark ? 'text-white/80 hover:text-white' : 'text-graphite-600 hover:text-graphite-900')} onClick={() => onOrder(home.nudge!.pick)}>
                Order now
              </button>
              <button type="button" className={cn('h-9 px-2 text-[13px] font-medium', onDark ? 'text-white/80 hover:text-white' : 'text-graphite-600 hover:text-graphite-900')} onClick={onNotTonight}>
                {NUDGE.notTonight}
              </button>
            </div>
          </div>
        ) : (
          home.pick && <Ticket s={home.pick} label={home.pick === home.usual ? 'Your usual' : 'My pick'} pick={home.pick !== home.usual} onOpen={onOpen} onBuy={() => onOrder(home.pick!)} />
        )}

        <div className="flex flex-wrap gap-2" aria-label="Or ask me">
          {home.prompts.map(p => (
            <motion.button
              key={p.text}
              type="button"
              onClick={() => onPrompt(p)}
              whileTap={{ scale: 0.95 }}
              transition={spring.snappy}
              className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium backdrop-blur-sm transition-colors', pill)}
            >
              <StageIcon icon={p.icon} size={15} className={onDark ? 'text-white/70' : 'text-graphite-500'} />
              {p.text}
            </motion.button>
          ))}
        </div>

        {home.ask && (
          <div className="grid gap-3 rounded-[18px] bg-white p-3.5 shadow-e1">
            <p className="text-[15px] leading-[22px] text-graphite-800">{home.ask.text}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="soft" onClick={() => onAnswer(home.ask!, true)}>
                {home.ask.yes}
              </Button>
              <Button size="sm" variant="text" onClick={() => onAnswer(home.ask!, false)}>
                {home.ask.no}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Time and weather as quiet text; today's rules as stamps you can tap to switch off. */
function ContextRow({ items, dark, onClick }: { items: ContextItem[]; dark: boolean; onClick?: () => void }) {
  const body = items.map(c =>
    c.rule ? (
      <span
        key={c.text}
        className={cn('inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[13px] font-medium', dark ? 'border-white/25 bg-white/10 text-white' : 'border-white bg-white/75 text-graphite-800 shadow-e1')}
      >
        <StageIcon icon={c.icon} size={14} />
        {c.text}
      </span>
    ) : (
      <span key={c.text} className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-[13px]', dark ? 'text-white/75' : 'text-graphite-600')}>
        <StageIcon icon={c.icon} size={15} />
        {c.text}
      </span>
    ),
  )
  const cls = 'flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2'
  if (!onClick) return <div className={cls}>{body}</div>
  return (
    <button type="button" onClick={onClick} aria-label="Today's preferences" className={cn(cls, 'text-left')}>
      {body}
      <CaretRightIcon size={12} className={dark ? 'text-white/60' : 'text-graphite-400'} />
    </button>
  )
}

/** The one thing Hunch is holding out: photo left, why right, a small buy button. */
function Ticket({ s, label, pick, onOpen, onBuy }: { s: Suggestion; label: string; pick?: boolean; onOpen: (s: Suggestion) => void; onBuy?: () => void }) {
  const why = [s.reasons[0] && capital(s.reasons[0]), s.customisation?.join(', ')].filter(Boolean).join(' · ')
  const tag = s.tag && s.tag !== 'Usual' ? s.tag : undefined
  return (
    <div className={cn('flex items-center gap-3 rounded-[20px] bg-white p-2.5 pr-3 shadow-e1', !s.open && 'opacity-80')}>
      <motion.button type="button" onClick={() => onOpen(s)} whileTap={{ scale: 0.97 }} transition={spring.snappy} aria-label={`${label}: ${s.dish.name} from ${s.restaurant.name}`} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="relative shrink-0 self-start">
          <Photo slug={s.dish.id} alt="" px={160} className="size-[72px] rounded-[14px]" />
          {tag && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-indigo-600 px-1.5 py-[2px] text-[10px] font-semibold text-white">{tag}</span>}
        </span>
        <span className="grid min-w-0 gap-0.5">
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-indigo-600">
            {pick && <SparkleIcon size={11} weight="fill" />}
            {label}
          </span>
          <span className="line-clamp-2 text-[15px] font-semibold leading-5">
            <VegMark veg={s.dish.diet === 'veg'} className="mr-1.5 align-[-1px]" />
            {s.dish.name}
          </span>
          <span className="truncate text-[13px] tabular-nums text-graphite-600">
            {s.restaurant.name} · {s.open ? `${s.restaurant.etaMin} min` : s.opensLabel}
          </span>
          {why && <span className="truncate text-[12px] text-graphite-500">{why}</span>}
        </span>
      </motion.button>
      {onBuy &&
        (s.open ? (
          <Button size="sm" onClick={onBuy} className="shrink-0 tabular-nums" aria-label={`Order ${s.dish.name} for ${money(s.dish.price)}`}>
            {money(s.dish.price)}
          </Button>
        ) : (
          <Button size="sm" disabled className="shrink-0">
            Later
          </Button>
        ))}
    </div>
  )
}

const STREAKS = Array.from({ length: 34 }, (_, i) => ({ left: (i * 37) % 100, dur: 1.4 + (i % 5) * 0.2, delay: (i * 0.23) % 2 }))
const STARS = [
  [12, 18], [28, 8], [46, 22], [63, 10], [74, 30], [88, 16], [36, 40], [92, 44],
]

/** Weather moving in the sky. Decorative only; reduced motion freezes it. */
function Weather({ sky }: { sky: Sky }) {
  const streak = sky.dark ? 'to-white/60' : 'to-indigo-800/35'
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {sky.dark && (
        <>
          <span className="absolute right-5 top-16 size-9 rounded-full bg-indigo-50 shadow-[0_0_28px_8px_rgb(204_215_255/0.35)]" />
          {sky.weather !== 'rain' &&
            STARS.map(([x, y], i) => (
              <span key={i} className="absolute size-[2px] rounded-full bg-white" style={{ left: `${x}%`, top: `${y}%`, animation: `twinkle ${2 + (i % 3)}s ease-in-out ${i * 0.4}s infinite` }} />
            ))}
        </>
      )}
      {!sky.dark && sky.weather !== 'rain' && (
        <>
          {(sky.time === 'day' || sky.weather === 'hot') && (
            <span className="absolute -right-4 -top-6 size-28 rounded-full bg-white/80 blur-xl" style={{ animation: sky.weather === 'hot' ? 'shimmer-heat 3s ease-in-out infinite' : undefined }} />
          )}
          <span className="absolute right-16 top-6 h-5 w-24 rounded-full bg-white/60 blur-md" style={{ animation: 'drift 9s ease-in-out infinite alternate' }} />
          <span className="absolute right-2 top-14 h-4 w-16 rounded-full bg-white/50 blur-md" style={{ animation: 'drift 12s ease-in-out -4s infinite alternate' }} />
        </>
      )}
      {sky.weather === 'rain' &&
        STREAKS.map((r, i) => (
          <span key={i} className={cn('absolute top-0 h-4 w-px bg-gradient-to-b from-transparent', streak)} style={{ left: `${r.left}%`, animation: `rain-fall ${r.dur}s linear -${r.delay}s infinite both` }} />
        ))}
    </div>
  )
}
