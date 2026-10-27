import { CrosshairIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { AREAS, CURRENT_LOCATION, type Address } from '../../data/account'
import { RESTAURANTS } from '../../data/restaurants'
import { kitchensReaching } from '../../domain/orders'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { BottomSheet } from './BottomSheet'

const LABELS = ['Home', 'Work', 'Other'] as const

/**
 * Add a place in three decisions: where (area), which door (flat, street), what to call it.
 * Reach is shown while choosing, so nobody saves an address no kitchen can get to without knowing.
 */
export function AddressSheet({ open, taken, onSave, onClose }: { open: boolean; taken: string[]; onSave: (a: Omit<Address, 'id'>) => void; onClose: () => void }) {
  return (
    <BottomSheet open={open} title="Add address" onClose={onClose}>
      {/* Remounts each time it opens, so the form starts empty. */}
      {open && <Form taken={taken} onSave={onSave} />}
    </BottomSheet>
  )
}

function Form({ taken, onSave }: { taken: string[]; onSave: (a: Omit<Address, 'id'>) => void }) {
  const [area, setArea] = useState<string>()
  const [line, setLine] = useState('')
  const [label, setLabel] = useState<(typeof LABELS)[number]>(() => LABELS.find(l => l === 'Other' || !taken.includes(l))!)
  const [name, setName] = useState('')

  const a = AREAS.find(x => x.area === area)
  const reach = a ? kitchensReaching(a.extraKm) : undefined
  const finalLabel = label === 'Other' ? name.trim() : label
  const ready = !!a && line.trim().length > 2 && finalLabel.length > 0

  const useCurrent = () => {
    setArea(CURRENT_LOCATION.area)
    setLine(CURRENT_LOCATION.line)
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={e => {
        e.preventDefault()
        if (ready) onSave({ label: finalLabel, line: `${line.trim()}, ${a.area}`, area: a.area, extraKm: a.extraKm })
      }}
    >
      <button type="button" onClick={useCurrent} className="-mx-2 flex items-center gap-3 rounded-[14px] px-2 py-2 text-left text-indigo-600 hover:bg-indigo-50">
        <span className="grid size-9 place-items-center rounded-full bg-indigo-50">
          <CrosshairIcon size={18} />
        </span>
        <span className="grid">
          <span className="text-[15px] font-medium">Use where I am</span>
          <span className="text-[13px] text-graphite-500">
            {CURRENT_LOCATION.line}, {CURRENT_LOCATION.area}
          </span>
        </span>
      </button>

      <Field label="Area">
        <div className="flex flex-wrap gap-2">
          {AREAS.map(x => (
            <Chip key={x.area} variant="filter" selected={area === x.area} onClick={() => setArea(x.area)}>
              {x.area}
            </Chip>
          ))}
        </div>
        {reach !== undefined && (
          <p role="status" className={cn('text-[13px]', reach === 0 ? 'text-error' : 'text-graphite-500')}>
            {reach === 0 ? `No kitchens reach ${area} yet. You can still save it.` : reach === RESTAURANTS.length ? 'Every kitchen delivers here.' : `${reach} of ${RESTAURANTS.length} kitchens deliver here.`}
          </p>
        )}
      </Field>

      <Field label="Flat, building, street">
        <input
          value={line}
          onChange={e => setLine(e.target.value)}
          placeholder="e.g. 4B, Lake View, 80 Feet Road"
          className="h-12 rounded-[14px] bg-graphite-50 px-3.5 text-[15px] outline-none placeholder:text-graphite-400 focus:ring-2 focus:ring-indigo-200"
        />
      </Field>

      <Field label="Save as">
        <div className="flex flex-wrap gap-2">
          {LABELS.map(l => (
            <Chip key={l} variant="filter" selected={label === l} onClick={() => !(l !== 'Other' && taken.includes(l)) && setLabel(l)} className={cn(l !== 'Other' && taken.includes(l) && 'pointer-events-none opacity-40')}>
              {l}
            </Chip>
          ))}
        </div>
        {label === 'Other' && (
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Name it, e.g. Gym, Priya's"
            aria-label="Name"
            className="h-12 rounded-[14px] bg-graphite-50 px-3.5 text-[15px] outline-none placeholder:text-graphite-400 focus:ring-2 focus:ring-indigo-200"
          />
        )}
      </Field>

      <Button type="submit" size="lg" block disabled={!ready}>
        Save and deliver here
      </Button>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <span className="text-caption text-graphite-500">{label}</span>
      {children}
    </div>
  )
}
