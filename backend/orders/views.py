import json
import logging

from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from agent.thread import checkout_card, message_view, post_event, post_hunch
from . import payments
from . import services as S
from .models import Order, PaymentEvent

log = logging.getLogger('hunch')


def _need(request):
    if not request.person:
        return JsonResponse({'error': 'Send X-Guest-Id or sign in.'}, status=401)
    return None


def _body(request) -> dict:
    return json.loads(request.body or b'{}')


@csrf_exempt
def cart(request):
    """GET the cart, or POST {"dish_id", "qty"} (absolute) / {"dish_id", "add": 1} / {"clear": true}."""
    if err := _need(request):
        return err
    p = request.person
    if request.method == 'POST':
        data = _body(request)
        try:
            if data.get('clear'):
                S.clear(p)
                post_event(p, 'Cleared the cart', kind='cart')
            else:
                d = S.find_dish(data.get('dish_id') or '')
                before = p.cart.filter(dish=d).first() if d else None
                if 'add' in data:
                    S.add(p, data['dish_id'], int(data['add']), data.get('note', ''))
                else:
                    S.set_qty(p, data['dish_id'], int(data.get('qty', 0)), data.get('note', ''))
                after = p.cart.filter(dish=d).first()
                if d:
                    had, has = before.qty if before else 0, after.qty if after else 0
                    if has > had:
                        post_event(p, f'Added {has - had}× {d.name}', kind='cart')
                    elif has < had:
                        post_event(p, f'Removed {d.name}' if not has else f'{d.name} now {has}×', kind='cart')
        except S.CartError as e:
            return JsonResponse({'error': str(e), 'cart': S.cart_view(p)}, status=409)
    return JsonResponse({'cart': S.cart_view(p)})


@csrf_exempt
@require_POST
def checkout(request):
    """From the cart bar: the details form or the order, written to the thread as a Hunch line."""
    if err := _need(request):
        return err
    p = request.person
    payments.sync_all(p)
    try:
        words, card = checkout_card(p, _body(request).get('method', 'online'))
    except S.CartError as e:
        return JsonResponse({'error': str(e)}, status=409)
    return JsonResponse({'message': message_view(post_hunch(p, words, [card]), p), 'cart': S.cart_view(p)})


def _mine(request, order_id) -> Order | None:
    return request.person.orders.select_related('restaurant').filter(id=order_id).first()


@csrf_exempt
@require_POST
def pay(request, order_id):
    """Online: the Dodo payment page for this order's server-side total (the same page if tapped again).
    Cash: placed straight away."""
    if err := _need(request):
        return err
    o = _mine(request, order_id)
    if o:
        o = payments.sync(o)
    if not o or o.status not in (Order.DRAFT, Order.AWAITING):
        return JsonResponse({'error': 'This order is already paid or closed.', 'order': S.order_view(o) if o else None}, status=409)
    if o.method == 'cod':
        S.place(o)
        post_event(o.person, f'Placed · ₹{o.total} cash on delivery · {o.restaurant.name} is cooking', kind='paid',
                   components=[{'kind': 'order', 'order_id': str(o.id)}])
        return JsonResponse({'order': S.order_view(o)})
    if o.status == Order.AWAITING and o.payment_url:
        return JsonResponse({'checkout_url': o.payment_url, 'order': S.order_view(o)})
    try:
        url = payments.start_checkout(o, request.person.email)
    except Exception as e:
        log.exception('dodo checkout failed')
        return JsonResponse({'error': f'Payment could not start: {str(e)[:120]}'}, status=502)
    return JsonResponse({'checkout_url': url, 'order': S.order_view(o)})


@require_GET
def order(request, order_id):
    """The order as it is now; an unpaid one is checked with Dodo first."""
    if err := _need(request):
        return err
    o = _mine(request, order_id)
    if not o:
        return JsonResponse({'error': 'Not found'}, status=404)
    o = payments.sync(o)
    return JsonResponse({'order': S.order_view(o)})


@csrf_exempt
@require_POST
def cancel(request, order_id):
    """Only before the kitchen gets going; online orders are refunded in full."""
    if err := _need(request):
        return err
    o = _mine(request, order_id)
    if not o or not S.cancellable(o):
        return JsonResponse({'error': "It's already on its way, so it can't be cancelled."}, status=409)
    if o.status == Order.PLACED and o.method == 'online' and o.payment_id:
        try:
            o.refund_id = payments.refund(o)
        except Exception as e:
            log.exception('refund failed')
            return JsonResponse({'error': f'Refund could not start: {str(e)[:120]}'}, status=502)
    o.status, o.cancelled_at = Order.CANCELLED, timezone.now()
    o.save(update_fields=['status', 'cancelled_at', 'refund_id'])
    post_event(o.person, f'Cancelled the {o.restaurant.name} order' + (f' · ₹{o.total} refund started' if o.refund_id else ''), kind='cancelled')
    return JsonResponse({'order': S.order_view(o)})


@csrf_exempt
@require_POST
def rate(request, order_id):
    if err := _need(request):
        return err
    o = _mine(request, order_id)
    rating = _body(request).get('rating')
    if not o or rating not in ('up', 'down'):
        return JsonResponse({'error': 'Bad request'}, status=400)
    o.rating = rating
    o.save(update_fields=['rating'])
    return JsonResponse({'order': S.order_view(o)})


@csrf_exempt
@require_POST
def dodo_webhook(request):
    """payment.succeeded / payment.failed. Verified, and applied once per event id. A backup to sync."""
    headers = {k.lower(): v for k, v in request.headers.items()}
    if not payments.verify_webhook(request.body, headers):
        return JsonResponse({'error': 'bad signature'}, status=401)
    event = json.loads(request.body)
    _, created = PaymentEvent.objects.get_or_create(event_id=headers['webhook-id'], defaults={'type': event.get('type', ''), 'payload': event})
    if not created:
        return JsonResponse({'ok': True, 'duplicate': True})
    data = event.get('data') or {}
    order_id = (data.get('metadata') or {}).get('order_id')
    o = Order.objects.filter(id=order_id).first() if order_id else None
    if o and event.get('type') == 'payment.succeeded':
        payments.apply(o, 'succeeded', data.get('payment_id', ''))
    elif o and event.get('type') == 'payment.failed':
        payments.apply(o, 'failed', data.get('payment_id', ''))
    return JsonResponse({'ok': True})
