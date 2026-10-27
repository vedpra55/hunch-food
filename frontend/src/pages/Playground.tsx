import { BarbellIcon, FireIcon, LeafIcon, ClockIcon, CloudRainIcon, MapPinIcon, PlusIcon, ArrowUpIcon, TagIcon } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { Hunch } from '../components/hunch/Hunch'
import { MOOD_ORDER, MOODS, type Mood } from '../components/hunch/moods'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { Composer } from '../components/ui/Composer'
import { DishRow, HunchPick, InlineError, OfferNote, UndoToast } from '../components/ui/DishBlocks'
import { IconButton } from '../components/ui/IconButton'
import { Island } from '../components/ui/Island'
import { MicButton } from '../components/ui/MicButton'
import { Plate } from '../components/ui/Plate'
import { DISHES, inr } from '../data/dishes'
import { graphite, indigo } from '../design/palette'
import { cn } from '../lib/cn'

/** Every building block, live. Internal review page: /playground */
export function Playground() {
  return (
    <div className="min-h-dvh bg-graphite-25">
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-wash" />
      <div className="relative mx-auto grid w-full max-w-[960px] gap-14 px-4 pb-24 pt-6 sm:px-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[18px] font-semibold tracking-[-0.02em]">
            <span className="size-[18px] rounded-full bg-orb shadow-orb" />
            hunch <span className="font-normal text-graphite-400">/ playground</span>
          </div>
          <a href="/" className="rounded-full px-3 py-1.5 text-label text-graphite-600 hover:bg-graphite-50 hover:text-graphite-900">
            App preview →
          </a>
        </header>
        <HunchSection />
        <ColourSection />
        <TypeSection />
        <ControlsSection />
        <FoodSection />
      </div>
    </div>
  )
}

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="grid gap-5">
      <div className="grid gap-1">
        <h2 id={`${id}-h`} className="text-title">{title}</h2>
        {note && <p className="max-w-[60ch] text-graphite-500">{note}</p>}
      </div>
      {children}
    </section>
  )
}

function Card({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid min-w-0 content-start gap-4 rounded-lg bg-white p-5 shadow-e1', className)}>
      <span className="text-caption uppercase tracking-[0.06em] text-graphite-500">{label}</span>
      {children}
    </div>
  )
}

