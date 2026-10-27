import { MinusIcon, PlusIcon, TagIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion, useDragControls, type DragControls } from 'motion/react'
import { useEffect, useState } from 'react'
import { money, reasonSentence } from '../../domain/copy'
import { clockLabel } from '../../domain/time'
import type { NotForMe, Suggestion } from '../../domain/types'
import { spring } from '../../design/motion'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { IconButton } from '../ui/IconButton'
import { VegMark } from '../ui/Meta'
import { Photo } from '../ui/Photo'

export interface DishSheetProps {
  s?: Suggestion
  /** Show nutrition only when the person has a goal */
  showNutrition: boolean
  onClose: () => void
  onAdd: (s: Suggestion, qty: number, customisation: string[]) => void
  onNotForMe: (s: Suggestion, reason: NotForMe['reason']) => void
}

const REASONS: Array<[NotForMe['reason'], string]> = [
  ['too-spicy', 'Too spicy'],
  ['too-pricey', 'Too pricey'],
  ['not-this-place', 'Not this place'],
  ['not-today', 'Not today'],
]

/** Decide here. Sections appear only when they are relevant (HOME_SPEC §2). */
export function DishSheet({ s, showNutrition, onClose, onAdd, onNotForMe }: DishSheetProps) {
  const drag = useDragControls()
  useEffect(() => {
    if (!s) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [s, onClose])

  return (
    <AnimatePresence>
      {s && (
        <>
          <motion.div key="scrim" className="fixed inset-0 z-40 bg-graphite-900/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={s.dish.name}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={spring.gentle}
            drag="y"
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => info.offset.y > 120 && onClose()}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] w-full max-w-[600px] flex-col rounded-t-[28px] bg-white shadow-e3"
          >
            <SheetBody key={s.dish.id} s={s} drag={drag} showNutrition={showNutrition} onAdd={onAdd} onNotForMe={onNotForMe} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function SheetBody({ s, drag, showNutrition, onAdd, onNotForMe }: Omit<DishSheetProps, 's' | 'onClose'> & { s: Suggestion; drag: DragControls }) {
  const { dish, restaurant: r } = s
  const [qty, setQty] = useState(1)
  const [choices, setChoices] = useState<Record<string, string>>(() => Object.fromEntries((dish.options ?? []).map(o => [o.label, o.default])))
  const [editing, setEditing] = useState(!s.customisation)
  const [notForMe, setNotForMe] = useState(false)
  const customisation = editing ? Object.entries(choices).filter(([label, v]) => dish.options?.find(o => o.label === label)?.default !== v).map(([, v]) => v) : (s.customisation ?? [])

  return (
    <>
      {/* Only the handle drags, so scrolling inside the sheet never fights with closing it. */}
      <div onPointerDown={e => drag.start(e)} className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center" aria-hidden>
        <span className="h-1 w-10 rounded-full bg-graphite-200" />
      </div>
      {/* Flex, not grid: inside a height-limited scroller grid rows shrink and overlap. */}
      <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-4 pb-4 pt-1 sm:px-6 [&>*]:shrink-0">
        {/* 1 photo */}
        <Photo slug={dish.id} alt={dish.name} px={600} className="aspect-[16/10] w-full rounded-[20px]" />

        {/* 2–4 what, where, cost, time */}
        <div className="grid gap-1.5">
          <h2 className="flex items-center gap-2 text-[22px] font-semibold leading-7 tracking-[-0.015em]">
            <VegMark veg={dish.diet === 'veg'} />
            {dish.name}
          </h2>
          <p className="text-label font-normal text-graphite-700">
            <span className="font-medium text-graphite-900">{r.name}</span> · {r.area} · {r.distanceKm} km · {r.rating}★ ({r.ratingCount >= 1000 ? `${(r.ratingCount / 1000).toFixed(1)}k` : r.ratingCount})
          </p>
          <p className="text-[13px] tabular-nums text-graphite-500">
            {money(dish.price)} · {r.etaMin} min · {r.deliveryFee ? `${money(r.deliveryFee)} delivery` : 'Free delivery'} · {s.open ? `Open till ${clockLabel(r.closes)}` : s.opensLabel}
          </p>
        </div>

        {/* 5 why */}
        {s.reasons.length > 0 && (
          <Section title="Why Hunch picked it">
            <p className="text-[15px] leading-[22px] text-graphite-800">{reasonSentence(s.reasons)}</p>
          </Section>
        )}

        {/* 6 what people say */}
        <Section title="What people say">
          <ul className="grid gap-1">
            {dish.reviews.map(x => (
              <li key={x} className="text-[15px] leading-[22px] text-graphite-800">
                “{x}”
              </li>
            ))}
          </ul>
        </Section>

        {/* 7 your usual / options */}
        {!editing && s.customisation ? (
          <Section title="Your usual">
            <div className="flex items-center justify-between gap-3 rounded-[14px] bg-graphite-50 px-3.5 py-2.5">
              <span className="text-label font-normal">{s.customisation.join(' · ')}</span>
              <button type="button" className="text-label text-indigo-600" onClick={() => setEditing(true)}>
                Change
              </button>
            </div>
          </Section>
        ) : (
          dish.options?.map(o => (
            <Section key={o.label} title={o.label}>
              <div className="flex flex-wrap gap-1.5">
                {o.choices.map(c => (
                  <Chip key={c} variant="filter" selected={choices[o.label] === c} onClick={() => setChoices(v => ({ ...v, [o.label]: c }))}>
                    {c}
                  </Chip>
                ))}
              </div>
            </Section>
          ))
        )}

        {/* 8 offer */}
        {dish.offerOff ? (
          <div className="flex items-center gap-2.5 rounded-[14px] bg-indigo-50 px-3.5 py-2.5 text-label font-normal text-indigo-700">
            <TagIcon size={18} />
            {money(dish.offerOff)} off today, applied at checkout
          </div>
        ) : null}

        {/* 9 nutrition, only with a goal */}
        {showNutrition && (
          <Section title="Nutrition">
            <span className="text-label font-normal tabular-nums">
              {dish.kcal} kcal · {dish.proteinG} g protein
            </span>
          </Section>
        )}

        {/* 11 not for me */}
        <div className="grid gap-2">
          {!notForMe ? (
            <button type="button" onClick={() => setNotForMe(true)} className="justify-self-start text-label font-normal text-graphite-500 hover:text-graphite-800">
              Not for me
            </button>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map(([id, label]) => (
                <Chip key={id} variant="filter" onClick={() => onNotForMe(s, id)}>
                  {label}
                </Chip>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 10 sticky footer */}
      <div className="flex items-center gap-3 border-t border-graphite-50 bg-white px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 sm:px-6">
        <div className="flex items-center gap-1 rounded-full bg-graphite-50 p-1">
          <IconButton aria-label="One less" size="sm" variant="ghost" onClick={() => setQty(q => Math.max(1, q - 1))} icon={<MinusIcon size={16} />} />
          <span className="w-6 text-center text-label tabular-nums" aria-live="polite">
            {qty}
          </span>
          <IconButton aria-label="One more" size="sm" variant="ghost" onClick={() => setQty(q => q + 1)} icon={<PlusIcon size={16} />} />
        </div>
        <Button size="lg" className="flex-1" disabled={!s.open} onClick={() => onAdd(s, qty, customisation)}>
          {s.open ? (
            <>
              Add · <span className="tabular-nums">{money(dish.price * qty)}</span>
            </>
          ) : (
            s.opensLabel
          )}
        </Button>
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <h3 className="text-[13px] font-medium text-graphite-500">{title}</h3>
      {children}
    </div>
  )
}
