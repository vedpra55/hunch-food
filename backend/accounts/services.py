"""Changes to who someone is and where they are, shared by onboarding, the forms and the agent."""

from difflib import SequenceMatcher

from catalog.models import Area
from .models import Address, Person, TasteNote

MAX_NOTES = 20


def set_location(p: Person, area_id: str, detail: str = '') -> Address | None:
    """Make this area the delivery place. Detail is the block and room, or the street, if known."""
    area = Area.objects.filter(slug=area_id).first()
    if not area:
        return None
    detail = detail.strip()[:160]
    p.addresses.update(is_default=False)
    a = p.addresses.filter(area=area).first() or Address(person=p, area=area, lat=area.lat, lng=area.lng)
    a.label = 'Hostel' if area.campus else area.name.split(',')[0]
    a.line = detail or a.line or area.name
    a.handoff = 'Gate 1' if area.campus else ''
    a.is_default = True
    a.save()
    return a


def has_detail(a: Address | None) -> bool:
    """An area alone isn't enough for a rider: they need the block and room, or the street."""
    return bool(a) and a.line.strip() != a.area.name


def default_address(p: Person) -> Address | None:
    return p.addresses.select_related('area').filter(is_default=True).first() or p.addresses.select_related('area').first()


def note(p: Person, text: str) -> TasteNote | None:
    """Keep one copy of each taste: a near-repeat refreshes the old note instead of adding another."""
    text = ' '.join(text.split())[:160].rstrip('.')
    if len(text) < 3:
        return None
    for n in p.notes.all():
        if SequenceMatcher(None, n.text.lower(), text.lower()).ratio() > 0.8:
            n.text = text
            n.save(update_fields=['text', 'updated_at'])
            return n
    n = TasteNote.objects.create(person=p, text=text)
    for old in p.notes.all()[MAX_NOTES:]:
        old.delete()
    return n


def notes(p: Person) -> list[str]:
    return [n.text for n in p.notes.all()[:MAX_NOTES]]
