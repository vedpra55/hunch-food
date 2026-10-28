import json
import logging

from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

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
            elif 'add' in data:
                S.add(p, data['dish_id'], int(data['add']), data.get('note', ''))
            else:
                S.set_qty(p, data['dish_id'], int(data.get('qty', 0)), data.get('note', ''))
        except S.CartError as e:
            return JsonResponse({'error': str(e), 'cart': S.cart_view(p)}, status=409)
    return JsonResponse({'cart': S.cart_view(p)})


@csrf_exempt
@require_POST
def checkout(request):
    """Draft an order from the cart, or say what's missing first."""
    if err := _need(request):
        return err
    p = request.person
    missing = S.missing_for_checkout(p)
    if missing:
        return JsonResponse({'missing': missing}, status=409)
    try:
        o = S.draft_order(p, _body(request).get('method', 'online'))
    except S.CartError as e:
        return JsonResponse({'error': str(e)}, status=409)
    return JsonResponse({'order': S.order_view(o)})


def _mine(request, order_id) -> Order | None:
    return request.person.orders.select_related('restaurant').filter(id=order_id).first()


@csrf_exempt
@require_POST
def pay(request, order_id):
    """Online: a Dodo checkout URL for this order's server-side total. Cash: placed straight away."""
    if err := _need(request):
        return err
    o = _mine(request, order_id)
    if not o or o.status not in (Order.DRAFT, Order.AWAITING):
        return JsonResponse({'error': 'This order can no longer be paid.'}, status=409)
    if o.method == 'cod':
        S.place(o)
        return JsonResponse({'order': S.order_view(o)})
    try:
        url = payments.start_checkout(o, request.person.email)
    except Exception as e:
        log.exception('dodo checkout failed')
        return JsonResponse({'error': f'Payment could not start: {str(e)[:120]}'}, status=502)
    return JsonResponse({'checkout_url': url, 'order': S.order_view(o)})


@require_GET
def order(request, order_id):
    """The order, and if it's waiting on payment, ask Dodo whether it went through."""
    if err := _need(request):
        return err
    o = _mine(request, order_id)
    if not o:
        return JsonResponse({'error': 'Not found'}, status=404)
    if o.status == Order.AWAITING and o.payment_session_id:
        try:
            status, payment_id = payments.session_status(o)
        except Exception as e:
            log.warning('dodo status failed: %s', e)
            status, payment_id = '', ''
        _apply_payment(o, status, payment_id)
    return JsonResponse({'order': S.order_view(o)})


def _apply_payment(o: Order, status: str, payment_id: str) -> None:
    with transaction.atomic():
        o = Order.objects.select_for_update().get(id=o.id)
        o.payment_status = status or o.payment_status
        o.payment_id = payment_id or o.payment_id
        if status == 'succeeded' and o.status != Order.PLACED:
            o.save(update_fields=['payment_status', 'payment_id'])
            S.place(o)
        elif status in ('failed', 'cancelled') and o.status == Order.AWAITING:
            o.status = Order.FAILED
            o.save(update_fields=['payment_status', 'payment_id', 'status'])
        else:
            o.save(update_fields=['payment_status', 'payment_id'])


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
    """payment.succeeded / payment.failed / refund.succeeded. Verified, and applied once per event id."""
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
        _apply_payment(o, 'succeeded', data.get('payment_id', ''))
    elif o and event.get('type') == 'payment.failed':
        _apply_payment(o, 'failed', data.get('payment_id', ''))
    return JsonResponse({'ok': True})
