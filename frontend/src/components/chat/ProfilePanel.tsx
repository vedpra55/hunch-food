import { ArrowLeftIcon, ThumbsDownIcon, ThumbsUpIcon, XIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import type { ConversationApi } from '../../chat/useConversation'
import { addressIcon, PAYMENTS } from '../../data/account'
import { DISH_BY_ID } from '../../data/menu'
import { RESTAURANT_BY_ID } from '../../data/restaurants'
import { money, ONBOARD, PROFILE } from '../../domain/copy'
import { fastingDay } from '../../domain/rules'
import { clockLabel, DAY_NAMES, daysBetween, localDate } from '../../domain/time'
import type { Meal, PastOrder, UserProfile, Weekday } from '../../domain/types'
import { spring } from '../../design/motion'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { IconButton } from '../ui/IconButton'
import { Photo } from '../ui/Photo'
import { AddRow } from './BottomSheet'
import { StageIcon } from './StageIcon'

const ALLERGY_LABEL = Object.fromEntries(ONBOARD.allergies.map(a => [a.id, a.label]))
const DIET_LABEL = Object.fromEntries(ONBOARD.diets.map(d => [d.id, d.label]))
const NUDGE_TIMES = ['17:00', '18:00', '19:00']
const MEAL_LABEL: Record<Meal, string> = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner', late: 'Late night' }

/**
 * Profile → What Hunch knows (HOME_SPEC §7). Everything Hunch uses to choose, each with where it came from
 * and a way to change it. Opens from the left, where the profile button is.
 */
export function ProfilePanel({ api }: { api: ConversationApi }) {
  const { state, closeProfile } = api
  const open = state.profile

  useEffect(() => {
    // Escape closes the panel, unless a sheet is open on top of it.
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !api.latest().picker && closeProfile()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [open, closeProfile, api])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="profile"
          role="dialog"
          aria-modal="true"
          aria-label="Profile"
          initial={{ opacity: 0, x: -32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -32 }}
          transition={spring.gentle}
          className="fixed inset-0 z-[35] overflow-y-auto bg-graphite-25"
        >
          <div className="mx-auto grid w-full max-w-[600px] gap-7 px-4 pb-16 sm:px-6">
            <header className="sticky top-0 z-10 -mx-4 flex items-center gap-3 bg-gradient-to-b from-graphite-25 from-75% to-transparent px-4 pb-4 pt-[max(14px,env(safe-area-inset-top))] sm:-mx-6 sm:px-6">
              <IconButton aria-label="Back to Hunch" variant="ghost" size="sm" className="bg-white shadow-e1" icon={<ArrowLeftIcon size={18} />} onClick={closeProfile} />
            </header>
            <Body api={api} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Body({ api }: { api: ConversationApi }) {
  const { state, updateUser } = api
  const { user, ctx } = state
  const history = user.history ?? []
  const [allOrders, setAllOrders] = useState(false)
  const [forgetting, setForgetting] = useState<'ask' | 'done'>()

  return (
    <>
      <div className="flex items-center gap-4">
        <span className="grid size-16 place-items-center rounded-full bg-white text-[24px] font-semibold text-graphite-700 shadow-e1">{user.firstName[0]}</span>
        <div className="grid">
          <h1 className="text-title">{user.firstName}</h1>
          <span className="text-label font-normal text-graphite-500">{user.orderCount ? `${user.orderCount} orders with Hunch` : 'New here'}</span>
        </div>
      </div>

      {/* B10: what you ordered, one tap to have it again */}
      <Section title="Your orders">
        {history.length ? (
          <Card>
            {(allOrders ? history : history.slice(0, 3)).map(h => (
              <OrderRow key={h.id} h={h} now={ctx.now} onReorder={() => api.reorder(h.id)} />
            ))}
            {history.length > 3 && (
              <button type="button" onClick={() => setAllOrders(a => !a)} className="py-1 text-left text-label text-indigo-600">
                {allOrders ? 'Show fewer' : `Show all ${history.length}`}
              </button>
            )}
          </Card>
        ) : (
          <Empty>Your orders show up here, ready to repeat.</Empty>
        )}
      </Section>

      <Section title="What Hunch knows" note="Everything I use to choose for you. Change anything.">
        <Card title="Food rules">
          <Line label="Diet" value={DIET_LABEL[user.diet]} source={PROFILE.source.told} action="Change" onAction={() => api.openPicker('diet')} />
          <div className="grid gap-2">
            <Label>Can't have</Label>
            <div className="flex flex-wrap gap-2">
              {ONBOARD.allergies.map(a => (
                <Chip
                  key={a.id}
                  variant="filter"
                  selected={user.allergies.includes(a.id)}
                  onClick={() => updateUser(u => ({ allergies: u.allergies.includes(a.id) ? u.allergies.filter(x => x !== a.id) : [...u.allergies, a.id] }))}
                >
                  {ALLERGY_LABEL[a.id]}
                </Chip>
              ))}
            </div>
          </div>
          <VegDays user={user} onChange={vegDays => updateUser(() => ({ vegDays }))} />
          {user.fasting && (
            <Line
              label="Fasting"
              value={fastingDay(user, ctx) ? `${user.fasting.name} · day ${fastingDay(user, ctx)} of ${user.fasting.days}` : user.fasting.name}
              source={PROFILE.source.told}
              action="End"
              onAction={() => updateUser(() => ({ fasting: undefined }))}
            />
          )}
        </Card>

        <Card title="Goal">
          {user.goal ? (
            <Line
              label={PROFILE.goalLabel[user.goal.kind]}
              value={`Until ${localDate(user.goal.until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
              source={user.goal.source === 'told' ? PROFILE.source.told : PROFILE.source.learned(user.orderCount)}
              action="Change"
              onAction={() => api.openPicker('goal')}
            />
          ) : (
            <Line label="No goal right now" value="Lighter, more protein or spending less" action="Set" onAction={() => api.openPicker('goal')} />
          )}
        </Card>

        <Card title="Favourites">
          {user.usuals.length ? (
            user.usuals.map(u => {
              const d = DISH_BY_ID[u.dishId]
              return (
                <div key={u.dishId} className="flex items-center gap-3">
                  <Photo slug={d.id} alt="" px={48} className="size-11 shrink-0 rounded-[10px]" />
                  <div className="grid min-w-0 flex-1">
                    <span className="truncate text-label">{d.name}</span>
                    <span className="truncate text-caption font-normal text-graphite-500">
                      {RESTAURANT_BY_ID[d.restaurantId].name} · {u.times} orders{u.customisation ? ` · ${u.customisation.join(', ')}` : ''}
                    </span>
                  </div>
                  <Remove label={`Forget ${d.name}`} onClick={() => updateUser(x => ({ usuals: x.usuals.filter(y => y.dishId !== u.dishId) }))} />
                </div>
              )
            })
          ) : (
            <Empty>Order a few times and your usuals appear here.</Empty>
          )}
          {user.favouriteRestaurants.length > 0 && (
            <div className="grid gap-2">
              <Label>Places</Label>
              <div className="flex flex-wrap gap-2">
                {user.favouriteRestaurants.map(id => (
                  <Chip key={id} variant="filter" icon={<XIcon size={12} />} onClick={() => updateUser(x => ({ favouriteRestaurants: x.favouriteRestaurants.filter(r => r !== id) }))}>
                    {RESTAURANT_BY_ID[id].name}
                  </Chip>
                ))}
              </div>
            </div>
          )}
          {user.notForMe.length > 0 && (
            <div className="grid gap-2">
              <Label>Not for me</Label>
              {user.notForMe.map((n, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <span className="truncate text-label font-normal">{n.dishId ? DISH_BY_ID[n.dishId].name : RESTAURANT_BY_ID[n.restaurantId!].name}</span>
                  <Button size="sm" variant="text" onClick={() => updateUser(x => ({ notForMe: x.notForMe.filter((_, j) => j !== i) }))}>
                    Undo
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Habits">
          <div className="grid gap-2">
            <div className="flex items-baseline justify-between">
              <Label>Spice</Label>
              <Source>{user.orderCount ? PROFILE.source.learned(user.orderCount) : 'Default'}</Source>
            </div>
            <div className="grid grid-cols-4 gap-1 rounded-full bg-graphite-50 p-1" role="radiogroup" aria-label="Spice">
              {PROFILE.spice.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={user.spice === i}
                  onClick={() => updateUser(() => ({ spice: i as UserProfile['spice'] }))}
                  className={cn('h-8 rounded-full text-[13px] font-medium transition-colors', user.spice === i ? 'bg-white text-graphite-900 shadow-e1' : 'text-graphite-500')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {user.priceComfort > 0 ? (
            <Line label="Usual spend" value={`Around ${money(user.priceComfort)} a meal`} source={PROFILE.source.learned(user.orderCount)} action="Forget" onAction={() => updateUser(() => ({ priceComfort: 0 }))} />
          ) : (
            <Line label="Usual spend" value="Still learning" />
          )}
          {user.mealTimes && Object.keys(user.mealTimes).length > 0 && (
            <Line
              label="When you eat"
              value={(Object.entries(user.mealTimes) as [Meal, string][]).map(([m, t]) => `${MEAL_LABEL[m]} ${clockLabel(t)}`).join(' · ')}
              source={PROFILE.source.learned(user.orderCount)}
              action="Forget"
              onAction={() => updateUser(() => ({ mealTimes: undefined }))}
            />
          )}
        </Card>
      </Section>

      {/* B11: the one proactive moment, under the person's control */}
      <Section title="Suggestions">
        <Card>
          <Switch
            icon="bell"
            label="Evening nudge"
            note={user.nudge?.on ? PROFILE.nudge(clockLabel(user.nudge.at)) : 'Off. I only speak when you open the app.'}
            on={!!user.nudge?.on}
            onChange={on => updateUser(u => ({ nudge: { at: u.nudge?.at ?? '18:00', on } }))}
          />
          {user.nudge?.on && (
            <div className="flex gap-2 pl-12">
              {NUDGE_TIMES.map(t => (
                <Chip key={t} variant="filter" selected={user.nudge?.at === t} onClick={() => updateUser(() => ({ nudge: { on: true, at: t } }))}>
                  {clockLabel(t)}
                </Chip>
              ))}
            </div>
          )}
        </Card>
      </Section>

      <Section title="Context">
        <Card>
          <Switch icon="rain" label="Use the weather" note={PROFILE.weather} on={user.useWeather !== false} onChange={on => updateUser(() => ({ useWeather: on }))} />
          <p className="pl-12 text-caption font-normal text-graphite-500">{PROFILE.location}</p>
        </Card>
      </Section>

      <Section title="Addresses">
        <Card>
          {state.addresses.map(a => (
            <div key={a.id} className="flex items-center gap-3">
              <Icon icon={addressIcon(a)} />
              <div className="grid min-w-0 flex-1">
                <span className="text-label">{a.label}</span>
                <span className="truncate text-caption font-normal text-graphite-500">{a.line}</span>
              </div>
              {a.id === state.addressId && <span className="text-caption text-graphite-500">Selected</span>}
            </div>
          ))}
          <AddRow label="Add address" onClick={() => api.openPicker('addAddress')} />
        </Card>
      </Section>

      <Section title="Payments">
        <Card>
          {PAYMENTS.map(p => (
            <div key={p.id} className="flex items-center gap-3">
              <Icon icon={p.icon} />
              <div className="grid min-w-0 flex-1">
                <span className="text-label">{p.label}</span>
                <span className="text-caption font-normal tabular-nums text-graphite-500">{p.detail}</span>
              </div>
              {p.id === state.paymentId && <span className="text-caption text-graphite-500">Default</span>}
            </div>
          ))}
        </Card>
      </Section>

      <Section title="Privacy">
        <Card>
          <Switch icon="receipt" label="Just this once" note={PROFILE.justOnce} on={state.justOnce} onChange={api.setJustOnce} />
          {forgetting === 'ask' ? (
            <div className="grid gap-3 rounded-[16px] bg-graphite-50 p-3.5">
              <p className="text-label font-normal text-graphite-800">{PROFILE.forgetAsk}</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    api.forgetLearned()
                    setForgetting('done')
                  }}
                >
                  Forget
                </Button>
                <Button size="sm" variant="text" onClick={() => setForgetting(undefined)}>
                  Keep
                </Button>
              </div>
            </div>
          ) : forgetting === 'done' ? (
            <p role="status" className="text-label font-normal text-graphite-600">
              {PROFILE.forgot}
            </p>
          ) : (
            <button type="button" onClick={() => setForgetting('ask')} className="justify-self-start text-label text-error">
              {PROFILE.forget}
            </button>
          )}
        </Card>
      </Section>
    </>
  )
}

// ---------- pieces ----------

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <div className="grid gap-0.5 px-1">
        <h2 className="text-heading">{title}</h2>
        {note && <p className="text-label font-normal text-graphite-500">{note}</p>}
      </div>
      {children}
    </section>
  )
}

function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="grid gap-4 rounded-[24px] bg-white p-4 shadow-e1">
      {title && <h3 className="text-[15px] font-semibold">{title}</h3>}
      {children}
    </div>
  )
}

const Label = ({ children }: { children: ReactNode }) => <span className="text-caption text-graphite-500">{children}</span>
const Source = ({ children }: { children: ReactNode }) => <span className="text-caption font-normal text-graphite-400">{children}</span>
const Empty = ({ children }: { children: ReactNode }) => <p className="text-label font-normal text-graphite-500">{children}</p>

function Icon({ icon }: { icon: Parameters<typeof StageIcon>[0]['icon'] }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-graphite-50 text-graphite-700">
      <StageIcon icon={icon} size={18} />
    </span>
  )
}

/** One fact: what it is, its value, where it came from, and one way to change it. */
function Line({ label, value, source, action, onAction }: { label: string; value: string; source?: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid min-w-0 flex-1 gap-0.5">
        <span className="text-caption text-graphite-500">{label}</span>
        <span className="text-label font-normal">{value}</span>
        {source && <Source>{source}</Source>}
      </div>
      {action && (
        <Button size="sm" variant="text" className="text-indigo-600 hover:text-indigo-700" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  )
}

function Remove({ label, onClick }: { label: string; onClick: () => void }) {
  return <IconButton aria-label={label} variant="ghost" size="sm" icon={<XIcon size={16} />} onClick={onClick} />
}

function Switch({ icon, label, note, on, onChange }: { icon: Parameters<typeof StageIcon>[0]['icon']; label: string; note: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex items-center gap-3 text-left">
      <Icon icon={icon} />
      <span className="grid min-w-0 flex-1">
        <span className="text-[15px]">{label}</span>
        <span className="text-caption font-normal text-graphite-500">{note}</span>
      </span>
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', on ? 'bg-graphite-900' : 'bg-graphite-200')}>
        <motion.span layout transition={spring.snappy} className={cn('absolute top-1 size-5 rounded-full bg-white shadow-e1', on ? 'right-1' : 'left-1')} />
      </span>
    </button>
  )
}

const DAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/** Veg days: told days are filled; a pattern Hunch noticed is dashed until the person says yes. */
function VegDays({ user, onChange }: { user: UserProfile; onChange: (v: UserProfile['vegDays']) => void }) {
  const noticed = user.vegDays.find(v => !v.confirmed)
  const confirmed = user.vegDays.filter(v => v.confirmed)
  const toggle = (day: Weekday) => {
    const v = user.vegDays.find(x => x.day === day)
    onChange(v?.confirmed ? user.vegDays.filter(x => x.day !== day) : [...user.vegDays.filter(x => x.day !== day), { day, source: 'told', confirmed: true, evidence: v?.evidence ?? 0 }])
  }
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between">
        <Label>Veg days</Label>
        {confirmed.length > 0 && <Source>{confirmed.every(v => v.source === 'told') ? PROFILE.source.told : 'Learned, then you confirmed'}</Source>}
      </div>
      <div className="flex justify-between gap-1">
        {DAY_SHORT.map((d, i) => {
          const v = user.vegDays.find(x => x.day === i)
          return (
            <button
              key={i}
              type="button"
              aria-pressed={!!v?.confirmed}
              aria-label={`${DAY_NAMES[i]}${v?.confirmed ? ', veg day' : v ? ', noticed' : ''}`}
              onClick={() => toggle(i as Weekday)}
              className={cn(
                'grid size-10 place-items-center rounded-full text-label transition-colors',
                v?.confirmed ? 'bg-graphite-900 text-white' : v ? 'border border-dashed border-indigo-400 text-indigo-700' : 'bg-graphite-50 text-graphite-600 hover:bg-graphite-100',
              )}
            >
              {d}
            </button>
          )
        })}
      </div>
      {noticed && (
        <p className="text-caption font-normal text-graphite-500">
          {DAY_NAMES[noticed.day]}s: {PROFILE.source.pattern(noticed.evidence).toLowerCase()}. Tap to make it a rule.
        </p>
      )}
    </div>
  )
}

function OrderRow({ h, now, onReorder }: { h: PastOrder; now: Date; onReorder: () => void }) {
  const d = DISH_BY_ID[h.lines[0].dishId]
  const at = new Date(h.at)
  const ago = daysBetween(at, now)
  const when = ago === 0 ? 'Today' : ago === 1 ? 'Yesterday' : at.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  const more = h.lines.length - 1
  return (
    <div className="flex items-center gap-3">
      <Photo slug={d.id} alt="" px={48} className="size-11 shrink-0 rounded-[10px]" />
      <div className="grid min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5 text-label">
          <span className="truncate">
            {d.name}
            {more > 0 && <span className="font-normal text-graphite-500"> + {more} more</span>}
          </span>
          {h.rating === 'up' && <ThumbsUpIcon size={13} weight="fill" className="shrink-0 text-indigo-500" aria-label="Loved it" />}
          {h.rating === 'down' && <ThumbsDownIcon size={13} weight="fill" className="shrink-0 text-graphite-400" aria-label="Not great" />}
        </span>
        <span className="truncate text-caption font-normal text-graphite-500">{RESTAURANT_BY_ID[d.restaurantId].name}</span>
        <span className="text-caption font-normal tabular-nums text-graphite-400">
          {when} · {money(h.amount)}
        </span>
      </div>
      <Button size="sm" variant="secondary" onClick={onReorder}>
        Reorder
      </Button>
    </div>
  )
}
