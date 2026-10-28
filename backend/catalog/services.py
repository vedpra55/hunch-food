"""Time, distance and the hard food rules. Pure functions over models; the agent's tools call these."""

import math
from datetime import datetime

from django.utils import timezone

from accounts.models import Person
from .models import Dish, Restaurant

# Kitchens deliver this far by road. LPU ↔ Phagwara is in reach; LPU ↔ Jalandhar is not.
MAX_KM = 12.0
DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
DIET_OK = {
    'nonveg': {'veg', 'egg', 'nonveg'},
    'eggetarian': {'veg', 'egg'},
    'veg': {'veg'},
    'jain': {'veg'},
    'vegan': {'veg'},
}


def now() -> datetime:
    return timezone.localtime()


def km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Straight-line distance × 1.3 for roads."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return round(2 * 6371 * math.asin(math.sqrt(a)) * 1.3, 1)


def eta_min(r: Restaurant, distance: float) -> int:
    return int(r.prep_min + 5 + distance * 3)


def _minutes(hhmm: str) -> int:
    h, m = hhmm.split(':')
    return int(h) * 60 + int(m)


def is_open(r: Restaurant, at: datetime | None = None) -> bool:
    at = at or now()
    opens, closes = r.hours.get(DAYS[at.weekday()], ['00:00', '00:00'])
    t, o, c = at.hour * 60 + at.minute, _minutes(opens), _minutes(closes)
    return o <= t < c if c > o else t >= o or t < c


def opens_label(r: Restaurant) -> str:
    opens = r.hours.get(DAYS[now().weekday()], ['00:00'])[0]
    h, m = map(int, opens.split(':'))
    suffix = 'am' if h < 12 else 'pm'
    h12 = h % 12 or 12
    return f'Opens {h12}{":%02d" % m if m else ""} {suffix}'


def veg_day_today(p: Person) -> bool:
    off = p.today.get('off', []) if p.today.get('date') == now().date().isoformat() else []
    return now().weekday() in p.veg_days and 'vegDay' not in off


def allowed(d: Dish, p: Person) -> bool:
    """The hard filter. A dish that fails this is never suggested, searched or added to a cart."""
    if d.diet not in DIET_OK[p.diet]:
        return False
    if p.diet == 'jain' and not d.jain:
        return False
    if p.diet == 'vegan' and not d.vegan:
        return False
    if set(d.allergens) & set(p.allergies):
        return False
    if veg_day_today(p) and d.diet != 'veg':
        return False
    return True


def why_not(d: Dish, p: Person) -> str | None:
    """Plain reason a dish is blocked, for the agent to say honestly."""
    if d.diet not in DIET_OK[p.diet] or (p.diet == 'jain' and not d.jain) or (p.diet == 'vegan' and not d.vegan):
        return f'{d.name} does not fit their diet ({p.get_diet_display()})'
    clash = set(d.allergens) & set(p.allergies)
    if clash:
        return f'{d.name} contains {", ".join(sorted(clash))}, which they are allergic to'
    if veg_day_today(p) and d.diet != 'veg':
        return f'today is their veg day'
    return None
