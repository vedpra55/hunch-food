"""
The harness, tested with a scripted model (no tokens): acknowledgement, steps, streamed words, the card,
retries, failures, and what the next turn reads. Plus onboarding and notes.
"""

import json
from types import SimpleNamespace as NS
from unittest import mock

from django.core.management import call_command
from django.test import TestCase

from accounts.models import Person
from accounts.services import note
from orders.services import add
from . import loop
from .models import AgentRun, Message
from .thread import current_conversation, transcript


def ev(type, **kw):
    return NS(type=type, **kw)


def call(name: str, args: dict, i: int) -> list:
    """A function call as the stream delivers it; the reply's arguments arrive in small pieces."""
    item = NS(type='function_call', name=name, arguments=json.dumps(args), call_id=f'c{i}')
    raw = json.dumps(args)
    pieces = [raw[k:k + 7] for k in range(0, len(raw), 7)]
    return ([ev('response.output_item.added', item=item, output_index=i)]
            + [ev('response.function_call_arguments.delta', delta=p, output_index=i) for p in pieces]
            + [ev('response.output_item.done', item=item, output_index=i)])


def round_(ack: str = '', calls: list = (), rid: str = 'r') -> list:
    out = [ev('response.output_text.delta', delta=w + ' ') for w in ack.split()] if ack else []
    for i, (name, args) in enumerate(calls):
        out += call(name, args, i + 1)
    usage = NS(input_tokens=100, output_tokens=20, input_tokens_details=NS(cached_tokens=60))
    return out + [ev('response.completed', response=NS(id=rid, usage=usage))]


class FakeModel:
    """Plays back one scripted round per request and records what each request sent."""

    def __init__(self, rounds: list):
        self.rounds, self.requests = list(rounds), []

    async def create(self, **kw):
        self.requests.append(kw)
        if not self.rounds:
            raise RuntimeError('model unavailable')
        events = self.rounds.pop(0)

        async def stream():
            for e in events:
                yield e

        return stream()


def reply(say, kind='none', ids=(), choices=None):
    return ('reply', {'say': say, 'show': {'kind': kind, 'ids': list(ids), 'pay': 'online'}, 'choices': choices})


SEARCH = ('search_food', {'query': 'momos', 'max_price': 150, 'veg_only': None, 'with_offer': None, 'restaurant_id': None, 'min_protein': None})


class LoopTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed', stdout=open('/dev/null', 'w'))

    def setUp(self):
        self.p = Person.objects.create(guest_id='g1', name='Ved', onboarded=True)
        patcher = mock.patch('catalog.search.is_open', return_value=True)
        patcher.start()
        self.addCleanup(patcher.stop)

    def turn(self, rounds, text='spicy momos under 150', turn_id='t1'):
        fake = FakeModel(rounds)
        client = NS(responses=fake)
        with mock.patch.object(loop, 'client', return_value=client):
            async def collect():
                return [e async for e in loop.run_turn(self.p.id, text, turn_id)]

            from asgiref.sync import async_to_sync
            events = async_to_sync(collect)()
        return events, fake

    def momo_ids(self):
        from catalog.search import search_dishes
        return [h.dish.slug for h in search_dishes(self.p, 'momos', max_price=150, limit=3)]

    def test_ack_steps_words_card(self):
        ids = self.momo_ids()
        events, fake = self.turn([
            round_('Momos under ₹150, got it. Checking kitchens near you.', [SEARCH], 'r1'),
            round_('', [reply('Veg Steamed Momos from Momo Junction, ₹20 off.', 'dishes', ids)], 'r2'),
        ])
        kinds = [e['type'] for e in events]
        self.assertEqual(kinds[0], 'ack')
        self.assertIn('step', kinds)
        said = ''.join(e['delta'] for e in events if e['type'] == 'say')
        self.assertEqual(said, 'Veg Steamed Momos from Momo Junction, ₹20 off.')  # streamed word by word, exactly
        done = events[-1]
        self.assertEqual(done['type'], 'done')
        m = done['message']
        self.assertEqual(m['ack'], 'Momos under ₹150, got it. Checking kitchens near you.')
        self.assertEqual(m['text'], said)
        self.assertEqual(m['components'][0]['kind'], 'dishes')
        self.assertEqual(m['steps'][0]['summary'][:5], 'Found')
        # Rounds in a turn are chained; the turn itself starts fresh with our own transcript.
        self.assertIsNone(fake.requests[0]['previous_response_id'])
        self.assertEqual(fake.requests[1]['previous_response_id'], 'r1')
        self.assertEqual(fake.requests[0]['input'][-1], {'role': 'user', 'content': 'spicy momos under 150'})
        self.assertEqual(AgentRun.objects.get().cached_tokens, 120)

    def test_small_talk_is_one_round(self):
        events, fake = self.turn([round_('', [reply('Anytime, Ved.')])], text='thanks')
        self.assertEqual(len(fake.requests), 1)
        self.assertEqual(events[-1]['message']['text'], 'Anytime, Ved.')
        self.assertFalse([e for e in events if e['type'] == 'ack'])

    def test_bad_reply_is_retried_by_the_model(self):
        ids = self.momo_ids()
        events, fake = self.turn([
            round_('Checking.', [SEARCH]),
            round_('', [reply('Try these.', 'dishes', ['made-up-id'])], 'r2'),
            round_('', [reply('These, then.', 'dishes', ids)], 'r3'),
        ])
        self.assertIn('say_reset', [e['type'] for e in events])
        self.assertEqual(events[-1]['message']['text'], 'These, then.')
        self.assertIn('None of those dish ids', fake.requests[2]['input'][0]['output'])

    def test_failure_leaves_the_thread_as_it_was(self):
        events, _ = self.turn([round_('Checking.', [SEARCH])])  # then the model goes away
        self.assertEqual(events[-1]['type'], 'error')
        self.assertEqual(events[-1]['retry'], 'spicy momos under 150')
        self.assertFalse(Message.objects.filter(role='user').exists())
        self.assertFalse(Message.objects.filter(role='hunch').exists())

    def test_next_turn_reads_what_was_shown_and_what_happened_in_the_app(self):
        ids = self.momo_ids()
        self.turn([round_('', [SEARCH]), round_('', [reply('Momos it is.', 'dishes', ids)])])
        self.client.post('/api/cart', json.dumps({'dish_id': ids[0], 'add': 1}), content_type='application/json', HTTP_X_GUEST_ID='g1')
        _, fake = self.turn([round_('', [reply('Done.')])], text='and a coke', turn_id='t2')
        sent = fake.requests[0]['input']
        self.assertIn(ids[0], sent[1]['content'])  # what Hunch showed, with ids
        self.assertEqual(sent[2]['role'], 'developer')
        self.assertIn('Added 1×', sent[2]['content'])

    def test_checkout_reply_without_details_shows_the_form(self):
        add(self.p, self.momo_ids()[0])
        events, _ = self.turn([round_('', [reply('Paying now!', 'checkout')])], text='order it')
        m = events[-1]['message']
        self.assertEqual(m['components'][0]['kind'], 'collect')
        self.assertTrue(m['text'].startswith('Before I place it'))

    def test_partial_say(self):
        self.assertEqual(loop.partial_string('{"say":"Hi \\"Ved\\", ₹1', 'say'), 'Hi "Ved", ₹1')
        self.assertEqual(loop.partial_string('{"sa', 'say'), '')


