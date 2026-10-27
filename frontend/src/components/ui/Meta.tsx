import { cn } from '../../lib/cn'

/** Price · time · rating line in the numeric face. Falsy parts are skipped. */
export function Meta({ parts, className }: { parts: Array<string | false | null | undefined>; className?: string }) {
  return (
    <span className={cn('text-caption font-normal tabular-nums text-graphite-500', className)}>
      {parts.filter(Boolean).join(' · ')}
    </span>
  )
}

/** Indian veg / non-veg mark. Functional colour, never restyled. */
export function VegMark({ veg, className }: { veg: boolean; className?: string }) {
  return (
    <span
      role="img"
      aria-label={veg ? 'Vegetarian' : 'Non-vegetarian'}
      className={cn('inline-grid size-[11px] shrink-0 place-items-center rounded-[2.5px] border-[1.25px]', veg ? 'border-veg' : 'border-nonveg', className)}
    >
      {veg ? (
        <span className="size-[4px] rounded-full bg-veg" />
      ) : (
        <span className="h-0 w-0 border-x-[3px] border-b-[5px] border-x-transparent border-b-nonveg" />
      )}
    </span>
  )
}
