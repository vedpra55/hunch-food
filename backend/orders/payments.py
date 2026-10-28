"""
Dodo Payments (test mode). One pay-what-you-want product carries every order; the amount is the
order total, set on the server. Confirmation comes from Dodo, never from the browser:
on return we ask Dodo for the session's status, and the webhook (when deployed) says the same.
"""

import base64
import hashlib
import hmac
import logging
import time
from functools import lru_cache

from django.conf import settings
from dodopayments import DodoPayments

from .models import Order

log = logging.getLogger('hunch')


@lru_cache(maxsize=1)
def client() -> DodoPayments:
    return DodoPayments(bearer_token=settings.DODO_PAYMENTS_API_KEY, environment=settings.DODO_ENV)


def start_checkout(o: Order, email: str) -> str:
    """Create a hosted checkout for this order and return its URL."""
    res = client().checkout_sessions.create(
        product_cart=[{'product_id': settings.DODO_PRODUCT_ID, 'quantity': 1, 'amount': o.total * 100}],
        customer={'email': email, 'name': o.name, 'phone_number': f'+91{o.phone}' if len(o.phone) == 10 else o.phone},
        billing_currency='INR',
        billing_address={'country': 'IN', 'city': 'Phagwara', 'state': 'Punjab', 'street': o.address_line[:100], 'zipcode': '144411'},
        minimal_address=True,
        return_url=f'{settings.FRONTEND_URL}/?order={o.id}',
        metadata={'order_id': str(o.id)},
        customization={'theme': 'light', 'show_order_details': True},
    )
    o.payment_session_id = res.session_id
    o.status = Order.AWAITING
    o.save(update_fields=['payment_session_id', 'status'])
    return res.checkout_url


def session_status(o: Order) -> tuple[str, str]:
    """(payment_status, payment_id) for the order's checkout session, straight from Dodo."""
    s = client().checkout_sessions.retrieve(o.payment_session_id)
    return (s.payment_status or ''), (s.payment_id or '')


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
