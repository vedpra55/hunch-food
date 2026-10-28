import uuid

from django.contrib.postgres.fields import ArrayField
from django.db import models

DIETS = [('nonveg', 'Everything'), ('eggetarian', 'Veg + eggs'), ('veg', 'Vegetarian'), ('jain', 'Jain'), ('vegan', 'Vegan')]


class Person(models.Model):
    """
    Everyone Hunch talks to. A guest (identified by a browser id) becomes a signed-in person
    when they verify their email; their conversation, cart and memories come with them.
    Hard rules live here as columns so tools can enforce them; soft taste lives in mem0.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    guest_id = models.CharField(max_length=64, unique=True, null=True, blank=True)
    auth_user_id = models.UUIDField(unique=True, null=True, blank=True)
    email = models.EmailField(blank=True)
    name = models.CharField(max_length=60, blank=True)
    phone = models.CharField(max_length=15, blank=True)

    diet = models.CharField(max_length=10, choices=DIETS, default='nonveg')
    allergies = ArrayField(models.CharField(max_length=12), default=list, blank=True)
    # 0 mild … 3 very hot
    spice = models.PositiveSmallIntegerField(default=1)
    budget = models.PositiveIntegerField(null=True, blank=True)
    # Weekdays (0 = Monday) with no meat. Only ever set because the person said so.
    veg_days = ArrayField(models.PositiveSmallIntegerField(), default=list, blank=True)
    goal = models.CharField(max_length=12, blank=True)
    goal_until = models.DateField(null=True, blank=True)
    # Rules switched off for today only: {"date": "2026-10-28", "off": ["vegDay"]}
    today = models.JSONField(default=dict, blank=True)

    onboarded = models.BooleanField(default=False)
    use_weather = models.BooleanField(default=True)
    nudge_on = models.BooleanField(default=True)
    nudge_at = models.TimeField(default='18:00')
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def signed_in(self) -> bool:
        return self.auth_user_id is not None

    def __str__(self):
        return self.name or self.email or str(self.id)


class Address(models.Model):
    person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name='addresses')
    label = models.CharField(max_length=30)
    line = models.CharField(max_length=160)
    area = models.ForeignKey('catalog.Area', on_delete=models.PROTECT)
    lat = models.FloatField()
    lng = models.FloatField()
    # On campus: "Gate 1", where the rider hands over.
    handoff = models.CharField(max_length=40, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_default', '-created_at']