function HunchSection() {
  const [mood, setMood] = useState<Mood>('idle')
  const [voice, setVoice] = useState(0.6)
  return (
    <Section id="hunch" title="Hunch" note="One colour, nine moods. Move your pointer and it watches; tap it and it hops.">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="relative grid min-h-[340px] place-items-center overflow-hidden rounded-xl bg-white shadow-e1">
          <div aria-hidden className="absolute inset-0 bg-wash" />
          <Hunch mood={mood} size={300} look="pointer" voiceLevel={mood === 'listening' ? voice : undefined} interactive className="relative" />
          <div className="absolute inset-x-5 bottom-4 flex items-baseline justify-between gap-4">
            <b className="font-semibold">{MOODS[mood].label}</b>
            <span className="text-right text-[13px] text-graphite-500">{MOODS[mood].note}</span>
          </div>
        </div>
        <div className="grid content-center gap-4">
          <div className="flex flex-wrap gap-1.5">
            {MOOD_ORDER.map(m => (
              <Chip key={m} variant="filter" selected={mood === m} onClick={() => setMood(m)}>
                {MOODS[m].label}
              </Chip>
            ))}
          </div>
          {mood === 'listening' && (
            <label className="grid gap-2 text-label text-graphite-600">
              Voice level
              <input type="range" min={0} max={1} step={0.01} value={voice} onChange={e => setVoice(+e.target.value)} className="accent-indigo-500" />
            </label>
          )}
          <p className="text-[13px] text-graphite-500">
            <code className="font-mono text-graphite-700">{`<Hunch mood="${mood}" size={300} look="pointer" />`}</code>
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-9">
        {MOOD_ORDER.map(m => (
          <div key={m} className="grid justify-items-center gap-1 rounded-[20px] bg-white px-1.5 pb-3.5 pt-2 text-center shadow-e1">
            <Hunch mood={m} size={88} />
            <b className="text-label font-semibold">{MOODS[m].label}</b>
            <span className="text-caption font-normal text-graphite-500">{MOODS[m].when}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}

function Ramp({ name, scale, dark }: { name: string; scale: Record<string, string>; dark: string }) {
  const entries = Object.entries(scale)
  return (
    <div className="grid gap-2">
      <span className="text-caption uppercase tracking-[0.06em] text-graphite-500">{name}</span>
      <div className="grid grid-cols-6 overflow-hidden rounded-[20px] shadow-e1 sm:grid-cols-[repeat(var(--n),minmax(0,1fr))]" style={{ ['--n' as string]: entries.length }}>
        {entries.map(([k, h]) => (
          <div key={k} className="flex aspect-[1/1.2] min-w-0 flex-col justify-end gap-0.5 p-2.5" style={{ background: h, color: +k >= 500 ? '#fff' : dark }}>
            <b className="text-caption">{k}</b>
            <span className="truncate font-mono text-[10px] opacity-75">{h}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ColourSection() {
  return (
    <Section id="colour" title="Colour" note="Indigo and Graphite. #FAFAFA is the canvas, white sits on top. Tailwind's default palette is removed, so these are the only colours code can use.">
      <Ramp name="Indigo" scale={indigo} dark={indigo[900]} />
      <Ramp name="Graphite" scale={graphite} dark={graphite[900]} />
    </Section>
  )
}

function TypeSection() {
  const rows: Array<[string, string, ReactNode]> = [
    ['display', 'text-display', 'Baarish aur biryani?'],
    ['title', 'text-title', 'Chicken Dum Biryani'],
    ['heading', 'text-heading', 'Found 3 bowls under ₹300'],
    ['body', 'text-body', "Your Friday usual from Nawab's Kitchen. Same spice level, extra raita."],
    ['label', 'text-label', 'Order now · Something lighter'],
    ['caption', 'text-caption text-graphite-500', 'Nawab’s Kitchen · Indiranagar'],
    ['numeric', 'font-mono text-numeric', '₹289 · 32 min · 780 kcal · 4.6★'],
    ['hindi', 'font-hindi text-[24px] leading-8 font-semibold', <span key="hi" lang="hi">बारिश और बिरयानी? आपका रोज़ वाला ऑर्डर तैयार है।</span>],
  ]
  return (
    <Section id="type" title="Type" note="Geist for everything, Geist Mono for numbers, Mukta for Hindi.">
      <div className="rounded-lg bg-white px-5 shadow-e1">
        {rows.map(([token, cls, sample]) => (
          <div key={token} className="grid gap-1 border-graphite-50 py-4 sm:grid-cols-[110px_minmax(0,1fr)] sm:items-baseline sm:gap-4 [&+&]:border-t">
            <code className="font-mono text-caption font-normal text-graphite-500">{token}</code>
            <div className={cn('min-w-0 break-words', cls)}>{sample}</div>
          </div>
        ))}
      </div>
    </Section>
  )
}

function ControlsSection() {
  const [filters, setFilters] = useState<Record<string, boolean>>({ protein: true })
  const toggle = (k: string) => setFilters(f => ({ ...f, [k]: !f[k] }))
  const [listening, setListening] = useState(false)
  const [islandStep, setIslandStep] = useState(0)
  const islandStates = [
    { mood: 'idle' as Mood },
    { mood: 'listening' as Mood, message: 'Listening' },
    { mood: 'thinking' as Mood, message: 'Checking 14 kitchens near you', shimmer: true },
    { mood: 'found' as Mood, message: 'Found 3 bowls under ₹300' },
  ]
  return (
    <Section id="controls" title="Controls" note="Ink for the one main action, indigo tint for things Hunch found, graphite for everything else.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card label="Buttons">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="lg">Order · <span className="font-mono">{inr(289)}</span></Button>
            <Button size="lg" variant="soft">Switch &amp; save <span className="font-mono">{inr(54)}</span></Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary">Something lighter</Button>
            <Button variant="text">Not today</Button>
            <Button disabled>Closed now</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">Add</Button>
            <IconButton aria-label="Add" icon={<PlusIcon />} />
            <IconButton aria-label="Send" variant="primary" icon={<ArrowUpIcon weight="bold" />} />
            <MicButton />
            <MicButton listening />
          </div>
        </Card>
        <Card label="Chips">
          <div className="grid gap-2">
            <span className="text-[13px] text-graphite-500">Thought: why Hunch picked this</span>
            <div className="flex flex-wrap gap-1.5">
              <Chip>Raining → comfort food</Chip>
              <Chip>Your Friday usual</Chip>
            </div>
          </div>
          <div className="grid gap-2">
            <span className="text-[13px] text-graphite-500">Context</span>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <Chip variant="context" icon={<ClockIcon size={16} />}>6:40 PM</Chip>
              <Chip variant="context" icon={<CloudRainIcon size={16} />}>Light rain</Chip>
              <Chip variant="context" icon={<MapPinIcon size={16} />}>Indiranagar</Chip>
            </div>
          </div>
          <div className="grid gap-2">
            <span className="text-[13px] text-graphite-500">Filter (tap) and offer</span>
            <div className="flex flex-wrap gap-1.5">
              <Chip variant="filter" icon={<BarbellIcon size={16} />} selected={filters.protein} onClick={() => toggle('protein')}>High protein</Chip>
              <Chip variant="filter" icon={<LeafIcon size={16} />} selected={filters.veg} onClick={() => toggle('veg')}>Veg</Chip>
              <Chip variant="filter" icon={<FireIcon size={16} />} selected={filters.spicy} onClick={() => toggle('spicy')}>Spicy</Chip>
              <Chip variant="brand" icon={<TagIcon size={16} />}>20% off</Chip>
            </div>
          </div>
        </Card>
        <Card label="Island · tap to step through">
          <button
            type="button"
            onClick={() => setIslandStep(s => (s + 1) % islandStates.length)}
            className="grid min-h-[132px] place-items-center rounded-md bg-graphite-25"
          >
            <Island {...islandStates[islandStep]} />
          </button>
        </Card>
        <Card label="Composer · tap the mic">
          <Composer listening={listening} onMicToggle={() => setListening(l => !l)} onSubmit={() => setListening(false)} />
          <Composer listening />
        </Card>
      </div>
    </Section>
  )
}

function FoodSection() {
  const [toastKey, setToastKey] = useState(0)
  return (
    <Section id="food" title="Food blocks" note="Every answer Hunch gives is built from these. Photos are free Unsplash images; run npm run photos to keep local copies.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card label="Hunch pick">
          <HunchPick dish={DISHES['chicken-biryani']} reasons={['Raining → comfort food', 'Your Friday usual']} onOrder={() => {}} onAlternative={() => {}} alternativeLabel="Lighter" />
        </Card>
        <Card label="Dish rows, offer, undo, error">
          <DishRow dish={DISHES['chicken-bowl']} onAdd={() => {}} />
          <DishRow dish={DISHES['dal-makhani']} onAdd={() => {}} />
          <DishRow dish={DISHES['masala-dosa']} onAdd={() => {}} />
          <OfferNote text="Same bowl is 20% off at FitBowl Co." saving={54} onAccept={() => {}} />
          <UndoToast key={toastKey} message={<>Order placed · <span className="font-mono">{inr(335)}</span></>} onUndo={() => setToastKey(k => k + 1)} onDone={() => setToastKey(k => k + 1)} />
          <InlineError>Payment didn't go through. Your bank declined it. Try UPI instead.</InlineError>
        </Card>
      </div>
      <Card label="Plates · every sample photo">
        <div className="grid grid-cols-4 gap-4 sm:grid-cols-8">
          {Object.values(DISHES).map(d => (
            <div key={d.id} className="grid justify-items-center gap-2 text-center">
              <Plate slug={d.id} alt={d.name} size={96} />
              <span className="text-caption font-normal text-graphite-600">{d.name}</span>
            </div>
          ))}
        </div>
      </Card>
    </Section>
  )
}
