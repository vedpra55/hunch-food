"""
One search over kitchens and dishes. Order of influence, same as Home (HOME_SPEC §3):
rules filter → the words (names, then meaning) → what fits the person → context (open, distance, offers).
"""

from dataclasses import dataclass, field

from django.contrib.postgres.search import TrigramSimilarity
from django.db.models import Count, Q
from pgvector.django import CosineDistance

from accounts.models import Person
from orders.models import OrderItem
from .embeddings import embed_query
from .models import Area, Dish, Offer, Restaurant
from .services import MAX_KM, allowed, eta_min, is_open, km, opens_label

# Mood words people actually type → dish traits. Meaning search alone confuses "warm" and "cool".
MOODS = {
    'warm': 'warm', 'hot': 'warm', 'comfort': 'comfort', 'cozy': 'comfort', 'light': 'light', 'healthy': 'light',
    'cold': 'cool', 'cool': 'cool', 'chilled': 'cool', 'sweet': 'sweet', 'dessert': 'sweet', 'filling': 'filling',
    'heavy': 'filling', 'hungry': 'filling', 'fresh': 'fresh', 'crispy': 'fried', 'fried': 'fried', 'drink': 'drink',
}

# Where Hunch assumes you are before you give an address: the middle of LPU.
DEFAULT_AREA = 'lpu-unimall'


@dataclass
class Place:
    lat: float
    lng: float
    label: str


def where(p: Person) -> Place:
    a = p.addresses.filter(is_default=True).first() or p.addresses.first()
    if a:
        return Place(a.lat, a.lng, a.label)
    area = Area.objects.get(slug=DEFAULT_AREA)
    return Place(area.lat, area.lng, area.name)


def _meaning(distance) -> float:
    """Cosine similarity from pgvector's distance; a row without an embedding just has no meaning score."""
    return 0.0 if distance is None else 1 - float(distance)


def best_offer(d: Dish, offers: list[Offer]) -> Offer | None:
    """The offer that takes the most off this dish on its own."""
    fits = [o for o in offers if o.dish_id in (None, d.id) and o.min_order <= d.price]
    return max(fits, key=lambda o: o.discount(d.price), default=None)


@dataclass
class Hit:
    dish: Dish
    score: float
    distance: float
    eta: int
    open: bool
    offer: Offer | None
    times: int
    reasons: list[str] = field(default_factory=list)
    rel: float = 0.0

    def card(self) -> dict:
        """What the UI shows and what the model reads: small and exact."""
        d, r = self.dish, self.dish.restaurant
        return {
            'id': d.slug,
            'name': d.name,
            'restaurant': r.name,
            'restaurant_id': r.slug,
            'price': d.price,
            'diet': d.diet,
            'photo': d.photo,
            'eta_min': self.eta,
            'distance_km': self.distance,
            'open': self.open,
            'opens': None if self.open else opens_label(r),
            'rating': float(d.rating),
            'kcal': d.kcal,
            'protein_g': d.protein_g,
            'spice': d.spice,
            'offer': self.offer.label if self.offer else None,
            'offer_off': self.offer.discount(d.price) if self.offer else 0,
            'times_ordered': self.times,
            'reasons': self.reasons[:3],
            'review_summary': d.review_summary,
            'description': d.description,
            'options': d.options,
        }


def _times_ordered(p: Person) -> dict[int, int]:
    rows = OrderItem.objects.filter(order__person=p, order__status='placed').values('dish_id').annotate(n=Count('id'))
    return {r['dish_id']: r['n'] for r in rows}


def search_dishes(
    p: Person,
    query: str = '',
    *,
    max_price: int | None = None,
    veg_only: bool = False,
    with_offer: bool = False,
    restaurant: str | None = None,
    traits: list[str] | None = None,
    meal: str | None = None,
    min_protein: int | None = None,
    limit: int = 6,
) -> list[Hit]:
    place = where(p)
    qs = Dish.objects.filter(available=True, restaurant__active=True).select_related('restaurant', 'category')
    if restaurant:
        qs = qs.filter(Q(restaurant__slug=restaurant) | Q(restaurant__name__iexact=restaurant))
    if max_price:
        qs = qs.filter(price__lte=max_price)
    if veg_only:
        qs = qs.filter(diet='veg')
    if min_protein:
        qs = qs.filter(protein_g__gte=min_protein)
    if traits:
        qs = qs.filter(traits__overlap=traits)
    if meal:
        qs = qs.filter(meals__contains=[meal])

    words = query.strip()
    moods = {MOODS[w] for w in words.lower().replace(',', ' ').split() if w in MOODS}
    wants_spicy = 'spicy' in words.lower()
    if words:
        vec = list(embed_query(words.lower()))
        qs = qs.annotate(
            name_sim=TrigramSimilarity('name', words) + TrigramSimilarity('kind', words) * 0.8 + TrigramSimilarity('restaurant__name', words) * 0.6,
            meaning=CosineDistance('embedding', vec),
        )

    offers_by_r: dict[int, list[Offer]] = {}
    for o in Offer.objects.filter(active=True):
        offers_by_r.setdefault(o.restaurant_id, []).append(o)
    times = _times_ordered(p)

    hits: list[Hit] = []
    for d in qs:
        if not allowed(d, p):
            continue
        r = d.restaurant
        dist = km(place.lat, place.lng, r.lat, r.lng)
        if dist > MAX_KM:
            continue
        open_now = is_open(r)
        offer = best_offer(d, offers_by_r.get(r.id, []))
        if with_offer and not offer:
            continue

        # Relevance leads: name matches beat meaning; meaning catches "something warm for exam night".
        rel = float(d.name_sim) * 1.5 + _meaning(d.meaning) if words else 0.0
        rel += 0.35 * len(moods & set(d.traits)) + (0.25 if wants_spicy and d.spice >= 2 else 0)
        score = rel * 10
        score += float(d.rating) * 0.3 + min(d.popularity, 3000) / 6000
        score += min(times.get(d.id, 0), 5) * 0.35
        score -= abs(d.spice - p.spice) * 0.15
        if p.budget and d.price > p.budget:
            score -= 0.8
        if offer:
            score += 0.3 + offer.discount(d.price) / 200
        score -= dist * 0.05
        if not open_now:
            # Closed still shows when it's exactly what they asked for ("opens 12 pm"), never above an open match.
            score -= 3

        hit = Hit(d, score, dist, eta_min(r, dist), open_now, offer, times.get(d.id, 0))
        hit.rel = rel
        hit.reasons = _reasons(hit, p)
        hits.append(hit)

    if words and hits:
        # Drop weak matches: "momos" should not come back with butter chicken.
        best = max(h.rel for h in hits)
        hits = [h for h in hits if h.rel >= best * 0.72]
    hits.sort(key=lambda h: h.score, reverse=True)
    # Variety: at most two dishes from one kitchen, unless the person asked for that kitchen.
    picked, per_r = [], {}
    for h in hits:
        rid = h.dish.restaurant_id
        if not restaurant and per_r.get(rid, 0) >= 2:
            continue
        per_r[rid] = per_r.get(rid, 0) + 1
        picked.append(h)
        if len(picked) >= limit:
            break
    return picked


