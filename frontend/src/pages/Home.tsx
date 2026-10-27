import { AnimatePresence } from 'motion/react'
import { useEffect, useRef } from 'react'
import { useConversation, type Msg } from '../chat/useConversation'
import { Emerge, HunchSays, Typing, UserSays } from '../components/chat/Bubbles'
import { CartPill, CheckoutCard, PlanCard, ReplyCard, TodayCard, TrackingCard } from '../components/chat/Cards'
import { DishSheet } from '../components/chat/DishSheet'
import { TodaySheet } from '../components/chat/TodaySheet'
import { TopBar } from '../components/chat/TopBar'
import { AppShell } from '../components/layout/AppShell'
import { Composer } from '../components/ui/Composer'
import { activeGoal } from '../domain/rules'
import { DevPanel } from '../dev/DevPanel'
import { cn } from '../lib/cn'

const params = new URLSearchParams(location.search)
const DEV = import.meta.env.DEV || params.has('dev')

/**
 * Home is the conversation. It opens with one Today card; every Hunch turn after it is one card
 * (HOME_SPEC §2).
 */
export function Home() {
  const api = useConversation(params.get('stage') ?? 'dinner-rain')
  const { state, home } = api
  const end = useRef<HTMLDivElement>(null)
  const talked = state.thread.some(m => m.type === 'user')

  // Follow the conversation, but leave the opening card where it is.
  useEffect(() => {
    if (state.thread.length > 1 || state.working) end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [state.thread, state.working])

  const render = (m: Msg) => {
    switch (m.type) {
      case 'home':
        return (
          <Emerge key={m.id}>
            <TodayCard
              home={home}
              onOpen={api.openSheet}
              onOrder={api.orderAgain}
              onPrompt={p => api.send(p.text)}
              onContext={api.openToday}
              onAnswer={api.answerAsk}
            />
          </Emerge>
        )
      case 'user':
        return <UserSays key={m.id}>{m.text}</UserSays>
      case 'hunch':
        return <HunchSays key={m.id}>{m.text}</HunchSays>
      case 'results':
        return (
          <Emerge key={m.id}>
            <ReplyCard text={m.text} items={m.items} refine={m.refine} onOpen={api.openSheet} onRefine={p => api.refine(m.id, p)} />
          </Emerge>
        )
      case 'plan':
        return (
          <Emerge key={m.id}>
            <PlanCard text={m.text} plan={m.plan} ordered={m.ordered} onOrder={() => api.orderPlan(m.id)} onChange={api.changePlan} />
          </Emerge>
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
            <TrackingCard text={m.text} t={m.tracking} step={m.step} />
          </Emerge>
        )
    }
  }

  return (
    <>
      <AppShell
        // Until the conversation starts, the Today card sits in the middle of the screen.
        className={cn('gap-4', !talked && 'justify-center pb-16')}
        top={<TopBar mood={api.mood} status={api.status} working={!!state.working} initial={state.user.firstName[0]} />}
        bottom={
          <div className="grid gap-2.5">
            <AnimatePresence>{state.cart.length > 0 && !api.openCheckout && <CartPill key="cart" lines={state.cart} onView={api.viewCart} />}</AnimatePresence>
            <Composer listening={state.listening} listeningLabel="Listening…" onMicToggle={api.mic} onSubmit={t => api.send(t)} disabled={!!state.working} />
          </div>
        }
      >
        {state.thread.map(render)}
        <AnimatePresence>{state.working && <Typing key="typing" />}</AnimatePresence>
        {/* scroll margin keeps the latest card clear of the message bar */}
        <div ref={end} className="h-px scroll-mb-44" />
      </AppShell>

      <DishSheet s={state.sheet} showNutrition={!!activeGoal(state.user, state.ctx)} onClose={api.closeSheet} onAdd={api.add} onNotForMe={api.notForMe} />
      <TodaySheet open={state.today} rules={api.todayRules} onToggle={api.toggleRule} onClose={api.closeToday} />
      {DEV && <DevPanel api={api} />}
    </>
  )
}
