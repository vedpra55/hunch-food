import { ForkKnifeIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { photoSources, type PhotoSlug } from '../../data/dishes'
import { cn } from '../../lib/cn'

export interface PlateProps {
  slug: PhotoSlug
  alt: string
  /** px */
  size?: number
  /** Lift with a soft shadow (use on the Hunch Pick) */
  raised?: boolean
  className?: string
}

/**
 * A dish photo cut to a circle: the plate is the shape.
 * Tries the local copy (npm run photos), then the Unsplash CDN, then a quiet placeholder.
 */
export function Plate({ slug, alt, size = 72, raised, className }: PlateProps) {
  const src = photoSources(slug, size)
  const [stage, setStage] = useState<'local' | 'remote' | 'none'>('local')
  const [loaded, setLoaded] = useState(false)

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full bg-graphite-50 ring-white',
        size >= 120 ? 'ring-[6px]' : 'ring-[3px]',
        raised ? 'shadow-e2' : 'shadow-e1',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {stage === 'none' ? (
        <div role="img" aria-label={alt} className="grid size-full place-items-center bg-indigo-50 text-indigo-300">
          <ForkKnifeIcon size={Math.round(size * 0.32)} />
        </div>
      ) : (
        <img
          key={stage}
          src={stage === 'local' ? src.local : src.remote}
          alt={alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => setStage(stage === 'local' ? 'remote' : 'none')}
          className={cn('size-full object-cover transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
        />
      )}
      {/* soft inner edge so every photo sits like a plate */}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_rgb(24_24_27/0.06),inset_0_-8px_16px_rgb(24_24_27/0.06)]" />
    </div>
  )
}