class ChatViewTests(TestCase):
    def setUp(self):
        self.p = Person.objects.create(guest_id='g2', name='Ved', onboarded=True)

    def test_a_retried_send_replays_instead_of_running_again(self):
        conv = current_conversation(self.p)
        Message.objects.create(conversation=conv, role='user', text='hi', turn_id='same')
        Message.objects.create(conversation=conv, role='hunch', text='Hey Ved.')
        r = self.client.post('/api/chat', json.dumps({'text': 'hi', 'turn_id': 'same'}), content_type='application/json', HTTP_X_GUEST_ID='g2')
        from asgiref.sync import async_to_sync

        async def read():
            return b''.join([c async for c in r.streaming_content]).decode()

        self.assertIn('Hey Ved.', async_to_sync(read)())

    def test_one_turn_at_a_time(self):
        from django.utils import timezone
        from datetime import timedelta
        conv = current_conversation(self.p)
        conv.busy_until = timezone.now() + timedelta(seconds=60)
        conv.save()
        r = self.client.post('/api/chat', json.dumps({'text': 'hi', 'turn_id': 'x'}), content_type='application/json', HTTP_X_GUEST_ID='g2')
        self.assertEqual(r.status_code, 409)


class SetupAndNotesTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed', stdout=open('/dev/null', 'w'))

    def test_onboarding_saves_everything_and_marks_the_thread(self):
        r = self.client.post('/api/onboarding', json.dumps({'name': 'Ved', 'area_id': 'phg-gt-road', 'diet': 'veg', 'allergies': ['nuts', 'bogus']}),
                             content_type='application/json', HTTP_X_GUEST_ID='g3')
        prof = r.json()['profile']
        self.assertEqual((prof['name'], prof['diet'], prof['allergies'], prof['onboarded']), ('Ved', 'veg', ['nuts'], True))
        p = Person.objects.get(guest_id='g3')
        self.assertEqual(p.addresses.get().area.slug, 'phg-gt-road')
        self.assertTrue(Message.objects.filter(role='event', kind='setup').exists())

    def test_notes_do_not_repeat(self):
        p = Person.objects.create(guest_id='g4')
        note(p, 'Hates coriander')
        note(p, 'hates coriander.')
        note(p, 'Orders after the 9 pm lab')
        self.assertEqual(p.notes.count(), 2)

    def test_transcript_marks_app_events(self):
        p = Person.objects.create(guest_id='g5')
        conv = current_conversation(p)
        Message.objects.create(conversation=conv, role='event', kind='paid', text='Paid ₹85')
        self.assertEqual(transcript(conv)[0]['role'], 'developer')
