import { ForkKnifeIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { photoSources, type PhotoSlug } from '../../data/dishes'
import { cn } from '../../lib/cn'

/**
 * A dish photo that fills its box (set size and radius with className).
 * Local copy (npm run photos) → Unsplash CDN → quiet placeholder.
 */
export function Photo({ slug, alt, px = 400, className }: { slug: PhotoSlug; alt: string; px?: number; className?: string }) {
  const src = photoSources(slug, px)
  const [stage, setStage] = useState<'local' | 'remote' | 'none'>('local')
  const [loaded, setLoaded] = useState(false)
  return (
    <div className={cn('relative overflow-hidden bg-graphite-50', className)}>
      {stage === 'none' ? (
        <div role="img" aria-label={alt} className="grid size-full place-items-center bg-indigo-50 text-indigo-300">
          <ForkKnifeIcon size={28} />
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
    </div>
  )
}
