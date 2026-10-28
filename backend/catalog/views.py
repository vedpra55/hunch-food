from django.http import JsonResponse

from .search import restaurant_menu, search_dishes, search_restaurants


def _need(request):
    if not request.person:
        return JsonResponse({'error': 'Send X-Guest-Id or sign in.'}, status=401)
    return None


def menu(request, slug: str):
    if err := _need(request):
        return err
    m = restaurant_menu(request.person, slug)
    return JsonResponse({'restaurant': m}) if m else JsonResponse({'error': 'Not found'}, status=404)


def search(request):
    """Direct search without the agent (typeahead): kitchens and dishes for the same words."""
    if err := _need(request):
        return err
    q = request.GET.get('q', '')[:80]
    return JsonResponse({
        'restaurants': search_restaurants(request.person, q, limit=3),
        'dishes': [h.card() for h in search_dishes(request.person, q, limit=6)],
    })
