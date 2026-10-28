import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from agent.thread import post_event, profile_view
from catalog.models import Area
from orders.models import Order
from orders.services import order_view
from .models import DIETS, Address
from .services import note, set_location


def _need(request):
    if not request.person:
        return JsonResponse({'error': 'Send X-Guest-Id or sign in.'}, status=401)
    return None


def _body(request) -> dict:
    return json.loads(request.body or b'{}')


EDITABLE = {'name', 'phone', 'diet', 'allergies', 'spice', 'budget', 'veg_days', 'goal', 'use_weather', 'nudge_on', 'onboarded'}
ALLERGENS = {'dairy', 'gluten', 'nuts', 'egg', 'soy'}


def _phone(v) -> str | None:
    digits = ''.join(ch for ch in str(v) if ch.isdigit())
    if len(digits) == 12 and digits.startswith('91'):
        digits = digits[2:]
    return digits if len(digits) == 10 and digits[0] in '6789' else None


@csrf_exempt
@require_http_methods(['GET', 'PATCH'])
def me(request):
    if err := _need(request):
        return err
    p = request.person
    if request.method == 'PATCH':
        for k, v in _body(request).items():
            if k not in EDITABLE:
                continue
            if k == 'phone':
                v = _phone(v)
                if not v:
                    return JsonResponse({'error': 'That needs to be a 10-digit Indian mobile number.'}, status=400)
            if k == 'name':
                v = str(v).strip()[:60]
                if not v:
                    return JsonResponse({'error': 'What should I call you?'}, status=400)
            setattr(p, k, v)
        p.save()
    orders = p.orders.filter(status__in=[Order.PLACED, Order.CANCELLED]).select_related('restaurant').prefetch_related('items')[:20]
    return JsonResponse({
        'profile': profile_view(p),
        'addresses': [address_view(a) for a in p.addresses.select_related('area')],
        'orders': [order_view(o) for o in orders],
        'notes': [{'id': n.id, 'text': n.text} for n in p.notes.all()],
    })


@csrf_exempt
@require_http_methods(['POST'])
def onboarding(request):
    """The first-run questions, answered in the app (no model): name, where, what they eat, what makes them unwell."""
    if err := _need(request):
        return err
    p = request.person
    data = _body(request)
    name = str(data.get('name') or '').strip()[:60]
    if not name:
        return JsonResponse({'error': 'What should I call you?'}, status=400)
    p.name = name
    if data.get('diet') in dict(DIETS):
        p.diet = data['diet']
    p.allergies = sorted({a for a in data.get('allergies') or [] if a in ALLERGENS})
    p.onboarded = True
    p.save()
    if data.get('area_id'):
        set_location(p, data['area_id'])
    where = p.addresses.select_related('area').filter(is_default=True).first()
    post_event(p, f"Set up · {name}" + (f" · {where.area.name}" if where else ''), kind='setup')
    return JsonResponse({'profile': profile_view(p)})


def address_view(a: Address) -> dict:
    return {'id': a.id, 'label': a.label, 'line': a.line, 'area': a.area.name, 'area_id': a.area.slug, 'handoff': a.handoff, 'is_default': a.is_default}


def areas(request):
    return JsonResponse({'areas': [{'id': a.slug, 'name': a.name, 'city': a.city, 'campus': a.campus} for a in Area.objects.order_by('city', 'name')]})


@csrf_exempt
@require_http_methods(['POST'])
def add_address(request):
    if err := _need(request):
        return err
    data = _body(request)
    line = (data.get('line') or '').strip()
    if len(line) < 3:
        return JsonResponse({'error': 'Add your block and room, or house and street.'}, status=400)
    a = set_location(request.person, data.get('area_id') or '', line)
    if not a:
        return JsonResponse({'error': 'Pick an area.'}, status=400)
    return JsonResponse({'address': address_view(a), 'profile': profile_view(request.person)})


@csrf_exempt
@require_http_methods(['DELETE'])
def delete_address(request, address_id: int):
    if err := _need(request):
        return err
    request.person.addresses.filter(id=address_id).delete()
    return JsonResponse({'ok': True})


@csrf_exempt
@require_http_methods(['POST'])
def add_note(request):
    if err := _need(request):
        return err
    n = note(request.person, str(_body(request).get('text') or ''))
    if not n:
        return JsonResponse({'error': 'Say a little more.'}, status=400)
    return JsonResponse({'note': {'id': n.id, 'text': n.text}})


@csrf_exempt
@require_http_methods(['DELETE'])
def forget_note(request, note_id: int):
    if err := _need(request):
        return err
    request.person.notes.filter(id=note_id).delete()
    return JsonResponse({'ok': True})


@csrf_exempt
@require_http_methods(['POST'])
def forget_all(request):
    if err := _need(request):
        return err
    request.person.notes.all().delete()
    return JsonResponse({'ok': True})
