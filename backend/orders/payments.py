"""
Dodo Payments (test mode). One pay-what-you-want product carries every order; the amount is the
order total, set on the server. Confirmation comes from Dodo, never from the browser.

No webhook is needed to stay in sync: every read of an unpaid order (the order card, the home screen,
the agent's context, its order tool) first asks Dodo about that order's checkout session (`sync`).
The webhook, once deployed, is a second path into the same `apply`.
"""

import base64
import hashlib
import hmac
import logging
import time
from datetime import timedelta
from functools import lru_cache

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from dodopayments import DodoPayments

from .models import Order

log = logging.getLogger('hunch')


@lru_cache(maxsize=1)
def client() -> DodoPayments:
    return DodoPayments(bearer_token=settings.DODO_PAYMENTS_API_KEY, environment=settings.DODO_ENV)


def start_checkout(o: Order, email: str) -> str:
    """Create a hosted checkout for this order and return its URL."""
    # Guests (sign-in off) have no email yet: Dodo's page asks for it, and we fill in what we know.
    customer = {'email': email, 'name': o.name, 'phone_number': f'+91{o.phone}' if len(o.phone) == 10 else o.phone} if email else None
    res = client().checkout_sessions.create(
        **({'customer': customer} if customer else {}),
        product_cart=[{'product_id': settings.DODO_PRODUCT_ID, 'quantity': 1, 'amount': o.total * 100}],
        billing_currency='INR',
        billing_address={'country': 'IN', 'city': 'Phagwara', 'state': 'Punjab', 'street': o.address_line[:100], 'zipcode': '144411'},
        minimal_address=True,
        return_url=f'{settings.FRONTEND_URL}/?order={o.id}',
        metadata={'order_id': str(o.id)},
        customization={'theme': 'light', 'show_order_details': True},
    )
    o.payment_session_id = res.session_id
    o.payment_url = res.checkout_url
    o.status = Order.AWAITING
    o.save(update_fields=['payment_session_id', 'payment_url', 'status'])
    return res.checkout_url


def session_status(o: Order) -> tuple[str, str]:
    """(payment_status, payment_id) for the order's checkout session, straight from Dodo."""
    s = client().checkout_sessions.retrieve(o.payment_session_id)
    status, payment_id = (s.payment_status or ''), (s.payment_id or '')
    if payment_id and status not in DONE:
        # The session can lag the payment it created; the payment itself is the truth.
        status = client().payments.retrieve(payment_id).status or status
    return status, payment_id


DONE = {'succeeded', 'failed', 'cancelled'}
# Unpaid orders worth asking Dodo about: recent ones with a payment page, including superseded ones
# (marked failed by a newer checkout) in case they were paid after all.
WATCH_FOR = timedelta(hours=3)
# Ask Dodo about one order at most this often, however many screens are reading it.
EVERY_S = 3


def unsettled(p) -> list[Order]:
    since = timezone.now() - WATCH_FOR
    return list(p.orders.filter(status__in=[Order.AWAITING, Order.FAILED], created_at__gte=since)
                .exclude(payment_session_id='').exclude(payment_status__in=DONE).select_related('restaurant'))


def sync(o: Order) -> Order:
    """Bring one unpaid order up to date with Dodo. Safe to call as often as you like."""
    if o.status not in (Order.AWAITING, Order.FAILED) or not o.payment_session_id or o.payment_status in DONE:
        return o
    if not cache.add(f'pay-sync:{o.id}', 1, EVERY_S):
        return o
    try:
        status, payment_id = session_status(o)
    except Exception as e:
        log.warning('dodo status failed for %s: %s', o.id, e)
        return o
    return apply(o, status, payment_id)


def sync_all(p) -> None:
    for o in unsettled(p):
        sync(o)


def apply(o: Order, status: str, payment_id: str) -> Order:
    """A payment result, from a sync or the webhook. Applied once: places the order or marks it failed."""
    from agent.thread import post_event
    from .services import order_view, place

    with transaction.atomic():
        o = Order.objects.select_for_update().select_related('restaurant', 'person').get(id=o.id)
        was = o.status
        o.payment_status = status or o.payment_status
        o.payment_id = payment_id or o.payment_id
        o.save(update_fields=['payment_status', 'payment_id'])
        if status == 'succeeded' and was != Order.PLACED:
            place(o)
        elif status in ('failed', 'cancelled') and was == Order.AWAITING:
            o.status = Order.FAILED
            o.save(update_fields=['status'])
    if o.status == Order.PLACED and was != Order.PLACED:
        v = order_view(o)
        post_event(o.person, f"Paid ₹{o.total} · {o.restaurant.name} is cooking" + (f", here around {v['arrives_at']}" if v.get('arrives_at') else ''),
                   kind='paid', components=[{'kind': 'order', 'order_id': str(o.id)}])
    elif o.status == Order.FAILED and was == Order.AWAITING:
        post_event(o.person, "The payment didn't go through. Nothing was charged; your cart is still here.", kind='payment_failed')
    return o


def refund(o: Order) -> str:
    r = client().refunds.create(payment_id=o.payment_id, reason='Cancelled before the kitchen started')
    return r.refund_id


def verify_webhook(body: bytes, headers: dict) -> bool:
    """Standard Webhooks: base64 HMAC-SHA256 of `id.timestamp.body` with the whsec_ secret."""
    secret = settings.DODO_WEBHOOK_SECRET
    if not secret:
        return False
    wid, ts, sigs = headers.get('webhook-id', ''), headers.get('webhook-timestamp', ''), headers.get('webhook-signature', '')
    if not (wid and ts and sigs) or abs(time.time() - int(ts)) > 300:
        return False
    key = base64.b64decode(secret.removeprefix('whsec_'))
    expected = base64.b64encode(hmac.new(key, f'{wid}.{ts}.'.encode() + body, hashlib.sha256).digest()).decode()
    return any(hmac.compare_digest(expected, s.split(',', 1)[-1]) for s in sigs.split())
