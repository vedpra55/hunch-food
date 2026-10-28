import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from agent import memory
from agent.tools import profile_view
from catalog.models import Area
from orders.models import Order
from orders.services import order_view
from .models import Address


def _need(request):
    if not request.person:
        return JsonResponse({'error': 'Send X-Guest-Id or sign in.'}, status=401)
    return None


EDITABLE = {'name', 'phone', 'diet', 'allergies', 'spice', 'budget', 'veg_days', 'goal', 'use_weather', 'nudge_on', 'onboarded'}


@csrf_exempt
@require_http_methods(['GET', 'PATCH'])
def me(request):
    if err := _need(request):
        return err
    p = request.person
    if request.method == 'PATCH':
        data = json.loads(request.body or b'{}')
        for k, v in data.items():
            if k not in EDITABLE:
                continue
            if k == 'phone':
                v = ''.join(ch for ch in str(v) if ch.isdigit())[-10:]
                if len(v) != 10:
                    return JsonResponse({'error': 'Phone needs 10 digits.'}, status=400)
            setattr(p, k, v)
        p.save()
    orders = p.orders.filter(status__in=[Order.PLACED, Order.CANCELLED]).select_related('restaurant').prefetch_related('items')[:20]
    return JsonResponse({
        'profile': profile_view(p),
        'addresses': [address_view(a) for a in p.addresses.select_related('area')],
        'orders': [order_view(o) for o in orders],
        'memories': memory.all_memories(str(p.id)),
    })


def address_view(a: Address) -> dict:
    return {'id': a.id, 'label': a.label, 'line': a.line, 'area': a.area.name, 'area_id': a.area.slug, 'handoff': a.handoff, 'is_default': a.is_default}


def areas(request):
    return JsonResponse({'areas': [{'id': a.slug, 'name': a.name, 'city': a.city, 'campus': a.campus} for a in Area.objects.order_by('city', 'name')]})


@csrf_exempt
@require_http_methods(['POST'])
def add_address(request):
    if err := _need(request):
        return err
    data = json.loads(request.body or b'{}')
    area = Area.objects.filter(slug=data.get('area_id')).first()
    line = (data.get('line') or '').strip()
    if not area or len(line) < 3:
        return JsonResponse({'error': 'Pick an area and add your block, room or street.'}, status=400)
    p = request.person
    p.addresses.update(is_default=False)
    a = Address.objects.create(
        person=p, label=(data.get('label') or ('Hostel' if area.campus else 'Home'))[:30], line=line[:160], area=area,
        lat=area.lat, lng=area.lng, handoff=(data.get('handoff') or ('Gate 1' if area.campus else ''))[:40], is_default=True,
    )
    return JsonResponse({'address': address_view(a)})


@csrf_exempt
@require_http_methods(['DELETE'])
def delete_address(request, address_id: int):
    if err := _need(request):
        return err
    request.person.addresses.filter(id=address_id).delete()
    return JsonResponse({'ok': True})


@csrf_exempt
@require_http_methods(['DELETE'])
def forget_memory(request, memory_id: str):
    if err := _need(request):
        return err
    if any(m['id'] == memory_id for m in memory.all_memories(str(request.person.id))):
        memory.forget(memory_id)
    return JsonResponse({'ok': True})


@csrf_exempt
@require_http_methods(['POST'])
def forget_all(request):
    if err := _need(request):
        return err
    memory.forget_all(str(request.person.id))
    return JsonResponse({'ok': True})
