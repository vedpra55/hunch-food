import { CaretRightIcon, CheckCircleIcon } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import type { OnboardingAnswers } from '../../chat/useConversation'
import { ONBOARD } from '../../domain/copy'
import type { Allergen, Diet, GoalKind } from '../../domain/types'
import { spring } from '../../design/motion'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { HunchCard } from './Cards'

/**
 * Three taps before the first suggestion: diet, allergies, an optional goal (HOME_SPEC §7).
 * One question at a time, inside one card; answered, it folds into one line.
 */
export function OnboardingCard({ name, summary, onDone }: { name: string; summary?: string; onDone: (a: OnboardingAnswers | null) => void }) {
  const [step, setStep] = useState(0)
  const [diet, setDiet] = useState<Diet>('nonveg')
  const [allergies, setAllergies] = useState<Allergen[]>([])
  const [picked, setPicked] = useState(false)

  if (summary) {
    return (
      <HunchCard className="gap-1.5">
        <span className="flex items-center gap-2 text-label">
          <CheckCircleIcon size={18} weight="fill" className="text-indigo-500" />
          {summary}
        </span>
        <span className="pl-[26px] text-caption font-normal text-graphite-500">{ONBOARD.later}</span>
      </HunchCard>
    )
  }

  const toggle = (a: Allergen) => setAllergies(xs => (xs.includes(a) ? xs.filter(x => x !== a) : [...xs, a]))
  const finish = (goal?: GoalKind) => onDone({ diet, allergies, goal })

  return (
    <HunchCard className="gap-5 p-5">
      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-1" role="img" aria-label={`Step ${step + 1} of 3`}>
            {ONBOARD.steps.map((_, i) => (
              <span key={i} className={cn('h-1 w-6 rounded-full transition-colors duration-300', i <= step ? 'bg-indigo-500' : 'bg-graphite-100')} />
            ))}
          </div>
          {step === 0 ? (
            <Button size="sm" variant="text" onClick={() => onDone(null)}>
              Skip
            </Button>
          ) : (
            <Button size="sm" variant="text" onClick={() => setStep(s => s - 1)}>
              Back
            </Button>
          )}
        </div>
        {step === 0 && <p className="text-[15px] leading-[22px] text-graphite-600">{ONBOARD.hello(name)}</p>}
        <h1 className="text-[22px] font-semibold leading-7 tracking-[-0.015em]">{ONBOARD.steps[step]}</h1>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={spring.snappy} className="grid gap-1">
          {step === 0 &&
            ONBOARD.diets.map(d => (
              <Choice
                key={d.id}
                label={d.label}
                // Highlight only what they picked before going back, never a default.
                selected={step === 0 && picked && diet === d.id}
                onClick={() => {
                  setPicked(true)
                  setDiet(d.id)
                  setStep(1)
                }}
              />
            ))}

          {step === 1 && (
            <div className="grid gap-4">
              <div className="flex flex-wrap gap-2">
                {ONBOARD.allergies.map(a => (
                  <Chip key={a.id} variant="filter" selected={allergies.includes(a.id)} onClick={() => toggle(a.id)}>
                    {a.label}
                  </Chip>
                ))}
              </div>
              <Button size="lg" block onClick={() => setStep(2)}>
                {allergies.length ? 'Continue' : ONBOARD.nothing}
              </Button>
            </div>
          )}

          {step === 2 && (
            <>
              {ONBOARD.goals.map(g => (
                <Choice key={g.id} label={g.label} onClick={() => finish(g.id)} />
              ))}
              <Choice label={ONBOARD.noGoal} muted onClick={() => finish()} />
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </HunchCard>
  )
}

function Choice({ label, selected, muted, onClick }: { label: string; selected?: boolean; muted?: boolean; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      transition={spring.snappy}
      className={cn('-mx-2 flex items-center rounded-[14px] px-3 py-3 text-left transition-colors hover:bg-graphite-50', selected && 'bg-graphite-50')}
    >
      <span className={cn('flex-1 text-[15px]', muted && 'text-graphite-500')}>{label}</span>
      <CaretRightIcon size={16} className="text-graphite-300" />
    </motion.button>
  )
}
