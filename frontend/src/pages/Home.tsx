import { AnimatePresence } from 'motion/react'
import { useEffect, useRef } from 'react'
import { useConversation, type Msg } from '../chat/useConversation'
import { Emerge, Turn, Typing, UserSays } from '../components/chat/Bubbles'
import { CartPill, CheckoutCard, PlanCard, ReplyCard, TrackingCard } from '../components/chat/Cards'
import { TodayCard } from '../components/chat/TodayCard'
import { skyFor } from '../design/sky'
import { DishSheet } from '../components/chat/DishSheet'
import { AddressSheet } from '../components/chat/AddressSheet'
import { AddRow, OptionsSheet } from '../components/chat/BottomSheet'
import { NudgeBanner } from '../components/chat/NudgeBanner'
import { OnboardingCard } from '../components/chat/OnboardingCard'
import { ProfilePanel } from '../components/chat/ProfilePanel'
import { TodaySheet } from '../components/chat/TodaySheet'
import { TopBar } from '../components/chat/TopBar'
import { AppShell } from '../components/layout/AppShell'
import { Composer } from '../components/ui/Composer'
import { addressIcon, findAddress, PAYMENTS, paymentById } from '../data/account'
import { ONBOARD, PROFILE } from '../domain/copy'
import { delivery } from '../domain/orders'
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
  const address = findAddress(state.addresses, state.addressId)
  const payment = paymentById(state.paymentId)
  // Only the newest thing Hunch said carries its live mood.
  const lastVoice = [...state.thread].reverse().find(m => (m.type === 'hunch' || m.type === 'results' || m.type === 'plan' || m.type === 'tracking') && 'text' in m && m.text)?.id
  const orderActions = { onAskCancel: api.askCancel, onCancel: api.cancel, onRate: api.rate }

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
              sky={skyFor(state.ctx.now, state.ctx.weather, state.user.useWeather !== false)}
              skyMode={state.sky}
              order={home.tracking ? state.orders.live : undefined}
              orderActions={orderActions}
              onOpen={api.openSheet}
              onOrder={api.orderAgain}
              onPrompt={p => api.send(p.text)}
              onContext={api.openToday}
              onAnswer={api.answerAsk}
              onSchedule={api.scheduleNudge}
              onNotTonight={api.dismissNudge}
            />
          </Emerge>
        )
      case 'onboarding':
        return (
          <Emerge key={m.id}>
            <OnboardingCard name={state.user.firstName} summary={m.summary} onDone={api.finishOnboarding} />
          </Emerge>
        )
      case 'user':
        return <UserSays key={m.id}>{m.text}</UserSays>
      case 'hunch':
        return <Turn key={m.id} text={m.text} mood={m.id === lastVoice ? api.mood : 'idle'} mascot={state.mascot} />
      case 'results':
        return (
          <Turn key={m.id} text={m.text} mood={m.id === lastVoice ? api.mood : 'idle'} mascot={state.mascot}>
            <ReplyCard items={m.items} refine={m.refine} onOpen={api.openSheet} onRefine={p => api.refine(m.id, p)} />
          </Turn>
        )
      case 'plan':
        return (
          <Turn key={m.id} text={m.text} mood={m.id === lastVoice ? api.mood : 'idle'} mascot={state.mascot}>
            <PlanCard plan={m.plan} ordered={m.ordered} onOrder={() => api.orderPlan(m.id)} onChange={api.changePlan} />
          </Turn>
        )
      case 'checkout':
        return (
          <Emerge key={m.id}>
            <CheckoutCard
              lines={m.lines}
              status={m.status}
              deal={m.deal}
              saved={m.saved}
              error={m.error}
              scheduleAt={m.scheduleAt}
              justOnce={state.justOnce}
              address={address}
              payment={payment}
              onQty={api.changeQty}
              onSwitch={() => api.switchDeal(m.id)}
              onKeep={() => api.keepDeal(m.id)}
              onAddress={() => api.openPicker('address')}
              onPayment={() => api.openPicker('payment')}
              onPay={() => api.pay(m.id)}
              onNotNow={() => api.notNow(m.id)}
            />
          </Emerge>
        )
      case 'tracking': {
        const o = state.orders[m.orderId]
        return (
          <Turn key={m.id} text={o.status === 'cancelled' ? undefined : m.text} mood={m.id === lastVoice ? api.mood : 'idle'} mascot={state.mascot}>
            <TrackingCard order={o} actions={orderActions} />
          </Turn>
        )
      }
    }
  }

  return (
    <>
      <AppShell
        // Until the conversation starts, the Today card sits in the middle of the screen.
        className={cn('gap-6', !talked && 'justify-center pb-16')}
        top={<TopBar mood={api.mood} status={api.status} working={!!state.working} initial={state.user.firstName[0]} onProfile={api.openProfile} />}
        bottom={
          <div className="grid gap-2.5">
            <AnimatePresence>{state.cart.length > 0 && !api.openCheckout && <CartPill key="cart" lines={state.cart} onView={api.viewCart} />}</AnimatePresence>
            <Composer listening={state.listening} listeningLabel="Listening…" onMicToggle={api.mic} onSubmit={t => api.send(t)} disabled={!!state.working} />
          </div>
        }
      >
        {state.thread.map(render)}
        <AnimatePresence>{state.working && <Typing key="typing" mascot={state.mascot} />}</AnimatePresence>
        {/* scroll margin keeps the latest card clear of the message bar */}
        <div ref={end} className="h-px scroll-mb-44" />
      </AppShell>

      <DishSheet s={state.sheet} showNutrition={!!activeGoal(state.user, state.ctx)} onClose={api.closeSheet} onAdd={api.add} onNotForMe={api.notForMe} />
      <TodaySheet open={state.picker === 'today'} rules={api.todayRules} onToggle={api.toggleRule} onClose={api.closePicker} />
      <OptionsSheet
        open={state.picker === 'address'}
        title="Deliver to"
        selected={state.addressId}
        options={state.addresses.map(a => {
          const out = delivery(state.cart, a).unreachable[0]
          return { id: a.id, icon: addressIcon(a), label: a.label, detail: a.line, warning: out ? `${out.name} doesn't deliver here` : undefined }
        })}
        onPick={api.chooseAddress}
        onClose={api.closePicker}
        footer={<AddRow label="Add address" onClick={() => api.openPicker('addAddress')} />}
      />
      <AddressSheet open={state.picker === 'addAddress'} taken={state.addresses.map(a => a.label)} onSave={api.addAddress} onClose={api.closePicker} />
      <OptionsSheet
        open={state.picker === 'diet'}
        title="What do you eat?"
        selected={state.user.diet}
        options={ONBOARD.diets.map(d => ({ id: d.id, label: d.label }))}
        onPick={id => {
          api.updateUser(() => ({ diet: id as typeof state.user.diet }))
          api.closePicker()
        }}
        onClose={api.closePicker}
      />
      <OptionsSheet
        open={state.picker === 'goal'}
        title="Working towards"
        note="Goals end on their own after 30 days."
        selected={state.user.goal?.kind ?? 'none'}
        options={[...ONBOARD.goals.map(g => ({ id: g.id, label: PROFILE.goalLabel[g.id] })), { id: 'none', label: 'No goal' }]}
        onPick={id => {
          api.setGoal(id === 'none' ? undefined : (id as NonNullable<typeof state.user.goal>['kind']))
          api.closePicker()
        }}
        onClose={api.closePicker}
      />
      <OptionsSheet
        open={state.picker === 'payment'}
        title="Pay with"
        selected={state.paymentId}
        options={PAYMENTS.map(p => ({ id: p.id, icon: p.icon, label: p.label, detail: p.detail }))}
        onPick={api.choosePayment}
        onClose={api.closePicker}
      />
      <ProfilePanel api={api} />
      <NudgeBanner text={state.banner} onDismiss={api.dismissBanner} />
      {DEV && <DevPanel api={api} />}
    </>
  )
}
