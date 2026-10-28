"""
Cart → checkout → order. Money is computed here and only here. Status moves with the clock
(no background job): an order placed at T is cooking, then on its way, then delivered at T + ETA.
"""

from dataclasses import dataclass
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from accounts.models import Address, Person
from catalog.models import Dish, Offer
from catalog.search import best_offer, where
from catalog.services import MAX_KM, allowed, eta_min, is_open, km, opens_label, why_not
from .models import CartLine, Order, OrderItem


class CartError(Exception):
    """Something the person should hear about in plain words."""


# ---------- cart ----------


def find_dish(ref: str) -> Dish | None:
    return Dish.objects.select_related('restaurant').filter(slug=ref).first()


def set_qty(p: Person, dish_ref: str, qty: int, note: str = '') -> None:
    d = find_dish(dish_ref)
    if not d:
        raise CartError(f'No dish with id {dish_ref}')
    if qty > 0:
        reason = why_not(d, p)
        if reason:
            raise CartError(f"Can't add it: {reason}.")
        if not d.available:
            raise CartError(f'{d.name} is sold out today.')
        other = p.cart.exclude(dish__restaurant=d.restaurant).select_related('dish__restaurant').first()
        if other:
            # One kitchen per order keeps delivery honest. Say so instead of silently splitting.
            raise CartError(f'The cart has food from {other.dish.restaurant.name}. One kitchen per order: clear it first, or finish that order.')
        CartLine.objects.update_or_create(person=p, dish=d, defaults={'qty': min(qty, 20), 'note': note[:80]})
    else:
        CartLine.objects.filter(person=p, dish=d).delete()


def add(p: Person, dish_ref: str, qty: int = 1, note: str = '') -> None:
    line = p.cart.filter(dish__slug=dish_ref).first()
    set_qty(p, dish_ref, (line.qty if line else 0) + qty, note or (line.note if line else ''))


def clear(p: Person) -> None:
    p.cart.all().delete()


@dataclass
class Totals:
    item_total: int
    delivery_fee: int
    discount: int
    total: int
    offer_label: str


def totals(lines: list[CartLine]) -> Totals:
    if not lines:
        return Totals(0, 0, 0, 0, '')
    r = lines[0].dish.restaurant
    item_total = sum(l.dish.price * l.qty for l in lines)
    offers = list(Offer.objects.filter(restaurant=r, active=True))
    # One offer per order: the best of a kitchen-wide offer or the dish offers added up.
    whole = max((o for o in offers if o.dish_id is None), key=lambda o: o.discount(item_total), default=None)
    whole_off = whole.discount(item_total) if whole else 0
    dish_off, dish_label = 0, ''
    for l in lines:
        o = best_offer(l.dish, [o for o in offers if o.dish_id])
        if o:
            dish_off += o.discount(l.dish.price) * l.qty
            dish_label = o.label
    discount, label = (whole_off, whole.label) if whole_off >= dish_off and whole else (dish_off, dish_label)
    fee = r.delivery_fee
    return Totals(item_total, fee, discount, max(0, item_total + fee - discount), label if discount else '')


def cart_view(p: Person) -> dict:
    lines = list(p.cart.select_related('dish__restaurant'))
    t = totals(lines)
    return {
        'restaurant': lines[0].dish.restaurant.name if lines else None,
        'lines': [{'id': l.dish.slug, 'name': l.dish.name, 'price': l.dish.price, 'qty': l.qty, 'diet': l.dish.diet,
                   'photo': l.dish.photo, 'note': l.note} for l in lines],
        'count': sum(l.qty for l in lines),
        **t.__dict__,
    }


# ---------- the gate before an order ----------


def missing_for_checkout(p: Person) -> list[str]:
    """What must be true before money can move. The agent asks for these, one at a time."""
    missing = []
    if not p.name:
        missing.append('name')
    if not p.phone:
        missing.append('phone')
    a = default_address(p)
    # An area alone isn't enough for a rider: they need the block and room, or the street.
    if not a or a.line.strip() == a.area.name:
        missing.append('address')
    if not p.signed_in:
        missing.append('sign_in')
    return missing


