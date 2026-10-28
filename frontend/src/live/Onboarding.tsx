import { ArrowRightIcon, CheckIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { HunchMark, UserSays } from '../components/chat/Bubbles'
import { Hunch } from '../components/hunch/Hunch'
import type { Mood } from '../components/hunch/moods'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { IconButton } from '../components/ui/IconButton'
import { spring } from '../design/motion'
import { cn } from '../lib/cn'
import { api, type Area, type Profile } from './api'

/**
 * First run: what Hunch can do (three slides), then Hunch asks four quick questions in its own voice.
 * No model involved: instant, free, and the same every time. Answers are saved together at the end.
 */
export function Onboarding({ onDone }: { onDone: (p: Profile) => void }) {
  const [intro, setIntro] = useState(true)
  return (
    <div className="relative min-h-dvh bg-graphite-25">
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-wash" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[420px] flex-col px-4">
        <AnimatePresence mode="wait">
          {intro ? (
            <motion.div key="intro" className="flex flex-1 flex-col" exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
              <Intro onStart={() => setIntro(false)} />
            </motion.div>
          ) : (
            <motion.div key="ask" className="flex flex-1 flex-col" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring.gentle}>
              <Questions onDone={onDone} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

const SLIDES: { mood: Mood; title: string; line: string }[] = [
  { mood: 'delighted', title: "Hi, I'm Hunch.", line: "Tell me what you're craving, in your own words. \"Something spicy under ₹150\" is plenty." },
  { mood: 'focused', title: 'I know every kitchen near you.', line: "What's open, how far, the offers running right now, and what people actually say about the food." },
  { mood: 'care', title: 'I remember what you like.', line: 'Your diet and allergies are filtered out for you, always. When it looks right, you pay with one tap.' },
]

function Intro({ onStart }: { onStart: () => void }) {
  const [i, setI] = useState(0)
  const last = i === SLIDES.length - 1
  const s = SLIDES[i]
  const next = () => (last ? onStart() : setI(i + 1))
  return (
    <div className="flex flex-1 flex-col pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]">
      <div className="flex justify-end">
        {!last && (
          <Button variant="text" size="sm" onClick={onStart}>
            Skip
          </Button>
        )}
      </div>
      <div className="grid flex-1 place-items-center">
        <div className="grid justify-items-center gap-8 text-center">
          <Hunch mood={s.mood} size={168} look="pointer" interactive />
          <AnimatePresence mode="wait">
            <motion.div key={i} className="grid max-w-[320px] gap-3" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={spring.gentle}>
              <h1 className="text-[28px] font-semibold leading-9 tracking-[-0.02em] text-balance">{s.title}</h1>
              <p className="text-[16px] leading-6 text-graphite-600 text-pretty">{s.line}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div className="grid gap-5">
        <div className="flex justify-center gap-1.5" aria-hidden>
          {SLIDES.map((_, k) => (
            <motion.span key={k} animate={{ width: k === i ? 22 : 6 }} className={cn('h-1.5 rounded-full', k === i ? 'bg-indigo-500' : 'bg-graphite-200')} />
          ))}
        </div>
        <Button size="lg" block onClick={next} icon={last ? undefined : <ArrowRightIcon size={18} />}>
          {last ? "Let's start" : 'Next'}
        </Button>
      </div>
    </div>
  )
}

type Diet = 'nonveg' | 'eggetarian' | 'veg' | 'jain' | 'vegan'
const DIETS: [Diet, string][] = [['nonveg', 'Everything'], ['eggetarian', 'Veg + eggs'], ['veg', 'Vegetarian'], ['jain', 'Jain'], ['vegan', 'Vegan']]
const ALLERGIES: [string, string][] = [['dairy', 'Dairy'], ['gluten', 'Gluten'], ['nuts', 'Nuts'], ['egg', 'Egg'], ['soy', 'Soy']]
const CITY_ORDER = ['LPU & around', 'Phagwara', 'Jalandhar']

function Questions({ onDone }: { onDone: (p: Profile) => void }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [areas, setAreas] = useState<Area[]>([])
  const [area, setArea] = useState<Area>()
  const [diet, setDiet] = useState<[Diet, string]>()
  const [allergies, setAllergies] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string>()
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api<{ areas: Area[] }>('/areas').then(r => setAreas(r.areas)).catch(() => setErr("Couldn't load places. Check your connection."))
  }, [])
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [step])

  const first = name.trim().split(' ')[0]
  const finish = async (picked: string[]) => {
    setSaving(true)
    setErr(undefined)
    try {
      const r = await api<{ profile: Profile }>('/onboarding', { method: 'POST', body: { name: name.trim(), area_id: area?.id, diet: diet?.[0] ?? 'nonveg', allergies: picked } })
      setStep(4)
      setTimeout(() => onDone(r.profile), 900)
    } catch (e) {
      setErr((e as Error).message)
      setSaving(false)
    }
  }

  const groups = CITY_ORDER.map(g => ({ g, list: areas.filter(a => (g === 'LPU & around' ? a.city === 'Phagwara' && !a.id.startsWith('phg-') : g === 'Phagwara' ? a.id.startsWith('phg-') : a.city === g)) }))

  return (
    <div className="flex flex-1 flex-col gap-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))]">
      <Ask mood="delighted" text="Hey, I'm Hunch. What should I call you?" />
      {step === 0 ? (
        <form
          className="flex items-center gap-2 rounded-full bg-white p-1.5 pl-5 shadow-e1"
          onSubmit={e => {
            e.preventDefault()
            if (name.trim()) setStep(1)
          }}
        >
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Your name" maxLength={60} className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-graphite-400" aria-label="Your name" />
          <IconButton type="submit" aria-label="Next" variant="primary" disabled={!name.trim()} icon={<ArrowRightIcon size={18} weight="bold" />} className="size-11" />
        </form>
      ) : (
        <UserSays>{name.trim()}</UserSays>
      )}

      {step >= 1 && <Ask mood="focused" text={`Nice to meet you, ${first}. Where should I deliver?`} />}
      {step === 1 && (
        <div className="grid gap-4 pl-[34px]">
          {groups.map(({ g, list }) =>
            list.length ? (
              <div key={g} className="grid gap-2">
                <span className="text-[12px] font-medium text-graphite-500">{g}</span>
                <div className="flex flex-wrap gap-2">
                  {list.map(a => (
                    <Chip key={a.id} variant="filter" onClick={() => { setArea(a); setStep(2) }}>
                      {a.name.replace(', Phagwara', '').replace(', Jalandhar', '')}
                    </Chip>
                  ))}
                </div>
              </div>
            ) : null,
          )}
          {!areas.length && !err && <span className="text-[13px] text-graphite-500 text-shimmer">Loading places…</span>}
        </div>
      )}
      {step >= 2 && area && <UserSays>{area.name}</UserSays>}

      {step >= 2 && <Ask mood="idle" text="What do you eat?" />}
      {step === 2 && (
        <div className="flex flex-wrap gap-2 pl-[34px]">
          {DIETS.map(d => (
            <Chip key={d[0]} variant="filter" onClick={() => { setDiet(d); setStep(3) }}>
              {d[1]}
            </Chip>
          ))}
        </div>
      )}
      {step >= 3 && diet && <UserSays>{diet[1]}</UserSays>}

      {step >= 3 && <Ask mood="care" text="Anything that makes you unwell? I'll keep it off your plate, every time." />}
      {step === 3 && (
        <div className="grid gap-3 pl-[34px]">
          <div className="flex flex-wrap gap-2">
            {ALLERGIES.map(([id, label]) => (
              <Chip key={id} variant="filter" selected={allergies.includes(id)} onClick={() => setAllergies(xs => (xs.includes(id) ? xs.filter(x => x !== id) : [...xs, id]))}>
                {label}
              </Chip>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => finish(allergies)} disabled={saving}>
              {saving ? 'Saving…' : allergies.length ? 'Done' : 'Nothing, I eat it all'}
            </Button>
          </div>
        </div>
      )}
      {step >= 4 && (
        <>
          <UserSays>{allergies.length ? `No ${allergies.join(', ')}` : 'Nothing'}</UserSays>
          <Ask mood="delighted" text={`All set, ${first}. Let's eat.`} icon />
        </>
      )}
      {err && (
        <p className="pl-[34px] text-[13px] text-error">
          {err}{' '}
          {step === 3 && (
            <button type="button" className="underline" onClick={() => finish(allergies)}>
              Try again
            </button>
          )}
        </p>
      )}
      <div ref={end} />
    </div>
  )
}

/** Hunch asking: its mark and its words, typed in. */
function Ask({ text, mood, icon }: { text: string; mood: Mood; icon?: boolean }) {
  const words = text.split(' ')
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-1.5 pr-4">
      <HunchMark mood={mood} />
      <p aria-label={text} className="text-[20px] font-medium leading-7 tracking-[-0.012em] text-pretty">
        {words.map((w, i) => (
          <motion.span key={i} aria-hidden initial={{ opacity: 0, filter: 'blur(4px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} transition={{ delay: 0.15 + i * 0.035, duration: 0.25 }} className="inline-block whitespace-pre">
            {i < words.length - 1 ? `${w} ` : w}
          </motion.span>
        ))}
        {icon && <CheckIcon size={18} weight="bold" className="ml-1.5 inline text-indigo-500" />}
      </p>
    </motion.div>
  )
}
