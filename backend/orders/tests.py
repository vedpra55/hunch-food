import base64
import hashlib
import hmac
import json
import time
from datetime import timedelta
from unittest import mock

from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone

from accounts.models import Address, Person
from agent.tools import Toolbox
from catalog.models import Area, Dish
from catalog.search import search_dishes, search_restaurants
from . import payments
from . import services as S
from .models import Order


def open_all_kitchens():
    """Tests shouldn't depend on the hour they run at."""
    return mock.patch('catalog.search.is_open', return_value=True), mock.patch('orders.services.is_open', return_value=True)


class Base(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed', stdout=open('/dev/null', 'w'))

    def setUp(self):
        self.patches = [p.start() for p in open_all_kitchens()]
        self.addCleanup(mock.patch.stopall)
        self.p = Person.objects.create(guest_id='t1', name='Amit')

    def ready(self, p=None):
        p = p or self.p
        p.phone, p.auth_user_id, p.email = '9876543210', '00000000-0000-0000-0000-000000000001', 'a@b.co'
        p.save()
        area = Area.objects.get(slug='lpu-bh')
        Address.objects.create(person=p, label='BH-4', line='Room 212, BH-4', area=area, lat=area.lat, lng=area.lng, handoff='Gate 1', is_default=True)


class RulesTests(Base):
    def test_seed_is_big_enough(self):
        self.assertGreaterEqual(Dish.objects.count(), 300)

    def test_veg_person_never_sees_meat(self):
        self.p.diet = 'veg'
        self.p.save()
        hits = search_dishes(self.p, 'chicken biryani', limit=8)
        self.assertTrue(hits)
        self.assertEqual({h.dish.diet for h in hits}, {'veg'})

    def test_allergy_filters(self):
        self.p.allergies = ['dairy']
        self.p.save()
        self.assertFalse(any('dairy' in h.dish.allergens for h in search_dishes(self.p, 'paneer', limit=8)))

    def test_jalandhar_is_out_of_reach_from_lpu(self):
        r = next(r for r in search_restaurants(self.p, 'Jalandhar Lassi Wala', limit=6) if r['id'] == 'jalandhar-lassi-wala')
        self.assertFalse(r['delivers_here'])
        self.assertTrue(all(h.distance <= 12 for h in search_dishes(self.p, 'lassi', limit=8)))

    def test_specific_words_win(self):
        self.assertTrue(all('momo' in h.dish.kind for h in search_dishes(self.p, 'momos', limit=4)))
        self.assertTrue(all(h.offer for h in search_dishes(self.p, '', with_offer=True, limit=5)))


class CartTests(Base):
    def test_one_kitchen_per_cart(self):
        S.add(self.p, 'momo-junction-veg-steamed-momos')
        with self.assertRaises(S.CartError):
            S.add(self.p, 'pizza-pind-margherita')

    def test_blocked_dish_cannot_be_added(self):
        self.p.diet = 'veg'
        self.p.save()
        with self.assertRaises(S.CartError):
            S.add(self.p, 'chaheru-da-dhaba-butter-chicken-2-naan')

    def test_offer_applied_once_server_side(self):
        S.set_qty(self.p, 'chaheru-da-dhaba-butter-chicken-2-naan', 2)
        c = S.cart_view(self.p)
        self.assertEqual(c['discount'], 100)  # ₹50 off each butter chicken
        self.assertEqual(c['total'], c['item_total'] + c['delivery_fee'] - 100)


class CheckoutTests(Base):
    def test_gate_names_what_is_missing(self):
        S.add(self.p, 'momo-junction-veg-steamed-momos')
        self.assertEqual(S.missing_for_checkout(self.p), ['phone', 'address', 'sign_in'])
        with self.assertRaises(S.CartError):
            S.draft_order(self.p)

    def test_draft_and_lifecycle(self):
        self.ready()
        S.add(self.p, 'momo-junction-veg-steamed-momos', 2)
        o = S.draft_order(self.p)
        self.assertEqual(o.status, Order.DRAFT)
        self.assertEqual(o.handoff, 'Gate 1')
        S.place(o)
        self.assertEqual(self.p.cart.count(), 0)
        self.assertEqual(S.stage(o)['stage'], 'cooking')
        self.assertTrue(S.cancellable(o))
        o.placed_at = timezone.now() - timedelta(minutes=o.eta_min + 1)
        self.assertEqual(S.stage(o)['stage'], 'delivered')
        self.assertFalse(S.cancellable(o))

    def test_api_cod_flow(self):
        self.ready()
        h = {'HTTP_X_DEV_EMAIL': 'a@b.co'}
        p = self.client.get('/api/me', **h).json()['profile']
        person = Person.objects.get(id=p['id'])
        person.phone, person.name = '9876543210', 'Amit'
        person.save()
        area = Area.objects.get(slug='law-gate')
        Address.objects.create(person=person, label='PG', line='Near Law Gate', area=area, lat=area.lat, lng=area.lng, is_default=True)
        self.client.post('/api/cart', json.dumps({'dish_id': 'law-gate-kulcha-house-amritsari-aloo-kulcha', 'add': 2}), content_type='application/json', **h)
        order = self.client.post('/api/checkout', json.dumps({'method': 'cod'}), content_type='application/json', **h).json()['order']
        placed = self.client.post(f"/api/orders/{order['id']}/pay", **h).json()['order']
        self.assertEqual(placed['status'], 'placed')
        self.assertEqual(placed['stage'], 'cooking')


class WebhookTests(TestCase):
    @override_settings(DODO_WEBHOOK_SECRET='whsec_' + base64.b64encode(b'secret-key-123').decode())
    def test_signature(self):
        body, wid, ts = b'{"type":"payment.succeeded"}', 'msg_1', str(int(time.time()))
        sig = base64.b64encode(hmac.new(b'secret-key-123', f'{wid}.{ts}.'.encode() + body, hashlib.sha256).digest()).decode()
        self.assertTrue(payments.verify_webhook(body, {'webhook-id': wid, 'webhook-timestamp': ts, 'webhook-signature': f'v1,{sig}'}))
        self.assertFalse(payments.verify_webhook(body + b' ', {'webhook-id': wid, 'webhook-timestamp': ts, 'webhook-signature': f'v1,{sig}'}))


class ToolTests(Base):
    """The agent's tools, run directly: what the model can and cannot do."""

    def test_search_then_show_then_cart_then_checkout_gate(self):
        box = Toolbox(self.p)
        res = box.run('search_food', {'query': 'kulcha', 'max_price': None, 'veg_only': None, 'with_offer': None, 'restaurant_id': None, 'min_protein': None})
        ids = [d['id'] for d in res.output['dishes']]
        self.assertTrue(ids)
        shown = box.run('show_dishes', {'dish_ids': ids[:3]})
        self.assertEqual(shown.component['kind'], 'dishes')
        cart = box.run('update_cart', {'changes': [{'dish_id': ids[0], 'qty': 1, 'note': None}], 'clear_first': None})
        self.assertEqual(cart.events[0]['cart']['count'], 1)
        gate = box.run('checkout', {'method': 'online'})
        self.assertEqual(gate.component['kind'], 'collect')
        self.assertIn('phone', gate.component['missing'])

    def test_profile_rules_are_enforced_after_saving(self):
        box = Toolbox(self.p)
        box.run('save_profile', {'name': None, 'diet': 'veg', 'allergies': None, 'spice': None, 'budget': None, 'veg_days': None, 'phone': None, 'onboarded': None})
        res = box.run('update_cart', {'changes': [{'dish_id': 'biryani-bros-chicken-dum-biryani', 'qty': 1, 'note': None}], 'clear_first': None})
        self.assertIn('errors', res.output)
        self.assertEqual(res.events[0]['cart']['count'], 0)
