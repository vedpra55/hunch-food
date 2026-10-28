"""
Who is this request? In order:
1. `Authorization: Bearer <supabase access token>` → verified with Supabase (cached a few minutes).
2. `X-Dev-Email` → a signed-in test person, only when DEBUG and DEV_AUTH are on.
3. `X-Guest-Id` → a guest. Guests can chat, search and fill a cart; paying needs a verified email.
The browser's guest id travels with the sign-in, so the guest's conversation and cart become theirs.
"""

import hashlib
import logging
import time
import uuid

import httpx
from django.conf import settings
from django.db import transaction

from .models import Person

log = logging.getLogger('hunch')
_cache: dict[str, tuple[float, dict]] = {}
TTL = 300


def supabase_user(token: str) -> dict | None:
    key = hashlib.sha256(token.encode()).hexdigest()
    hit = _cache.get(key)
    if hit and hit[0] > time.time():
        return hit[1]
    try:
        r = httpx.get(f'{settings.SUPABASE_URL}/auth/v1/user', headers={'apikey': settings.SUPABASE_ANON_KEY, 'Authorization': f'Bearer {token}'}, timeout=6)
    except httpx.HTTPError as e:
        log.warning('supabase auth check failed: %s', e)
        return None
    if r.status_code != 200:
        return None
    user = r.json()
    _cache[key] = (time.time() + TTL, user)
    return user


@transaction.atomic
def person_for_auth(auth_id: uuid.UUID, email: str, guest_id: str | None) -> Person:
    p = Person.objects.select_for_update().filter(auth_user_id=auth_id).first()
    guest = Person.objects.select_for_update().filter(guest_id=guest_id, auth_user_id__isnull=True).first() if guest_id else None
    if p:
        if guest and guest.id != p.id:
            merge(guest, into=p)
        return p
    if guest:
        # First sign-in from this browser: the guest becomes the account.
        guest.auth_user_id, guest.email, guest.guest_id = auth_id, email, None
        guest.save(update_fields=['auth_user_id', 'email', 'guest_id'])
        return guest
    return Person.objects.create(auth_user_id=auth_id, email=email)


def merge(guest: Person, into: Person) -> None:
    """Bring a guest's cart and conversations into an existing account; the account's profile wins."""
    from agent.models import Conversation
    from orders.models import CartLine

    if not into.cart.exists():
        CartLine.objects.filter(person=guest).update(person=into)
    Conversation.objects.filter(person=guest).update(person=into)
    for f in ('name', 'phone'):
        if not getattr(into, f) and getattr(guest, f):
            setattr(into, f, getattr(guest, f))
    into.save()
    guest.delete()


class PersonMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.person = self.resolve(request)
        return self.get_response(request)

    @staticmethod
    def resolve(request) -> Person | None:
        guest_id = request.headers.get('X-Guest-Id', '').strip()[:64] or None
        auth = request.headers.get('Authorization', '')
        if auth.startswith('Bearer '):
            user = supabase_user(auth[7:])
            if user:
                return person_for_auth(uuid.UUID(user['id']), user.get('email', ''), guest_id)
        dev = request.headers.get('X-Dev-Email', '').strip().lower()
        if dev and settings.DEV_AUTH:
            return person_for_auth(uuid.uuid5(uuid.NAMESPACE_URL, f'hunch-dev:{dev}'), dev, guest_id)
        if guest_id:
            p, _ = Person.objects.get_or_create(guest_id=guest_id)
            return p
        return None
