"""The Today card, computed without the model: instant, free, and the same rules as search."""

from django.utils import timezone

from accounts.models import Person
from catalog.search import search_dishes, where
from catalog.services import veg_day_today
from orders.models import Order
from orders.services import cart_view, order_view
from .prompt import meal_now

PROMPTS = {
    'breakfast': ['Aloo paratha, quick', 'Just chai', 'Surprise me'],
    'lunch': ['Thali under ₹150', 'Something light', 'Best offers near me'],
    'snack': ['Momos', 'A thick shake', 'Chaat'],
    'dinner': ['Butter chicken', 'Something warm under ₹200', 'Best offers near me'],
    'late': ['Maggi at this hour', 'Open late near me', 'Something sweet'],
}
GREETING = {'breakfast': 'Morning', 'lunch': 'Afternoon', 'snack': 'Evening', 'dinner': 'Evening', 'late': 'Still up'}


def home(p: Person) -> dict:
    now = timezone.localtime()
    meal = meal_now(now.hour)
    place = where(p)
    cart = cart_view(p)
    live = p.orders.filter(status=Order.PLACED).order_by('-placed_at').first()
    live_view = order_view(live) if live else None
    if live_view and live_view['stage'] == 'delivered':
        live_view = None

    pick, usual = None, False
    if not live_view:
        hits = search_dishes(p, '', meal=meal, limit=12)
        ordered = [h for h in hits if h.times and h.open]
        best = ordered[0] if ordered else next((h for h in hits if h.open), None)
        if best:
            pick, usual = best.card(), bool(best.times)

    hello = f"{GREETING[meal]}, {p.name}." if p.name else f'{GREETING[meal]}.'
    if live_view:
        line = f"On its way from {live_view['restaurant']}."
    elif cart['count']:
        line = f"Your {cart['restaurant']} cart is waiting."
    elif pick and usual:
        line = f"Your usual from {pick['restaurant']}?"
    elif not p.onboarded:
        line = "Tell me what you're craving. I'll handle the rest."
    else:
        line = {'breakfast': 'Breakfast before class?', 'lunch': 'Lunch in under 30 min?', 'snack': 'Snack break?',
                'dinner': "What's for dinner?", 'late': 'These are still open.'}[meal]

    context = [{'icon': 'sun' if 6 <= now.hour < 18 else 'moon', 'text': now.strftime('%-I:%M %p').lower()}, {'icon': 'pin', 'text': place.label}]
    if veg_day_today(p):
        context.append({'icon': 'leaf', 'text': 'Veg day', 'rule': 'vegDay'})
    return {'hello': hello, 'line': line, 'meal': meal, 'context': context, 'pick': pick, 'usual': usual,
            'prompts': PROMPTS[meal], 'order': live_view, 'cart': cart}
