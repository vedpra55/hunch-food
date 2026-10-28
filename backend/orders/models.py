import uuid

from django.db import models


class CartLine(models.Model):
    person = models.ForeignKey('accounts.Person', on_delete=models.CASCADE, related_name='cart')
    dish = models.ForeignKey('catalog.Dish', on_delete=models.CASCADE)
    qty = models.PositiveSmallIntegerField(default=1)
    note = models.CharField(max_length=80, blank=True)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('person', 'dish')]
        ordering = ['added_at']


class Order(models.Model):
    """
    One order from one kitchen. Totals are computed on the server when the order is drafted
    and never taken from the client. Status moves with the clock (see orders.lifecycle), so no
    background job is needed.
    """

    DRAFT, AWAITING, PLACED, CANCELLED, FAILED = 'draft', 'awaiting_payment', 'placed', 'cancelled', 'failed'
    STATUSES = [(s, s) for s in (DRAFT, AWAITING, PLACED, CANCELLED, FAILED)]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    person = models.ForeignKey('accounts.Person', on_delete=models.CASCADE, related_name='orders')
    restaurant = models.ForeignKey('catalog.Restaurant', on_delete=models.PROTECT)
    status = models.CharField(max_length=20, choices=STATUSES, default=DRAFT)
    method = models.CharField(max_length=8, default='online')  # online | cod

    # Snapshot of where and who, so later profile edits never change a past order.
    address_label = models.CharField(max_length=30)
    address_line = models.CharField(max_length=160)
    handoff = models.CharField(max_length=40, blank=True)
    distance_km = models.FloatField()
    phone = models.CharField(max_length=15)
    name = models.CharField(max_length=60)

    item_total = models.PositiveIntegerField()
    delivery_fee = models.PositiveIntegerField()
    discount = models.PositiveIntegerField(default=0)
    total = models.PositiveIntegerField()
    offer_label = models.CharField(max_length=60, blank=True)

    eta_min = models.PositiveSmallIntegerField()
    placed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    rating = models.CharField(max_length=4, blank=True)

    payment_session_id = models.CharField(max_length=60, blank=True)
    payment_id = models.CharField(max_length=60, blank=True)
    payment_status = models.CharField(max_length=30, blank=True)
    refund_id = models.CharField(max_length=60, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    dish = models.ForeignKey('catalog.Dish', on_delete=models.PROTECT)
    name = models.CharField(max_length=100)
    price = models.PositiveIntegerField()
    qty = models.PositiveSmallIntegerField()


class PaymentEvent(models.Model):
    """Every webhook we accept, stored once (its id), so retries never apply twice."""

    event_id = models.CharField(max_length=80, unique=True)
    type = models.CharField(max_length=60)
    payload = models.JSONField()
    received_at = models.DateTimeField(auto_now_add=True)