def default_address(p: Person) -> Address | None:
    return p.addresses.filter(is_default=True).first() or p.addresses.first()


@transaction.atomic
def draft_order(p: Person, method: str = 'online') -> Order:
    lines = list(p.cart.select_related('dish__restaurant'))
    if not lines:
        raise CartError('The cart is empty.')
    missing = missing_for_checkout(p)
    if missing:
        raise CartError('missing:' + ','.join(missing))
    r = lines[0].dish.restaurant
    for l in lines:
        reason = why_not(l.dish, p)
        if reason:
            raise CartError(f'{reason}. Remove it first.')
    if not is_open(r):
        raise CartError(f'{r.name} is closed right now. {opens_label(r)}.')
    a = default_address(p)
    dist = km(a.lat, a.lng, r.lat, r.lng)
    if dist > MAX_KM:
        raise CartError(f"{r.name} doesn't deliver to {a.label} ({dist} km away).")

    # A fresh draft replaces any older unpaid one.
    p.orders.filter(status__in=[Order.DRAFT, Order.AWAITING]).update(status=Order.FAILED)
    t = totals(lines)
    o = Order.objects.create(
        person=p, restaurant=r, method=method, address_label=a.label, address_line=a.line, handoff=a.handoff,
        distance_km=dist, phone=p.phone, name=p.name, item_total=t.item_total, delivery_fee=t.delivery_fee,
        discount=t.discount, total=t.total, offer_label=t.offer_label, eta_min=eta_min(r, dist),
    )
    OrderItem.objects.bulk_create([OrderItem(order=o, dish=l.dish, name=l.dish.name, price=l.dish.price, qty=l.qty) for l in lines])
    return o


@transaction.atomic
def place(o: Order) -> Order:
    """Payment confirmed (or cash): the kitchen starts now, the cart empties."""
    if o.status == Order.PLACED:
        return o
    o.status = Order.PLACED
    o.placed_at = timezone.now()
    o.save(update_fields=['status', 'placed_at', 'payment_status'])
    CartLine.objects.filter(person=o.person, dish__in=o.items.values('dish')).delete()
    return o


# ---------- lifecycle by the clock ----------


def stage(o: Order) -> dict:
    if o.status == Order.CANCELLED:
        return {'stage': 'cancelled', 'eta_left': 0}
    if o.status != Order.PLACED or not o.placed_at:
        return {'stage': o.status, 'eta_left': o.eta_min}
    elapsed = (timezone.now() - o.placed_at).total_seconds() / 60
    left = max(0, round(o.eta_min - elapsed))
    cook = o.restaurant.prep_min
    if left <= 0:
        s = 'delivered'
    elif left <= 3:
        s = 'near'
    elif elapsed >= cook:
        s = 'on_the_way'
    else:
        s = 'cooking'
    return {'stage': s, 'eta_left': left, 'arrives_at': timezone.localtime(o.placed_at + timedelta(minutes=o.eta_min)).strftime('%-I:%M %p').lower()}


def order_view(o: Order) -> dict:
    s = stage(o)
    return {
        'id': str(o.id), 'restaurant': o.restaurant.name, 'status': o.status, **s,
        'items': [{'name': i.name, 'qty': i.qty, 'price': i.price} for i in o.items.all()],
        'item_total': o.item_total, 'delivery_fee': o.delivery_fee, 'discount': o.discount, 'total': o.total,
        'offer_label': o.offer_label, 'method': o.method, 'address': f'{o.address_label} · {o.address_line}',
        'handoff': o.handoff, 'eta_min': o.eta_min, 'phone': o.phone,
        'can_cancel': s['stage'] in ('cooking',) or o.status in (Order.DRAFT, Order.AWAITING),
        'rating': o.rating, 'refund_id': o.refund_id,
    }


def cancellable(o: Order) -> bool:
    return o.status in (Order.DRAFT, Order.AWAITING) or stage(o)['stage'] == 'cooking'
