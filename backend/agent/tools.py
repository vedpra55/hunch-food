"""
The agent's hands. Each tool: a strict JSON schema the model fills, a plain-language step label the
person sees while it runs, and an executor that enforces the rules in code (never in the prompt).
Display tools end the turn: what the model said plus what it shows is the answer.
"""

import json
from dataclasses import dataclass, field
from typing import Any, Callable

from accounts.models import Person
from catalog.models import Restaurant
from catalog.search import Hit, restaurant_menu, search_dishes, search_restaurants, where
from catalog.services import is_open, opens_label
from orders import services as orders
from orders.models import Order
from . import memory


def _s(desc: str, nullable: bool = False) -> dict:
    return {'type': ['string', 'null'] if nullable else 'string', 'description': desc}


def _i(desc: str) -> dict:
    return {'type': ['integer', 'null'], 'description': desc}


def _b(desc: str) -> dict:
    return {'type': ['boolean', 'null'], 'description': desc}


def _arr(items: dict, desc: str, nullable: bool = False) -> dict:
    return {'type': ['array', 'null'] if nullable else 'array', 'items': items, 'description': desc}


def fn(name: str, description: str, props: dict) -> dict:
    return {
        'type': 'function',
        'name': name,
        'description': description,
        'strict': True,
        'parameters': {'type': 'object', 'properties': props, 'required': list(props), 'additionalProperties': False},
    }


TOOLS = [
    fn('search_food', 'Find dishes the person can eat, delivered where they are. Filters their diet, allergies and veg day automatically. Returns ranked dishes with reasons and offers.', {
        'query': _s('What they want in plain words: a dish, cuisine, mood or craving. Empty string for "anything good".'),
        'max_price': _i('Highest price per dish in rupees, if they gave a budget.'),
        'veg_only': _b('Only vegetarian dishes.'),
        'with_offer': _b('Only dishes with an offer running now.'),
        'restaurant_id': _s('Limit to one kitchen (its id).', nullable=True),
        'min_protein': _i('Minimum grams of protein, for gym or protein goals.'),
    }),
    fn('find_restaurants', 'Find kitchens by name or cuisine ("Haveli", "momos place", "best dhaba"). Returns kitchens with rating, distance, whether they deliver here, and top dishes.', {
        'query': _s('Name or cuisine.'),
    }),
    fn('get_menu', "Read one kitchen's full menu (only dishes this person can eat).", {
        'restaurant_id': _s("The kitchen's id."),
    }),
    fn('get_history', "The person's recent orders, newest first.", {
        'limit': _i('How many, default 5.'),
    }),
    fn('update_cart', 'Change the cart. qty is the new quantity for that dish; 0 removes it. One kitchen per cart.', {
        'changes': _arr({'type': 'object', 'properties': {'dish_id': _s('Dish id from a tool result.'), 'qty': {'type': 'integer'}, 'note': _s('Short note for the kitchen, e.g. "less spicy".', nullable=True)},
                         'required': ['dish_id', 'qty', 'note'], 'additionalProperties': False}, 'The changes.'),
        'clear_first': _b('Empty the cart before applying the changes (to switch kitchens).'),
    }),
    fn('save_profile', 'Save lasting facts the person stated about themselves. Only the fields they actually told you; null for the rest.', {
        'name': _s('What to call them.', nullable=True),
        'diet': {'type': ['string', 'null'], 'enum': ['nonveg', 'eggetarian', 'veg', 'jain', 'vegan', None], 'description': 'What they eat.'},
        'allergies': _arr({'type': 'string', 'enum': ['dairy', 'gluten', 'nuts', 'egg', 'soy']}, 'Full list of allergies.', nullable=True),
        'spice': _i('0 mild, 1 medium, 2 hot, 3 very hot.'),
        'budget': _i('Usual spend per meal in rupees.'),
        'veg_days': _arr({'type': 'integer'}, 'Weekdays they eat only veg, 0 = Monday … 6 = Sunday. Full list.', nullable=True),
        'phone': _s('10-digit mobile number they gave.', nullable=True),
        'onboarded': _b('True once onboarding questions are done.'),
    }),
    fn('set_location', 'Set where they are, as their delivery place. Use when they say where they are (campus, Law Gate, a city area).', {
        'area_id': {'type': 'string', 'enum': ['lpu-bh', 'lpu-gh', 'lpu-unimall', 'law-gate', 'chaheru', 'maheru', 'phg-gt-road', 'phg-banga-road', 'phg-hargobind',
                                               'jal-model-town', 'jal-rama-mandi', 'jal-bmc', 'jal-urban-estate', 'jal-cantt'],
                    'description': 'lpu-bh boys hostels, lpu-gh girls hostels, lpu-unimall Uni Mall / Block 34, law-gate, chaheru, maheru, phg-* Phagwara, jal-* Jalandhar.'},
        'detail': _s('Block, room, building or street if they said it, e.g. "BH-4, Room 212".', nullable=True),
    }),
    fn('remember', 'Note a lasting taste, habit or preference in their words (not rules like diet; use save_profile for those).', {
        'fact': _s('Short, third person: "Hates coriander", "Orders after the 9 pm lab".'),
    }),
    fn('show_dishes', 'Show dishes as cards under your message. The pick first. Ends your turn.', {
        'dish_ids': _arr({'type': 'string'}, '2–6 dish ids from search results, best first.'),
    }),
    fn('show_restaurants', 'Show kitchens as cards under your message. Ends your turn.', {
        'restaurant_ids': _arr({'type': 'string'}, '1–4 kitchen ids.'),
    }),
    fn('show_menu', "Show one kitchen's menu so they can browse. Ends your turn.", {
        'restaurant_id': _s("The kitchen's id."),
    }),
    fn('checkout', 'Prepare the order from the cart. If name, phone, address or sign-in is missing, shows a form for it instead. Never takes money. Ends your turn.', {
        'method': {'type': 'string', 'enum': ['online', 'cod'], 'description': 'online (UPI/card) unless they asked for cash on delivery.'},
    }),
    fn('ask_choice', 'Ask one question with tappable options. Ends your turn.', {
        'question': _s('The question, short.'),
        'options': _arr({'type': 'string'}, '2–6 short options.'),
        'multi': _b('Let them pick several.'),
    }),
    fn('order_status', 'Show their live or latest order with tracking (cancel lives on that card), then tell them the stage and time.', {}),
]

