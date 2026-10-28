"""
The agent's hands. Each tool: a strict JSON schema the model fills, a plain-language step label the
person sees while it runs, and an executor that enforces the rules in code (never in the prompt).
`reply` is the answer: words plus at most one card, checked here before the person sees it.
"""

import json
from dataclasses import dataclass, field
from typing import Any, Callable

from accounts.models import Person
from accounts.services import has_detail, note, set_location
from catalog.models import Restaurant
from catalog.search import Hit, restaurant_menu, search_dishes, search_restaurants, where
from catalog.services import is_open, opens_label
from orders import services as orders
from orders.models import Order
from orders.payments import sync_all
from .thread import checkout_card, profile_view


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
    fn('remember', 'Note a lasting taste or habit they told you, in their words (not rules like diet: use save_profile). Never note recommendations, carts, payments or times.', {
        'fact': _s('Short, third person: "Hates coriander", "Orders after the 9 pm lab".'),
    }),
    fn('order_status', 'Their live or latest order: stage, minutes left, payment state. Checks the payment with the bank first.', {}),
    fn('reply', 'Your answer to the person. Every turn ends with exactly one reply, after any tools you needed.', {
        'say': _s('One or two short sentences. Lead with the pick and one reason. Name the restaurant.'),
        'show': {
            'type': 'object',
            'description': 'The card under your words. dishes/restaurants: ids from tool results this turn or shown earlier, best first. menu: one kitchen id. checkout: prepares the order from the cart (or the details form if something is missing). order: their live order card. none: words only.',
            'properties': {
                'kind': {'type': 'string', 'enum': ['none', 'dishes', 'restaurants', 'menu', 'checkout', 'order']},
                'ids': _arr({'type': 'string'}, 'Dish ids (2–6), kitchen ids (1–4), or one kitchen id for a menu. Empty otherwise.'),
                'pay': {'type': 'string', 'enum': ['online', 'cod'], 'description': 'For checkout: online (UPI/card) unless they asked for cash on delivery.'},
            },
            'required': ['kind', 'ids', 'pay'],
            'additionalProperties': False,
        },
        'choices': {
            'anyOf': [
                {'type': 'object', 'properties': {'options': _arr({'type': 'string'}, '2–6 short tappable answers.'), 'multi': {'type': 'boolean', 'description': 'Let them pick several.'}},
                 'required': ['options', 'multi'], 'additionalProperties': False},
                {'type': 'null'},
            ],
            'description': 'Tappable answers when your words end in a question. null otherwise.',
        },
    }),
]

@dataclass
class Result:
    output: Any
    component: dict | None = None
    summary: str = ''
    events: list[dict] = field(default_factory=list)


class Toolbox:
    """Runs tools for one person during one turn, remembering what it found so the reply can show it."""

    def __init__(self, person: Person):
        self.p = person
        self.cards: dict[str, dict] = {}
        self.restaurants: dict[str, dict] = {}
        self.order_id: str | None = None
        # Set by a valid reply: {"say": str, "components": [...]}.
        self.final: dict | None = None

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
        if name == 'order_status':
            return 'Checking your order and payment'
        return None  # the reply runs silently

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
        addr = set_location(self.p, a.get('area_id') or '', a.get('detail') or '')
        if not addr:
            return Result({'error': 'Unknown area'}, summary='Unknown area')
        return Result({'delivering_to': addr.area.name, 'has_detail': has_detail(addr)}, summary=f'Delivering to {addr.area.name}',
                      events=[{'type': 'profile', 'profile': profile_view(self.p)}])

    def t_remember(self, a: dict) -> Result:
        n = note(self.p, a.get('fact') or '')
        return Result({'ok': bool(n)}, summary='Noted' if n else 'Nothing to note')

    def t_order_status(self, a: dict) -> Result:
        sync_all(self.p)
        o = self.p.orders.exclude(status=Order.DRAFT).select_related('restaurant').order_by('-created_at').first()
        if not o:
            return Result({'error': 'No orders yet.'}, summary='No orders yet')
        self.order_id = str(o.id)
        v = orders.order_view(o)
        paid = {'placed': 'paid' if o.method == 'online' else 'cash on delivery', 'awaiting_payment': 'waiting for payment',
                'failed': 'not paid', 'cancelled': 'cancelled'}.get(o.status, o.status)
        return Result({'restaurant': v['restaurant'], 'stage': v['stage'], 'payment': paid, 'eta_left_min': v['eta_left'],
                       'arrives_at': v.get('arrives_at'), 'total': v['total'], 'refund_id': v['refund_id'] or None},
                      summary=f"{v['stage'].replace('_', ' ')} · {paid}")

    # ---------- the answer ----------

    def t_reply(self, a: dict) -> Result:
        """Turn the model's answer into words and a card. A card that can't be made goes back to the model."""
        say = (a.get('say') or '').strip()
        show = a.get('show') or {}
        kind, ids = show.get('kind') or 'none', [i for i in show.get('ids') or [] if i]
        components: list[dict] = []
        if kind == 'dishes':
            missing = [i for i in ids if i not in self.cards]
            if missing:
                # Shown without searching this turn (from the menu or an earlier turn): rank them for this person.
                for h in search_dishes(self.p, '', limit=80):
                    if h.dish.slug in missing:
                        self.cards[h.dish.slug] = h.card()
            items = [self.cards[i] for i in ids if i in self.cards][:6]
            if not items:
                return Result({'error': 'None of those dish ids exist. Use ids from search_food results.'})
            components.append({'kind': 'dishes', 'items': items})
        elif kind == 'restaurants':
            if any(i not in self.restaurants for i in ids):
                for r in search_restaurants(self.p, '', limit=40):
                    self.restaurants.setdefault(r['id'], r)
            items = [self.restaurants[i] for i in ids if i in self.restaurants][:4]
            if not items:
                return Result({'error': 'None of those kitchen ids exist. Use ids from find_restaurants.'})
            components.append({'kind': 'restaurants', 'items': items})
        elif kind == 'menu':
            m = restaurant_menu(self.p, ids[0] if ids else '')
            if not m:
                return Result({'error': 'No kitchen with that id.'})
            components.append({'kind': 'menu', 'restaurant': m})
        elif kind == 'checkout':
            try:
                words, card = checkout_card(self.p, show.get('pay') or 'online')
            except orders.CartError as e:
                return Result({'error': f'Could not prepare checkout: {e}'}, summary=str(e))
            components.append(card)
            # The form's words are exact about what's missing; the model may not know.
            if card['kind'] == 'collect' or not say:
                say = words
        elif kind == 'order':
            o = self.p.orders.exclude(status=Order.DRAFT).order_by('-created_at').first()
            if o:
                components.append({'kind': 'order', 'order_id': str(o.id)})
        choices = a.get('choices')
        if choices and choices.get('options'):
            components.append({'kind': 'choices', 'options': choices['options'][:6], 'multi': bool(choices.get('multi'))})
        if not say and not components:
            return Result({'error': 'Say something.'})
        self.final = {'say': say, 'components': components}
        return Result({'shown': kind, 'ok': True})


def dumps(x: Any) -> str:
    return json.dumps(x, ensure_ascii=False, separators=(',', ':'), default=str)
