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
        self.assertEqual(S.missing_for_checkout(self.p), ['phone', 'address'])
        with override_settings(AUTH_REQUIRED=True):
            self.assertEqual(S.missing_for_checkout(self.p), ['phone', 'address', 'sign_in'])
        with self.assertRaises(S.CartError):
            S.draft_order(self.p)

    def test_same_cart_reuses_the_unpaid_order(self):
        self.ready()
        S.add(self.p, 'momo-junction-veg-steamed-momos', 2)
        first = S.draft_order(self.p)
        self.assertEqual(S.draft_order(self.p).id, first.id)
        S.add(self.p, 'momo-junction-veg-steamed-momos', 1)
        second = S.draft_order(self.p)
        self.assertNotEqual(second.id, first.id)
        first.refresh_from_db()
        self.assertEqual(first.status, Order.FAILED)

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
        msg = self.client.post('/api/checkout', json.dumps({'method': 'cod'}), content_type='application/json', **h).json()['message']
        order = msg['components'][0]['order']
        placed = self.client.post(f"/api/orders/{order['id']}/pay", **h).json()['order']
        self.assertEqual(placed['status'], 'placed')
        self.assertEqual(placed['stage'], 'cooking')
        # The thread, as a reload shows it: the checkout card is now the placed order, and the event says so.
        thread = self.client.get('/api/home', **h).json()['messages']
        cards = [c for m in thread for c in m['components'] if c['kind'] == 'checkout']
        self.assertEqual(cards[0]['order']['status'], 'placed')
        self.assertTrue(any(m['role'] == 'event' and m['kind'] == 'paid' for m in thread))


class PaymentSyncTests(Base):
    """No webhook: reading an unpaid order asks Dodo (mocked here) and applies the answer once."""

    def awaiting(self):
        self.ready()
        S.add(self.p, 'momo-junction-veg-steamed-momos', 1)
        o = S.draft_order(self.p)
        o.status, o.payment_session_id, o.payment_url = Order.AWAITING, 'cks_1', 'https://pay.example/1'
        o.save()
        return o

    def setUp(self):
        super().setUp()
        from django.core.cache import cache
        cache.clear()

    def test_paid_order_is_placed_on_read(self):
        o = self.awaiting()
        with mock.patch.object(payments, 'session_status', return_value=('succeeded', 'pay_1')):
            payments.sync_all(self.p)
        o.refresh_from_db()
        self.assertEqual((o.status, o.payment_id), (Order.PLACED, 'pay_1'))
        self.assertEqual(self.p.cart.count(), 0)
        from agent.models import Message
        self.assertEqual(Message.objects.filter(role='event', kind='paid').count(), 1)
        # Applying the same answer again changes nothing and says nothing new.
        payments.apply(o, 'succeeded', 'pay_1')
        self.assertEqual(Message.objects.filter(role='event', kind='paid').count(), 1)

    def test_pending_stays_pending_and_pay_reopens_the_same_page(self):
        o = self.awaiting()
        with mock.patch.object(payments, 'session_status', return_value=('', '')):
            r = self.client.post(f'/api/orders/{o.id}/pay', HTTP_X_GUEST_ID='t1').json()
        self.assertEqual(r['checkout_url'], 'https://pay.example/1')
        o.refresh_from_db()
        self.assertEqual(o.status, Order.AWAITING)

    def test_a_new_checkout_never_loses_a_paid_order(self):
        o = self.awaiting()
        with mock.patch.object(payments, 'session_status', return_value=('succeeded', 'pay_2')):
            # They paid, came back, and tapped Checkout again before anything synced.
            r = self.client.post('/api/checkout', '{}', content_type='application/json', HTTP_X_GUEST_ID='t1')
        o.refresh_from_db()
        self.assertEqual(o.status, Order.PLACED)
        self.assertEqual(r.status_code, 409)  # the cart emptied when it was placed

    def test_superseded_order_paid_late_still_places(self):
        o = self.awaiting()
        o.status = Order.FAILED
        o.save()
        with mock.patch.object(payments, 'session_status', return_value=('succeeded', 'pay_3')):
            payments.sync_all(self.p)
        o.refresh_from_db()
        self.assertEqual(o.status, Order.PLACED)

    def test_failed_payment_says_so_once(self):
        o = self.awaiting()
        with mock.patch.object(payments, 'session_status', return_value=('failed', 'pay_4')):
            payments.sync_all(self.p)
        o.refresh_from_db()
        self.assertEqual(o.status, Order.FAILED)
        from agent.models import Message
        self.assertEqual(Message.objects.filter(kind='payment_failed').count(), 1)