# These end the turn: their words + the card are the answer. order_status shows a card but the model
# still speaks after it, with the actual stage and time.
DISPLAY = {'show_dishes', 'show_restaurants', 'show_menu', 'checkout', 'ask_choice'}


@dataclass
class Result:
    output: Any
    component: dict | None = None
    summary: str = ''
    events: list[dict] = field(default_factory=list)


class Toolbox:
    """Runs tools for one person during one turn, remembering what it found so display tools can show it."""

    def __init__(self, person: Person):
        self.p = person
        self.cards: dict[str, dict] = {}
        self.restaurants: dict[str, dict] = {}

    # ---------- labels ----------

    def label(self, name: str, a: dict) -> str | None:
        place = where(self.p).label
        if name == 'search_food':
            bits = [f"Searching kitchens near {place}"]
            if a.get('query'):
                bits.append(f"for {a['query']}")
            if a.get('max_price'):
                bits.append(f"under ₹{a['max_price']}")
            if a.get('with_offer'):
                bits.append('with offers')
            return ' '.join(bits)
        if name == 'find_restaurants':
            return f"Looking up {a.get('query') or 'kitchens'}"
        if name == 'get_menu':
            r = Restaurant.objects.filter(slug=a.get('restaurant_id')).first()
            return f"Reading {r.name if r else 'the'} menu"
        if name == 'get_history':
            return 'Checking your past orders'
        if name == 'update_cart':
            return 'Updating your cart'
        if name == 'save_profile':
            return 'Saving that'
        if name == 'remember':
            return 'Noting that'
        if name == 'set_location':
            return 'Setting where you are'
        if name == 'checkout':
            return 'Checking name, phone and address'
        if name == 'order_status':
            return 'Checking your order'
        return None  # display tools run silently

    # ---------- run ----------

    def run(self, name: str, args: dict) -> Result:
        handler: Callable[[dict], Result] | None = getattr(self, f't_{name}', None)
        if not handler:
            return Result({'error': f'unknown tool {name}'})
        try:
            return handler(args)
        except orders.CartError as e:
            return Result({'error': str(e)}, summary=str(e))

    def _remember_hits(self, hits: list[Hit]) -> list[dict]:
        out = []
        for h in hits:
            c = h.card()
            self.cards[c['id']] = c
            out.append({k: c[k] for k in ('id', 'name', 'restaurant', 'restaurant_id', 'price', 'eta_min', 'open', 'opens', 'rating', 'offer', 'times_ordered', 'reasons', 'kcal', 'protein_g', 'diet')})
        return out

    def t_search_food(self, a: dict) -> Result:
        hits = search_dishes(
            self.p, a.get('query') or '', max_price=a.get('max_price'), veg_only=bool(a.get('veg_only')),
            with_offer=bool(a.get('with_offer')), restaurant=a.get('restaurant_id'), min_protein=a.get('min_protein'), limit=8,
        )
        found = self._remember_hits(hits)
        offers = sum(1 for h in hits if h.offer)
        summary = f"Found {len(found)}" + (f" · {offers} with offers" if offers else '') if found else 'Nothing matched'
        return Result({'dishes': found} if found else {'dishes': [], 'note': 'Nothing matched. Try relaxing one filter.'}, summary=summary)

    def t_find_restaurants(self, a: dict) -> Result:
        rows = search_restaurants(self.p, a.get('query') or '')
        for r in rows:
            self.restaurants[r['id']] = r
        slim = [{k: r[k] for k in ('id', 'name', 'cuisines', 'area', 'rating', 'distance_km', 'delivers_here', 'eta_min', 'open', 'opens', 'offer')} | {'top': [d['name'] for d in r['top_dishes']]} for r in rows]
        return Result({'restaurants': slim}, summary=f'Found {len(rows)} kitchens')

    def t_get_menu(self, a: dict) -> Result:
        m = restaurant_menu(self.p, a.get('restaurant_id') or '')
        if not m:
            return Result({'error': 'No such kitchen.'}, summary='Not found')
        slim = {**{k: m[k] for k in ('id', 'name', 'delivers_here', 'eta_min', 'open', 'opens', 'offers')},
                'menu': [{'category': c['name'], 'dishes': [{'id': d['id'], 'name': d['name'], 'price': d['price'], 'diet': d['diet'], 'offer': d['offer']} for d in c['dishes']]} for c in m['categories']]}
        return Result(slim, summary=f"{sum(len(c['dishes']) for c in m['categories'])} dishes")

    def t_get_history(self, a: dict) -> Result:
        rows = self.p.orders.filter(status=Order.PLACED).order_by('-placed_at')[: a.get('limit') or 5]
        out = [{'order_id': str(o.id), 'restaurant': o.restaurant.name, 'when': o.placed_at.strftime('%-d %b'), 'total': o.total,
                'items': [{'dish_id': i.dish.slug, 'name': i.name, 'qty': i.qty} for i in o.items.select_related('dish')]} for o in rows]
        return Result({'orders': out}, summary=f'{len(out)} past orders' if out else 'No past orders yet')

    def t_update_cart(self, a: dict) -> Result:
        if a.get('clear_first'):
            orders.clear(self.p)
        errors = []
        for c in a.get('changes') or []:
            try:
                orders.set_qty(self.p, c['dish_id'], c['qty'], c.get('note') or '')
            except orders.CartError as e:
                errors.append(str(e))
        cart = orders.cart_view(self.p)
        if cart['count']:
            r = Restaurant.objects.get(name=cart['restaurant'])
            if not is_open(r):
                errors.append(f'Heads up: {r.name} is closed right now ({opens_label(r)}). It can only be ordered once it opens.')
        out = {'cart': {k: cart[k] for k in ('restaurant', 'count', 'item_total', 'discount', 'delivery_fee', 'total', 'offer_label')} | {'lines': [{'id': l['id'], 'name': l['name'], 'qty': l['qty']} for l in cart['lines']]}}
        if errors:
            out['errors'] = errors
        summary = errors[0] if errors and not cart['count'] else f"{cart['count']} in cart · ₹{cart['total']}"
        return Result(out, summary=summary, events=[{'type': 'cart', 'cart': cart}])

    def t_save_profile(self, a: dict) -> Result:
        p = self.p
        saved = []
        if a.get('name'):
            p.name = a['name'].strip()[:60]
            saved.append('name')
        if a.get('diet'):
            p.diet = a['diet']
            saved.append('diet')
        if a.get('allergies') is not None:
            p.allergies = sorted(set(a['allergies']))
            saved.append('allergies')
        if a.get('spice') is not None:
            p.spice = max(0, min(3, a['spice']))
            saved.append('spice')
        if a.get('budget'):
            p.budget = a['budget']
            saved.append('budget')
        if a.get('veg_days') is not None:
            p.veg_days = sorted({d for d in a['veg_days'] if 0 <= d <= 6})
            saved.append('veg days')
        if a.get('phone'):
            digits = ''.join(ch for ch in a['phone'] if ch.isdigit())[-10:]
            if len(digits) == 10:
                p.phone = digits
                saved.append('phone')
        if a.get('onboarded'):
            p.onboarded = True
        p.save()
        return Result({'saved': saved}, summary='Saved ' + ', '.join(saved) if saved else 'Saved', events=[{'type': 'profile', 'profile': profile_view(p)}])

    def t_set_location(self, a: dict) -> Result:
        from accounts.models import Address
        from catalog.models import Area

        area = Area.objects.filter(slug=a.get('area_id')).first()
        if not area:
            return Result({'error': 'Unknown area'}, summary='Unknown area')
        detail = (a.get('detail') or '').strip()
        self.p.addresses.update(is_default=False)
        addr = self.p.addresses.filter(area=area).first() or Address(person=self.p, area=area, lat=area.lat, lng=area.lng)
        addr.label = 'Hostel' if area.campus else area.name.split(',')[0]
        addr.line = detail or addr.line or area.name
        addr.handoff = 'Gate 1' if area.campus else ''
        addr.is_default = True
        addr.save()
        return Result({'delivering_to': area.name, 'has_detail': bool(detail or addr.line != area.name)}, summary=f'Delivering to {area.name}',
                      events=[{'type': 'profile', 'profile': profile_view(self.p)}])

    def t_remember(self, a: dict) -> Result:
        memory.note(str(self.p.id), a['fact'])
        return Result({'ok': True}, summary='Noted')

    # ---------- display (end the turn) ----------

    def t_show_dishes(self, a: dict) -> Result:
        ids = [i for i in a.get('dish_ids') or [] if i]
        missing = [i for i in ids if i not in self.cards]
        if missing:
            # Shown without searching this turn (e.g. from the menu): rank them for this person.
            for h in search_dishes(self.p, '', limit=60):
                if h.dish.slug in missing:
                    self.cards[h.dish.slug] = h.card()
        items = [self.cards[i] for i in ids if i in self.cards]
        return Result({'shown': len(items)}, component={'kind': 'dishes', 'items': items} if items else None)

    def t_show_restaurants(self, a: dict) -> Result:
        ids = a.get('restaurant_ids') or []
        if any(i not in self.restaurants for i in ids):
            for r in search_restaurants(self.p, '', limit=40):
                self.restaurants.setdefault(r['id'], r)
        items = [self.restaurants[i] for i in ids if i in self.restaurants]
        return Result({'shown': len(items)}, component={'kind': 'restaurants', 'items': items} if items else None)

    def t_show_menu(self, a: dict) -> Result:
        m = restaurant_menu(self.p, a.get('restaurant_id') or '')
        return Result({'shown': bool(m)}, component={'kind': 'menu', 'restaurant': m} if m else None)

    def t_checkout(self, a: dict) -> Result:
        missing = orders.missing_for_checkout(self.p)
        cart = orders.cart_view(self.p)
        if not cart['count']:
            return Result({'error': 'The cart is empty.'}, summary='Cart is empty')
        if missing:
            return Result({'needs': missing}, component={'kind': 'collect', 'missing': missing, 'name': self.p.name, 'phone': self.p.phone},
                          summary='Need ' + ', '.join(m.replace('_', ' ') for m in missing))
        o = orders.draft_order(self.p, a.get('method') or 'online')
        view = orders.order_view(o)
        return Result({'order_id': view['id'], 'total': view['total'], 'eta_min': view['eta_min'], 'address': view['address']},
                      component={'kind': 'checkout', 'order': view}, summary=f"Ready · ₹{view['total']}")

    def t_ask_choice(self, a: dict) -> Result:
        return Result({'asked': True}, component={'kind': 'choices', 'question': a['question'], 'options': (a.get('options') or [])[:6], 'multi': bool(a.get('multi'))})

    def t_order_status(self, a: dict) -> Result:
        o = self.p.orders.filter(status__in=[Order.PLACED, Order.CANCELLED]).order_by('-created_at').first()
        if not o:
            return Result({'error': 'No orders yet.'}, summary='No orders yet')
        view = orders.order_view(o)
        return Result({'stage': view['stage'], 'eta_left': view['eta_left'], 'arrives_at': view.get('arrives_at'), 'restaurant': view['restaurant'], 'refund_id': view['refund_id']},
                      component={'kind': 'order', 'order': view}, summary=view['stage'].replace('_', ' '))


def profile_view(p: Person) -> dict:
    return {
        'id': str(p.id), 'name': p.name, 'email': p.email, 'phone': p.phone, 'signed_in': p.signed_in, 'diet': p.diet,
        'allergies': p.allergies, 'spice': p.spice, 'budget': p.budget, 'veg_days': p.veg_days, 'goal': p.goal,
        'onboarded': p.onboarded, 'use_weather': p.use_weather, 'nudge_on': p.nudge_on, 'nudge_at': str(p.nudge_at)[:5],
    }


def dumps(x: Any) -> str:
    return json.dumps(x, ensure_ascii=False, separators=(',', ':'), default=str)
