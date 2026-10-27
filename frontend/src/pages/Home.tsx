import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { useConversation, type Msg } from '../chat/useConversation'
import { HunchSays, Emerge, Typing, UserSays } from '../components/chat/Bubbles'
import { AskCard, CartPill, CheckoutCard, DishRow, PlanCard, RuleChips, TrackingCard, UsualCard } from '../components/chat/Cards'
import { DishSheet } from '../components/chat/DishSheet'
import { TopBar } from '../components/chat/TopBar'
import { AppShell } from '../components/layout/AppShell'
import { Chip } from '../components/ui/Chip'
import { Composer } from '../components/ui/Composer'
import { activeGoal } from '../domain/rules'
import { DevPanel } from '../dev/DevPanel'
import { stagger } from '../design/motion'

const params = new URLSearchParams(location.search)
const DEV = import.meta.env.DEV || params.has('dev')

/**
 * Home is the conversation. Hunch's proactive message opens the thread;
 * everything after it (results, sheet, cart, checkout, tracking) happens in the same thread.
 */
export function Home() {
  const api = useConversation(params.get('stage') ?? 'dinner-rain')
  const { state, home } = api
  const end = useRef<HTMLDivElement>(null)
  const talked = state.thread.some(m => m.type === 'user')

  // Follow the conversation, but leave the opening screen where it starts.
  useEffect(() => {
    if (state.thread.length > 1 || state.working) end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [state.thread, state.working])

  const render = (m: Msg) => {
    switch (m.type) {
      case 'home':
        return (
          <motion.section key={m.id} initial="hidden" animate="shown" variants={{ hidden: {}, shown: { transition: { staggerChildren: stagger * 3 } } }} className="grid gap-3">
            <HunchSays>{home.line}</HunchSays>
            <RuleChips rules={home.rules} onOff={api.ruleOff} />
            {home.ask && (
              <Emerge>
                <AskCard ask={home.ask} onAnswer={yes => api.answerAsk(home.ask!, yes)} />
              </Emerge>
            )}
            {home.tracking && (
              <Emerge>
                <TrackingCard t={home.tracking} step={2} />
              </Emerge>
            )}
            {home.usual && (
              <Emerge>
                <UsualCard s={home.usual} onOpen={api.openSheet} onOrder={api.orderAgain} />
              </Emerge>
            )}
            {home.groups.map(g => (
              <Emerge key={g.id} className="mt-2">
                <DishRow title={g.title} items={g.items} onOpen={api.openSheet} />
              </Emerge>
            ))}
          </motion.section>
        )
      case 'user':
        return <UserSays key={m.id}>{m.text}</UserSays>
      case 'hunch':
        return <HunchSays key={m.id}>{m.text}</HunchSays>
      case 'results':
        return (
          <div key={m.id} className="grid gap-3">
            <HunchSays>{m.text}</HunchSays>
            {m.items.length > 0 && (
              <Emerge>
                <DishRow items={m.items} onOpen={api.openSheet} />
              </Emerge>
            )}
          </div>
        )
      case 'plan':
        return (
          <div key={m.id} className="grid gap-3">
            <HunchSays>{m.text}</HunchSays>
            {m.plan.lines.length > 0 && (
              <Emerge>
                <PlanCard plan={m.plan} ordered={m.ordered} onOrder={() => api.orderPlan(m.id)} onChange={api.changePlan} />
              </Emerge>
            )}
          </div>
        )
      case 'checkout':
        return (
          <Emerge key={m.id}>
            <CheckoutCard lines={m.lines} status={m.status} onPay={() => api.pay(m.id)} onNotNow={() => api.notNow(m.id)} />
          </Emerge>
        )
      case 'tracking':
        return (
          <Emerge key={m.id}>
            <TrackingCard t={m.tracking} step={m.step} />
          </Emerge>
        )
    }
  }

  return (
    <>
      <AppShell
        className="gap-4"
        top={<TopBar mood={api.mood} status={api.status} working={!!state.working} initial={state.user.firstName[0]} />}
        bottom={
          <div className="grid gap-2.5">
            {!talked && !state.listening && (
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden">
                {home.starters.map(s => (
                  <Chip key={s} variant="filter" onClick={() => api.send(s)} className="bg-white shadow-e1 hover:bg-graphite-50">
                    {s}
                  </Chip>
                ))}
              </div>
            )}
            <AnimatePresence>{state.cart.length > 0 && !api.openCheckout && <CartPill key="cart" lines={state.cart} onView={api.viewCart} />}</AnimatePresence>
            <Composer listening={state.listening} listeningLabel="Listening…" onMicToggle={api.mic} onSubmit={api.send} disabled={!!state.working} />
          </div>
        }
      >
        {state.thread.map(render)}
        <AnimatePresence>{state.working && <Typing key="typing" />}</AnimatePresence>
        {/* scroll margin keeps the latest message clear of the message bar */}
        <div ref={end} className="h-px scroll-mb-44" />
      </AppShell>

      <DishSheet s={state.sheet} showNutrition={!!activeGoal(state.user, state.ctx)} onClose={api.closeSheet} onAdd={api.add} onNotForMe={api.notForMe} />
      {DEV && <DevPanel api={api} />}
    </>
  )
}