class WebhookTests(TestCase):
    @override_settings(DODO_WEBHOOK_SECRET='whsec_' + base64.b64encode(b'secret-key-123').decode())
    def test_signature(self):
        body, wid, ts = b'{"type":"payment.succeeded"}', 'msg_1', str(int(time.time()))
        sig = base64.b64encode(hmac.new(b'secret-key-123', f'{wid}.{ts}.'.encode() + body, hashlib.sha256).digest()).decode()
        self.assertTrue(payments.verify_webhook(body, {'webhook-id': wid, 'webhook-timestamp': ts, 'webhook-signature': f'v1,{sig}'}))
        self.assertFalse(payments.verify_webhook(body + b' ', {'webhook-id': wid, 'webhook-timestamp': ts, 'webhook-signature': f'v1,{sig}'}))


class ToolTests(Base):
    """The agent's tools, run directly: what the model can and cannot do."""

    def reply(self, box, say, kind='none', ids=(), choices=None):
        return box.run('reply', {'say': say, 'show': {'kind': kind, 'ids': list(ids), 'pay': 'online'}, 'choices': choices})

    def test_search_then_reply_then_cart_then_checkout_gate(self):
        box = Toolbox(self.p)
        res = box.run('search_food', {'query': 'kulcha', 'max_price': None, 'veg_only': None, 'with_offer': None, 'restaurant_id': None, 'min_protein': None})
        ids = [d['id'] for d in res.output['dishes']]
        self.assertTrue(ids)
        self.reply(box, 'Kulcha time.', 'dishes', ids[:3])
        self.assertEqual(box.final['components'][0]['kind'], 'dishes')
        cart = box.run('update_cart', {'changes': [{'dish_id': ids[0], 'qty': 1, 'note': None}], 'clear_first': None})
        self.assertEqual(cart.events[0]['cart']['count'], 1)
        box = Toolbox(self.p)
        self.reply(box, 'Ready to pay!', 'checkout')
        card = box.final['components'][0]
        self.assertEqual(card['kind'], 'collect')
        self.assertIn('phone', card['missing'])
        self.assertIn('phone number', box.final['say'])  # the form's words, not the model's guess

    def test_reply_with_made_up_ids_goes_back_to_the_model(self):
        box = Toolbox(self.p)
        res = self.reply(box, 'Try these.', 'dishes', ['no-such-dish'])
        self.assertIn('error', res.output)
        self.assertIsNone(box.final)

    def test_checkout_on_empty_cart_goes_back_to_the_model(self):
        box = Toolbox(self.p)
        res = self.reply(box, 'Pay now.', 'checkout')
        self.assertIn('empty', res.output['error'])

    def test_choices_ride_with_the_words(self):
        box = Toolbox(self.p)
        self.reply(box, 'Veg or non-veg?', choices={'options': ['Veg', 'Non-veg'], 'multi': False})
        self.assertEqual(box.final['components'], [{'kind': 'choices', 'options': ['Veg', 'Non-veg'], 'multi': False}])

    def test_profile_rules_are_enforced_after_saving(self):
        box = Toolbox(self.p)
        box.run('save_profile', {'name': None, 'diet': 'veg', 'allergies': None, 'spice': None, 'budget': None, 'veg_days': None, 'phone': None, 'onboarded': None})
        res = box.run('update_cart', {'changes': [{'dish_id': 'biryani-bros-chicken-dum-biryani', 'qty': 1, 'note': None}], 'clear_first': None})
        self.assertIn('errors', res.output)
        self.assertEqual(res.events[0]['cart']['count'], 0)
