import hashlib
import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from catalog import seed_data as S
from catalog.embeddings import embed_catalogue
from catalog.models import Area, Dish, MenuCategory, Offer, Restaurant, Review

DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']


def rng_for(*parts: str) -> random.Random:
    """A random stream per thing, so a re-seed gives the same rows."""
    return random.Random(int(hashlib.sha256('|'.join(parts).encode()).hexdigest()[:12], 16))


class Command(BaseCommand):
    help = 'Rebuild the Jalandhar–Phagwara–LPU catalogue (areas, kitchens, dishes, reviews, offers).'

    def add_arguments(self, parser):
        parser.add_argument('--embed', action='store_true', help='Also compute embeddings (calls OpenAI, ~40k tokens).')

    @transaction.atomic
    def handle(self, *args, embed=False, **opts):
        Offer.objects.all().delete()
        Review.objects.all().delete()
        Dish.objects.all().delete()
        MenuCategory.objects.all().delete()
        Restaurant.objects.all().delete()
        Area.objects.all().delete()

        areas = {}
        for slug, name, city, lat, lng, campus in S.AREAS:
            areas[slug] = Area.objects.create(slug=slug, name=name, city=city, lat=lat, lng=lng, campus=campus)

        now = timezone.now()
        dish_count = review_count = 0
        for (slug, name, area, arch, cuisines, rating, count, p2, pure_veg, opens, closes, prep, fee, desc) in S.RESTAURANTS:
            r_rng = rng_for(slug)
            a = areas[area]
            menu = [d for d in S.MENUS[arch] if not pure_veg or d['diet'] == 'veg']
            r = Restaurant.objects.create(
                slug=slug, name=name, area=a, cuisines=cuisines, description=desc,
                # Kitchens sit a few hundred metres around the area's centre.
                lat=a.lat + r_rng.uniform(-0.003, 0.003), lng=a.lng + r_rng.uniform(-0.003, 0.003),
                rating=rating, rating_count=count, price_for_two=p2, pure_veg=pure_veg,
                hours={d: [opens, closes] for d in DAYS}, prep_min=prep, delivery_fee=fee,
                photo=S.PHOTOS[menu[0]['photo']],
            )
            categories = {}
            for d in menu:
                if d['cat'] not in categories:
                    categories[d['cat']] = MenuCategory.objects.create(restaurant=r, name=d['cat'], position=len(categories))

            for i, d in enumerate(menu):
                d_rng = rng_for(slug, d['name'])
                # Same dish, different kitchen: prices move a little, never to odd numbers.
                price = max(15, int(round(d['price'] * d_rng.uniform(0.9, 1.12) / 5) * 5))
                dish_rating = round(min(4.9, max(3.6, float(rating) + d_rng.uniform(-0.4, 0.3))), 1)
                allergens = d['allergens'] + ([d['allergens_extra']] if d.get('allergens_extra') else [])
                dish = Dish.objects.create(
                    slug=f'{slug}-{slugify(d["name"])}', restaurant=r, category=categories[d['cat']],
                    name=d['name'], description=d['desc'], kind=d['kind'], price=price, diet=d['diet'],
                    jain=d.get('jain', False), vegan=d.get('vegan', False), fasting=d.get('fasting', False),
                    allergens=allergens, kcal=d['kcal'], protein_g=d['protein'], spice=d['spice'],
                    traits=d['traits'], meals=d['meals'], serves=d.get('serves', 1),
                    options=_options(d), photo=S.PHOTOS[d['photo']],
                    popularity=int(count * d_rng.uniform(0.05, 0.5)) if i < 4 else int(count * d_rng.uniform(0.01, 0.15)),
                    rating=dish_rating, review_summary=_summary(d, d_rng),
                )
                dish_count += 1
                for _ in range(d_rng.randint(3, 6)):
                    good = d_rng.random() < 0.8
                    Review.objects.create(
                        restaurant=r, dish=dish, author=d_rng.choice(S.REVIEW_AUTHORS),
                        rating=d_rng.choice([4, 5, 5]) if good else d_rng.choice([2, 3]),
                        text=(d_rng.choice(S.REVIEW_GOOD) if good else d_rng.choice(S.REVIEW_MEH)).format(kind=d['kind']),
                        created_at=now - timedelta(days=d_rng.randint(1, 60), hours=d_rng.randint(0, 23)),
                    )
                    review_count += 1

        for slug, kind, okind, value, max_off, min_order, label in S.OFFERS:
            r = Restaurant.objects.get(slug=slug)
            dishes = list(r.dishes.filter(kind=kind)) if kind else [None]
            for dish in dishes:
                Offer.objects.create(restaurant=r, dish=dish, kind=okind, value=value, max_off=max_off, min_order=min_order, label=label)

        self.stdout.write(f'{len(areas)} areas · {Restaurant.objects.count()} kitchens · {dish_count} dishes · {review_count} reviews · {Offer.objects.count()} offers')
        if embed:
            n = embed_catalogue()
            self.stdout.write(f'embedded {n} rows')


def _options(d) -> list:
    if d['spice'] >= 1 and d['diet'] != 'veg' or d['kind'] in ('biryani', 'chole bhature', 'kulcha', 'momos', 'noodles', 'maggi', 'roll'):
        return [{'label': 'Spice', 'choices': ['Mild', 'Medium', 'Hot'], 'default': 'Medium'}]
    return []


def _summary(d, rng) -> list:
    phrases = [S.SUMMARY[t] for t in d['traits'] if t in S.SUMMARY]
    rng.shuffle(phrases)
    return (phrases + ['Good value', 'Reliable every time'])[:3]
