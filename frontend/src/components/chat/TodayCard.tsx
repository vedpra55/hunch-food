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

  return (
    <div className="overflow-hidden rounded-[28px] bg-white shadow-e2">
      <div className="relative overflow-hidden px-5 pb-6 pt-5" style={{ background: moment ? skyFill(sky) : skyTint(sky) }}>
        {moment && <Weather sky={sky} />}
        <div className="relative grid gap-4">
          <ContextRow items={home.context} dark={onDark} onClick={hasRules ? onContext : undefined} />
          <h1 className={cn('pr-10 text-[26px] font-semibold leading-8 tracking-[-0.02em] text-balance', onDark ? 'text-white' : 'text-graphite-900')}>{home.line}</h1>
        </div>
      </div>

      <div className="grid gap-4 p-4">
        {order ? (
          <div className="px-1 pt-1">
            <OrderBlock o={order} actions={orderActions} />
          </div>
        ) : home.nudge ? (
          <>
            <Ticket s={home.nudge.pick} label="Your usual dinner" onOpen={onOpen} />
            <Button block size="lg" onClick={onSchedule}>
              {NUDGE.schedule(clockLabel(home.nudge.at))} · <span className="tabular-nums">{money(home.nudge.pick.dish.price)}</span>
            </Button>
            <div className="-mt-2 flex justify-center gap-2">
              <Button size="sm" variant="text" onClick={() => onOrder(home.nudge!.pick)}>
                Order now
              </Button>
              <Button size="sm" variant="text" onClick={onNotTonight}>
                {NUDGE.notTonight}
              </Button>
            </div>
          </>
        ) : (
          home.pick && (
            <>
              <Ticket s={home.pick} label={home.pick === home.usual ? 'Your usual' : 'My pick'} pick={home.pick !== home.usual} onOpen={onOpen} />
              {home.pick.open ? (
                <Button block size="lg" onClick={() => onOrder(home.pick!)}>
                  {home.pick === home.usual ? 'Order again' : 'Order'} · <span className="tabular-nums">{money(home.pick.dish.price)}</span>
                </Button>
              ) : (
                <Button block size="lg" disabled>
                  {home.pick.opensLabel}
                </Button>
              )}
            </>
          )
        )}

        <div className="flex flex-wrap gap-2" aria-label="Or ask me">
          {home.prompts.map(p => (
            <motion.button
              key={p.text}
              type="button"
              onClick={() => onPrompt(p)}
              whileTap={{ scale: 0.95 }}
              transition={spring.snappy}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-graphite-50 px-3 text-[13px] font-medium text-graphite-800 transition-colors hover:bg-graphite-100"
            >
              <StageIcon icon={p.icon} size={15} className="text-graphite-500" />
              {p.text}
            </motion.button>
          ))}
        </div>

        {home.ask && (
          <div className="grid gap-3 rounded-[18px] bg-indigo-50 p-3.5">
            <p className="text-[15px] leading-[22px] text-graphite-800">{home.ask.text}</p>
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

/** The one thing Hunch is holding out: the photo carries it, the reason says why. */
function Ticket({ s, label, pick, onOpen }: { s: Suggestion; label: string; pick?: boolean; onOpen: (s: Suggestion) => void }) {
  const why = [s.reasons[0] && capital(s.reasons[0]), s.customisation?.join(', ')].filter(Boolean).join(' · ')
  const tag = s.tag && s.tag !== 'Usual' ? s.tag : undefined
  return (
    <div className={cn('grid gap-2.5', !s.open && 'opacity-70')}>
      <motion.button
        type="button"
        onClick={() => onOpen(s)}
        whileTap={{ scale: 0.98 }}
        transition={spring.snappy}
        aria-label={`${label}: ${s.dish.name} from ${s.restaurant.name}`}
        className="relative block aspect-[16/10] w-full overflow-hidden rounded-[20px] text-left"
      >
        <span className="absolute inset-0">
          <Photo slug={s.dish.id} alt="" px={420} className="size-full" />
        </span>
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-graphite-900/80 via-graphite-900/15 to-transparent" />
        <span className="absolute left-3 top-3 inline-flex h-7 items-center gap-1 rounded-full bg-white/92 px-2.5 text-[12px] font-semibold text-indigo-700">
          {pick && <SparkleIcon size={12} weight="fill" />}
          {label}
        </span>
        {tag && <span className="absolute right-3 top-3 inline-flex h-7 items-center rounded-full bg-indigo-600 px-2.5 text-[12px] font-semibold text-white">{tag}</span>}
        <span className="absolute inset-x-3.5 bottom-3 grid gap-0.5">
          <span className="flex min-w-0 items-center gap-2 text-[19px] font-semibold leading-6 text-white">
            <span className="grid place-items-center rounded-[3px] bg-white p-[2px]">
              <VegMark veg={s.dish.diet === 'veg'} />
            </span>
            <span className="truncate">{s.dish.name}</span>
          </span>
          <span className="truncate text-[13px] tabular-nums text-white/80">
            {s.restaurant.name} · {s.open ? `${s.restaurant.etaMin} min` : s.opensLabel}
          </span>
        </span>
      </motion.button>
      {why && <p className="px-1 text-[14px] leading-5 text-graphite-600">{why}</p>}
    </div>
  )
}

const STREAKS = Array.from({ length: 22 }, (_, i) => ({ left: (i * 37) % 100, dur: 0.75 + (i % 5) * 0.12, delay: (i * 0.17) % 1.3 }))
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
          <span className="absolute right-5 top-[68px] size-9 rounded-full bg-indigo-50 shadow-[0_0_28px_8px_rgb(204_215_255/0.35)]" />
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
          <span key={i} className={cn('absolute top-0 h-4 w-px bg-gradient-to-b from-transparent', streak)} style={{ left: `${r.left}%`, animation: `rain-fall ${r.dur}s linear ${r.delay}s infinite` }} />
        ))}
    </div>
  )
}
