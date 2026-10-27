import { ClockIcon, CloudRainIcon, MapPinIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { Mood } from '../components/hunch/moods'
import { AppShell } from '../components/layout/AppShell'
import { Chip } from '../components/ui/Chip'
import { Composer } from '../components/ui/Composer'
import { HunchPick, OfferNote, UndoToast } from '../components/ui/DishBlocks'
import { Island } from '../components/ui/Island'
import { DISHES, inr } from '../data/dishes'
import { emerge, emergeGroup } from '../design/motion'

type Phase = 'greet' | 'listening' | 'thinking' | 'answer' | 'ordered'

const THOUGHTS = ['22°C and drizzling', 'Cosy → warm and creamy', 'Under ₹250', 'You rated Angithi Dhaba 5★']
const fromHunch = { transformOrigin: '50% -80px' }

function greeting(h = new Date().getHours()) {
  if (h < 5) return 'Up late?'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * App shell preview: the "born from Hunch" loop on sample data.
 * Real conversation, cart and payment arrive in step 2.
 */
export function Home() {
  const [phase, setPhase] = useState<Phase>('greet')
  const [query, setQuery] = useState('')
  const [switched, setSwitched] = useState(false)
  const pick = DISHES['dal-makhani']
  const price = switched ? pick.price - 36 : pick.price

  useEffect(() => {
    if (phase === 'listening') {
      const id = setTimeout(() => ask('something cosy, under ₹250'), 2400)
      return () => clearTimeout(id)
    }
    if (phase === 'thinking') {
      const id = setTimeout(() => setPhase('answer'), 2200)
      return () => clearTimeout(id)
    }
  }, [phase])

  function ask(text: string) {
    setQuery(text)
    setSwitched(false)
    setPhase('thinking')
  }

  const island: Record<Phase, { mood: Mood; message?: string; shimmer?: boolean }> = {
    greet: { mood: 'idle', message: greeting() },
    listening: { mood: 'listening', message: 'Listening' },
    thinking: { mood: 'thinking', message: 'Checking 14 kitchens near you', shimmer: true },
    answer: switched ? { mood: 'delighted', message: `Switched. You save ${inr(36)}` } : { mood: 'found', message: 'Found it' },
    ordered: { mood: 'onTheWay', message: `On the way · ${pick.etaMin} min` },
  }

  const now = new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })

  return (
    <AppShell
      top={<Island {...island[phase]} />}
      bottom={
        <div className="grid gap-3">
          <AnimatePresence>
            {phase === 'ordered' && (
              <motion.div key="toast" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
                <UndoToast message={<>Order placed · <span className="font-mono">{inr(price)}</span></>} onUndo={() => setPhase('answer')} />
              </motion.div>
            )}
          </AnimatePresence>
          <Composer listening={phase === 'listening'} onMicToggle={() => (phase === 'listening' ? ask('something cosy, under ₹250') : setPhase('listening'))} onSubmit={ask} />
        </div>
      }
    >
      <AnimatePresence mode="wait">
        {phase === 'greet' || phase === 'listening' ? (
          <motion.section key="greet" initial="hidden" animate="shown" exit={{ opacity: 0, filter: 'blur(6px)' }} variants={emergeGroup} className="grid gap-6">
            <motion.div variants={emerge} style={fromHunch} className="flex flex-wrap justify-center gap-x-4 gap-y-1">
              <Chip variant="context" icon={<ClockIcon size={16} />}>{now}</Chip>
              <Chip variant="context" icon={<CloudRainIcon size={16} />}>Light rain</Chip>
              <Chip variant="context" icon={<MapPinIcon size={16} />}>Indiranagar</Chip>
            </motion.div>
            <motion.div variants={emerge} style={fromHunch} className="grid gap-2 text-center">
              <h1 className="text-display text-balance">Baarish aur biryani?</h1>
              <p className="text-graphite-500">Your Friday usual from {DISHES['chicken-biryani'].restaurant}. One tap.</p>
            </motion.div>
            <motion.div variants={emerge} style={fromHunch}>
              <HunchPick
                dish={DISHES['chicken-biryani']}
                reasons={['Raining → comfort food', 'Your Friday usual']}
                onOrder={() => setPhase('ordered')}
                onAlternative={() => ask('something lighter')}
                alternativeLabel="Lighter"
              />
            </motion.div>
          </motion.section>
        ) : (
          <motion.section key="answer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-5">
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ml-auto max-w-[80%] rounded-[20px_20px_6px_20px] bg-graphite-900 px-4 py-2.5 text-label font-normal text-white">
              {query}
            </motion.p>
            <motion.div initial="hidden" animate="shown" variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.32, delayChildren: 0.2 } } }} className="flex flex-wrap justify-center gap-1.5">
              {THOUGHTS.map(t => (
                <motion.span key={t} variants={emerge} style={fromHunch}>
                  <Chip>{t}</Chip>
                </motion.span>
              ))}
            </motion.div>
            <AnimatePresence>
              {phase !== 'thinking' && (
                <motion.div key="pick" initial="hidden" animate="shown" variants={emergeGroup} className="grid gap-5">
                  <motion.div variants={emerge} style={fromHunch}>
                    <HunchPick
                      dish={{ ...pick, price, restaurant: switched ? 'Punjabi Tadka' : pick.restaurant }}
                      onOrder={() => setPhase('ordered')}
                      onAlternative={() => setPhase('greet')}
                      alternativeLabel="Start over"
                    />
                  </motion.div>
                  {!switched && (
                    <motion.div variants={emerge} style={fromHunch}>
                      <OfferNote text="Same dal is 15% off at Punjabi Tadka, 3 min further." saving={36} onAccept={() => setSwitched(true)} />
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        )}
      </AnimatePresence>
    </AppShell>
  )
}