def _reasons(h: Hit, p: Person) -> list[str]:
    out = []
    if h.times:
        out.append(f"you've had it {h.times} time{'s' if h.times > 1 else ''}")
    if h.offer:
        out.append(h.offer.label)
    if p.goal in ('protein', 'cutting') and h.dish.protein_g >= 25:
        out.append(f'{h.dish.protein_g} g protein')
    if p.goal in ('light', 'cutting') and h.dish.kcal <= 450:
        out.append(f'{h.dish.kcal} kcal')
    if h.open:
        out.append(f'here in {h.eta} min')
    if float(h.dish.rating) >= 4.4:
        out.append(f'rated {h.dish.rating}★')
    return out


def search_restaurants(p: Person, query: str = '', *, limit: int = 4) -> list[dict]:
    place = where(p)
    qs = Restaurant.objects.filter(active=True).select_related('area')
    words = query.strip()
    if words:
        vec = list(embed_query(words.lower()))
        qs = qs.annotate(name_sim=TrigramSimilarity('name', words), meaning=CosineDistance('embedding', vec))
    rows = []
    for r in qs:
        dist = km(place.lat, place.lng, r.lat, r.lng)
        reach = dist <= MAX_KM
        score = (float(r.name_sim) * 1.5 + _meaning(r.meaning)) * 10 if words else 0
        score += float(r.rating) * 0.3 + (0 if reach else -3) + (0 if is_open(r) else -1) - dist * 0.03
        rows.append((score, r, dist, reach))
    rows.sort(key=lambda x: x[0], reverse=True)

    out = []
    for score, r, dist, reach in rows[:limit]:
        top = [d for d in r.dishes.filter(available=True).order_by('-popularity')[:8] if allowed(d, p)][:3]
        offer = r.offers.filter(active=True, dish__isnull=True).first() or r.offers.filter(active=True).first()
        out.append({
            'id': r.slug,
            'name': r.name,
            'cuisines': r.cuisines,
            'area': r.area.name,
            'rating': float(r.rating),
            'rating_count': r.rating_count,
            'price_for_two': r.price_for_two,
            'pure_veg': r.pure_veg,
            'photo': r.photo,
            'distance_km': dist,
            'delivers_here': reach,
            'eta_min': eta_min(r, dist),
            'open': is_open(r),
            'opens': None if is_open(r) else opens_label(r),
            'offer': offer.label if offer else None,
            'description': r.description,
            'top_dishes': [{'id': d.slug, 'name': d.name, 'price': d.price, 'diet': d.diet, 'photo': d.photo} for d in top],
        })
    return out


def restaurant_menu(p: Person, slug: str) -> dict | None:
    r = Restaurant.objects.filter(Q(slug=slug) | Q(name__iexact=slug)).select_related('area').first()
    if not r:
        return None
    place = where(p)
    dist = km(place.lat, place.lng, r.lat, r.lng)
    offers = list(r.offers.filter(active=True))
    cats = []
    for c in r.categories.all():
        items = []
        for d in c.dishes.filter(available=True):
            if not allowed(d, p):
                continue
            o = best_offer(d, offers)
            items.append({'id': d.slug, 'name': d.name, 'price': d.price, 'diet': d.diet, 'photo': d.photo,
                          'description': d.description, 'offer': o.label if o else None, 'rating': float(d.rating)})
        if items:
            cats.append({'name': c.name, 'dishes': items})
    return {
        'id': r.slug, 'name': r.name, 'cuisines': r.cuisines, 'area': r.area.name, 'rating': float(r.rating),
        'photo': r.photo, 'distance_km': dist, 'delivers_here': dist <= MAX_KM, 'eta_min': eta_min(r, dist),
        'open': is_open(r), 'opens': None if is_open(r) else opens_label(r),
        'offers': sorted({o.label for o in offers}), 'categories': cats,
    }
