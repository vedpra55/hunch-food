import { AnimatePresence } from 'motion/react'
import { useEffect, useRef } from 'react'
import { useConversation, type Msg } from '../chat/useConversation'
import { Emerge, HunchSays, Typing, UserSays } from '../components/chat/Bubbles'
import { CartPill, CheckoutCard, PlanCard, ReplyCard, TodayCard, TrackingCard } from '../components/chat/Cards'
import { DishSheet } from '../components/chat/DishSheet'
import { OptionsSheet } from '../components/chat/BottomSheet'
import { TodaySheet } from '../components/chat/TodaySheet'
import { TopBar } from '../components/chat/TopBar'
import { AppShell } from '../components/layout/AppShell'
import { Composer } from '../components/ui/Composer'
import { ADDRESSES, addressById, PAYMENTS, paymentById } from '../data/account'
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
  const address = addressById(state.addressId)
  const payment = paymentById(state.paymentId)
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
              order={home.tracking ? state.orders.live : undefined}
              orderActions={orderActions}
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
            <CheckoutCard
              lines={m.lines}
              status={m.status}
              deal={m.deal}
              saved={m.saved}
              error={m.error}
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
      case 'tracking':
        return (
          <Emerge key={m.id}>
            <TrackingCard text={m.text} order={state.orders[m.orderId]} actions={orderActions} />
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
      <TodaySheet open={state.picker === 'today'} rules={api.todayRules} onToggle={api.toggleRule} onClose={api.closePicker} />
      <OptionsSheet
        open={state.picker === 'address'}
        title="Deliver to"
        selected={state.addressId}
        options={ADDRESSES.map(a => {
          const out = delivery(state.cart, a).unreachable[0]
          return { id: a.id, icon: a.id === 'work' ? 'briefcase' : 'home', label: a.label, detail: a.line, warning: out ? `${out.name} doesn't deliver here` : undefined }
        })}
        onPick={api.chooseAddress}
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
      {DEV && <DevPanel api={api} />}
    </>
  )
}
