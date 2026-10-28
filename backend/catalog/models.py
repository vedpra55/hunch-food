from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models
from pgvector.django import HnswIndex, VectorField

DIETS = [('veg', 'Veg'), ('egg', 'Egg'), ('nonveg', 'Non-veg')]


class Area(models.Model):
    """A place Hunch delivers to: LPU blocks, Law Gate, Phagwara and Jalandhar neighbourhoods."""

    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=80)
    city = models.CharField(max_length=40)
    lat = models.FloatField()
    lng = models.FloatField()
    # Riders can't enter campus hostels: orders meet the person at a gate.
    campus = models.BooleanField(default=False)

    def __str__(self):
        return self.name


class Restaurant(models.Model):
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=80)
    area = models.ForeignKey(Area, on_delete=models.PROTECT, related_name='restaurants')
    cuisines = ArrayField(models.CharField(max_length=40), default=list)
    description = models.TextField(blank=True)
    lat = models.FloatField()
    lng = models.FloatField()
    rating = models.DecimalField(max_digits=2, decimal_places=1)
    rating_count = models.PositiveIntegerField(default=0)
    price_for_two = models.PositiveIntegerField()
    pure_veg = models.BooleanField(default=False)
    # {"mon": ["11:00", "23:00"], ...}; a close time before the open time means after midnight.
    hours = models.JSONField(default=dict)
    prep_min = models.PositiveSmallIntegerField(default=15)
    delivery_fee = models.PositiveSmallIntegerField(default=0)
    photo = models.URLField(blank=True)
    active = models.BooleanField(default=True)
    embedding = VectorField(dimensions=settings.EMBED_DIMS, null=True, blank=True)

    class Meta:
        indexes = [HnswIndex(name='restaurant_embedding', fields=['embedding'], m=16, ef_construction=64, opclasses=['vector_cosine_ops'])]

    def __str__(self):
        return self.name


class MenuCategory(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=60)
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['position']


class Dish(models.Model):
    slug = models.SlugField(unique=True)
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='dishes')
    category = models.ForeignKey(MenuCategory, on_delete=models.SET_NULL, null=True, related_name='dishes')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    # "the same thing elsewhere" for deals and search: "kulcha", "biryani", "momos"
    kind = models.CharField(max_length=40)
    price = models.PositiveIntegerField()
    diet = models.CharField(max_length=6, choices=DIETS)
    jain = models.BooleanField(default=False)
    vegan = models.BooleanField(default=False)
    fasting = models.BooleanField(default=False)
    allergens = ArrayField(models.CharField(max_length=12), default=list)
    kcal = models.PositiveSmallIntegerField()
    protein_g = models.PositiveSmallIntegerField()
    spice = models.PositiveSmallIntegerField(default=1)
    traits = ArrayField(models.CharField(max_length=12), default=list)
    meals = ArrayField(models.CharField(max_length=10), default=list)
    serves = models.PositiveSmallIntegerField(default=1)
    options = models.JSONField(default=list, blank=True)
    photo = models.URLField(blank=True)
    popularity = models.PositiveIntegerField(default=0)
    rating = models.DecimalField(max_digits=2, decimal_places=1, default=4.2)
    review_summary = ArrayField(models.CharField(max_length=60), default=list)
    available = models.BooleanField(default=True)
    embedding = VectorField(dimensions=settings.EMBED_DIMS, null=True, blank=True)

    class Meta:
        indexes = [
            HnswIndex(name='dish_embedding', fields=['embedding'], m=16, ef_construction=64, opclasses=['vector_cosine_ops']),
            models.Index(fields=['kind']),
        ]

    def __str__(self):
        return f'{self.name} · {self.restaurant.name}'


class Review(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='reviews')
    dish = models.ForeignKey(Dish, on_delete=models.CASCADE, null=True, blank=True, related_name='reviews')
    author = models.CharField(max_length=40)
    rating = models.PositiveSmallIntegerField()
    text = models.CharField(max_length=240)
    created_at = models.DateTimeField()

    class Meta:
        ordering = ['-created_at']


class Offer(models.Model):
    FLAT, PERCENT = 'flat', 'percent'
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='offers')
    dish = models.ForeignKey(Dish, on_delete=models.CASCADE, null=True, blank=True, related_name='offers')
    kind = models.CharField(max_length=8, choices=[(FLAT, 'Flat'), (PERCENT, 'Percent')])
    value = models.PositiveIntegerField()
    max_off = models.PositiveIntegerField(null=True, blank=True)
    min_order = models.PositiveIntegerField(default=0)
    label = models.CharField(max_length=60)
    active = models.BooleanField(default=True)

    def discount(self, amount: int) -> int:
        if amount < self.min_order:
            return 0
        off = self.value if self.kind == self.FLAT else amount * self.value // 100
        return min(off, self.max_off or off, amount)
