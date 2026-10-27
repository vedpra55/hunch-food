import { PlusIcon, SparkleIcon, TagIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { useEffect } from 'react'
import { inr, type Dish } from '../../data/dishes'
import { cn } from '../../lib/cn'
import { Button } from './Button'
import { Chip } from './Chip'
import { IconButton } from './IconButton'
import { Meta, VegMark } from './Meta'
import { Plate } from './Plate'

/** Compact dish in a list. */
export function DishRow({ dish, onAdd, className }: { dish: Dish; onAdd?: () => void; className?: string }) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3.5', className)}>
      <Plate slug={dish.id} alt={dish.name} size={72} />
      <div className="grid min-w-0 flex-1 gap-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <VegMark veg={dish.veg} />
          <span className="truncate text-[15px] font-semibold">{dish.name}</span>
        </div>
        <span className="truncate text-[13px] text-graphite-500">{dish.restaurant}</span>
        <Meta parts={[inr(dish.price), `${dish.etaMin} min`, dish.proteinG ? `${dish.proteinG} g protein` : `${dish.rating}★`]} />
      </div>
      {onAdd && <IconButton aria-label={`Add ${dish.name}`} onClick={onAdd} icon={<PlusIcon size={20} />} />}
    </div>
  )
}

export interface HunchPickProps {
  dish: Dish
  /** Up to 3 short reasons, e.g. "Raining → comfort food" */
  reasons?: string[]
  onOrder?: () => void
  onAlternative?: () => void
  alternativeLabel?: string
  className?: string
}

/** The hero of every answer: one dish, one price, one tap. */
export function HunchPick({ dish, reasons = [], onOrder, onAlternative, alternativeLabel = 'Something else', className }: HunchPickProps) {
  return (
    <div className={cn('grid justify-items-center gap-2.5 text-center', className)}>
      <Plate slug={dish.id} alt={dish.name} size={184} raised />
      <span className="mt-2 inline-flex items-center gap-1.5 text-caption tracking-[0.02em] text-indigo-600">
        <SparkleIcon size={14} weight="fill" />
        Hunch pick
      </span>
      <h3 className="flex items-center gap-2 text-[22px] font-semibold leading-7 tracking-[-0.015em] text-balance">
        <VegMark veg={dish.veg} />
        {dish.name}
      </h3>
      <Meta parts={[dish.restaurant, inr(dish.price), `${dish.etaMin} min`, `${dish.rating}★`]} />
      {reasons.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 pt-1">
          {reasons.slice(0, 3).map(r => (
            <Chip key={r}>{r}</Chip>
          ))}
        </div>
      )}
      <div className="mt-2 flex w-full gap-2">
        {onAlternative && (
          <Button variant="secondary" size="lg" className="flex-1" onClick={onAlternative}>
            {alternativeLabel}
          </Button>
        )}
        <Button size="lg" className="flex-[2]" onClick={onOrder}>
          Order · <span className="font-mono tabular-nums">{inr(dish.price)}</span>
        </Button>
      </div>
    </div>
  )
}

/** Hunch found a better deal. Indigo tint, no flashing. */
export function OfferNote({ text, saving, onAccept, acceptLabel = 'Switch', className }: { text: string; saving: number; onAccept?: () => void; acceptLabel?: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 rounded-[18px] bg-indigo-50 p-3.5', className)}>
      <TagIcon size={20} className="shrink-0 text-indigo-600" />
      <div className="grid min-w-0 flex-1 gap-0.5 text-label font-normal text-graphite-800">
        <span>{text}</span>
        <span className="font-mono text-[13px] font-medium text-indigo-700">Save {inr(saving)}</span>
      </div>
      {onAccept && (
        <Button variant="soft" size="sm" onClick={onAccept}>
          {acceptLabel}
        </Button>
      )}
    </div>
  )
}

/** Replaces confirm dialogs: act now, undo for a few seconds. */
export function UndoToast({ message, seconds = 5, onUndo, onDone, className }: { message: React.ReactNode; seconds?: number; onUndo?: () => void; onDone?: () => void; className?: string }) {
  useEffect(() => {
    if (!onDone) return
    const id = setTimeout(onDone, seconds * 1000)
    return () => clearTimeout(id)
  }, [onDone, seconds])

  const C = 2 * Math.PI * 8
  return (
    <div role="status" className={cn('flex items-center gap-3 rounded-full bg-graphite-900 py-2 pl-[18px] pr-2 text-label font-normal text-white shadow-e3', className)}>
      <span className="min-w-0 flex-1 truncate">{message}</span>
      <button type="button" onClick={onUndo} className="inline-flex h-9 items-center gap-2 rounded-full bg-white/10 px-3.5 font-medium transition-colors hover:bg-white/15">
        <svg viewBox="0 0 20 20" className="size-[18px] -rotate-90" aria-hidden>
          <circle cx="10" cy="10" r="8" fill="none" stroke="rgb(255 255 255 / .2)" strokeWidth="2.5" />
          <motion.circle
            cx="10"
            cy="10"
            r="8"
            fill="none"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: C }}
            transition={{ duration: seconds, ease: 'linear' }}
          />
        </svg>
        Undo
      </button>
    </div>
  )
}

/** Says what went wrong and what to do next. No apologies, no codes. */
export function InlineError({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="alert" className={cn('flex items-start gap-2 text-[13px] leading-5 text-error', className)}>
      <WarningCircleIcon size={18} className="mt-px shrink-0" />
      <span>{children}</span>
    </p>
  )
}
