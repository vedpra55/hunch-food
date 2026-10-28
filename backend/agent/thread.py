"""
The thread is one timeline on the server: the person's words, Hunch's turns, and what happened in the app
(added to cart, paid, set up). Everything the person sees is here, so a reload shows the same thing,
and the agent reads the same timeline, so it never works from a stale picture.

Cards that show live things (an order, a checkout) are stored as references and drawn from the database
every time they're read: a paid order can never show a Pay button again.
"""

from accounts.models import Person
from .models import Conversation, Message

# How much of the thread the model reads each turn.
CONTEXT_MESSAGES = 14


def current_conversation(p: Person) -> Conversation:
    c = p.conversations.filter(ended_at__isnull=True).order_by('-started_at').first()
    return c or Conversation.objects.create(person=p)


def post_event(p: Person, text: str, kind: str, components: list | None = None) -> Message:
    """Something that happened in the app. Cart changes in a row fold into one line."""
    conv = current_conversation(p)
    if kind == 'cart':
        last = conv.messages.order_by('-created_at').first()
        if last and last.role == 'event' and last.kind == 'cart':
            parts = [x for x in last.text.split(' · ') if x][-2:] + [text]
            last.text = ' · '.join(parts)
            last.save(update_fields=['text'])
            return last
    return Message.objects.create(conversation=conv, role='event', kind=kind, text=text, components=components or [])


def post_hunch(p: Person, text: str, components: list) -> Message:
    """A Hunch line the app writes without the model (checkout, the details form)."""
    return Message.objects.create(conversation=current_conversation(p), role='hunch', text=text, components=components)


def checkout_card(p: Person, method: str = 'online') -> tuple[str, dict]:
    """The step before paying, as words and a card: the details form if something's missing, else the order.
    Raises CartError (empty cart, closed kitchen, out of range) for the caller to say in plain words."""
    from orders.services import CartError, cart_view, draft_order, missing_for_checkout, order_view

    if not cart_view(p)['count']:
        raise CartError('The cart is empty.')
    missing = missing_for_checkout(p)
    if missing:
        need = {'name': 'your name', 'phone': 'a phone number for the rider', 'address': 'your block and room (or street)',
                'sign_in': 'a quick email sign-in'}
        items = [need[m] for m in missing]
        words = 'Before I place it, I need ' + (', '.join(items[:-1]) + ' and ' + items[-1] if len(items) > 1 else items[0]) + '.'
        return words, {'kind': 'collect', 'missing': missing}
    o = draft_order(p, method)
    v = order_view(o)
    return f"₹{v['total']} from {v['restaurant']}, about {v['eta_min']} min. Tap Pay when you're ready.", {'kind': 'checkout', 'order_id': str(o.id)}


# ---------- reading ----------


def hydrate(components: list, p: Person) -> list:
    """Draw reference cards from the database as they are now."""
    from orders.models import Order
    from orders.services import missing_for_checkout, order_view

    out = []
    for c in components:
        if c.get('order_id'):
            o = Order.objects.select_related('restaurant').prefetch_related('items').filter(id=c['order_id'], person=p).first()
            if not o:
                continue
            c = {**c, 'order': order_view(o)}
        elif c.get('kind') == 'collect':
            # A form filled in since shows as done (nothing missing).
            c = {**c, 'missing': missing_for_checkout(p), 'name': p.name, 'phone': p.phone}
        out.append(c)
    return out


def message_view(m: Message, p: Person) -> dict:
    return {'id': m.id, 'role': m.role, 'kind': m.kind, 'text': m.text, 'ack': m.ack, 'steps': m.steps,
            'components': hydrate(m.components, p)}


def messages_view(conv: Conversation, p: Person) -> list[dict]:
    return [message_view(m, p) for m in conv.messages.order_by('created_at')]


def profile_view(p: Person) -> dict:
    return {
        'id': str(p.id), 'name': p.name, 'email': p.email, 'phone': p.phone, 'signed_in': p.signed_in, 'diet': p.diet,
        'allergies': p.allergies, 'spice': p.spice, 'budget': p.budget, 'veg_days': p.veg_days, 'goal': p.goal,
        'onboarded': p.onboarded, 'use_weather': p.use_weather, 'nudge_on': p.nudge_on, 'nudge_at': str(p.nudge_at)[:5],
    }


# ---------- what the model reads ----------


def _shown(components: list) -> str:
    """A one-line note of what a turn put on screen, with ids so "the first one" can be resolved."""
    bits = []
    for c in components:
        k = c.get('kind')
        if k == 'dishes':
            bits.append('dishes: ' + '; '.join(f"{d['name']} from {d['restaurant']} ₹{d['price']} [{d['id']}]" for d in c.get('items', [])))
        elif k == 'restaurants':
            bits.append('kitchens: ' + '; '.join(f"{r['name']} [{r['id']}]" for r in c.get('items', [])))
        elif k == 'menu':
            bits.append(f"menu of {c['restaurant']['name']} [{c['restaurant']['id']}]")
        elif k == 'choices':
            bits.append(f"choices: {' / '.join(c.get('options', []))}")
        elif k in ('checkout', 'order', 'collect'):
            bits.append(f'{k} card')
    return f" (shown: {' | '.join(bits)})" if bits else ''


def transcript(conv: Conversation) -> list[dict]:
    """The recent thread as model input: their words, Hunch's words (with what it showed), and app events."""
    recent = list(conv.messages.order_by('-created_at')[:CONTEXT_MESSAGES])[::-1]
    items = []
    for m in recent:
        if m.role == 'user':
            items.append({'role': 'user', 'content': m.text})
        elif m.role == 'hunch':
            said = ' '.join(x for x in (m.ack, m.text) if x).strip() or '(no words)'
            items.append({'role': 'assistant', 'content': said + _shown(m.components)})
        else:
            items.append({'role': 'developer', 'content': f'[In the app, not said by anyone] {m.text}'})
    return items
