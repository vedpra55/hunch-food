"""
One turn of Hunch, streamed. The shape the person feels:

  ack     "Spicy, under ₹150, got it. Checking kitchens near Law Gate."   (text before tools)
  steps   ✓ Searching kitchens near Law Gate for spicy · Found 6, 2 with offers
  voice   "Chilli Paneer from Momo Junction, ₹30 off and here in 18 min."
  thing   [dish cards]

Events (server-sent, one JSON per line): text, ack, step, component, cart, profile, done, error.
The OpenAI transcript is kept server-side (store=True) and chained by response id; instructions are
rebuilt every request so the context (cart, time, memories) is always current.
"""

import json
import logging
import time
from typing import AsyncIterator

from asgiref.sync import sync_to_async
from django.conf import settings
from django.utils import timezone
from openai import AsyncOpenAI

from accounts.models import Person
from orders.services import cart_view
from . import memory
from .models import AgentRun, Conversation, Message
from .prompt import SYSTEM, context
from .tools import DISPLAY, TOOLS, Toolbox, dumps

log = logging.getLogger('hunch')
MAX_ROUNDS = 5
# After this many turns a thread starts a fresh model chain (cost stays flat); the person's thread is unchanged.
CHAIN_TURNS = 14

_client: AsyncOpenAI | None = None


def client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


def current_conversation(p: Person) -> Conversation:
    c = p.conversations.filter(ended_at__isnull=True).order_by('-started_at').first()
    return c or Conversation.objects.create(person=p)


async def run_turn(person_id, text: str, event: str | None = None) -> AsyncIterator[dict]:
    started = time.monotonic()
    p = await sync_to_async(Person.objects.get)(id=person_id)
    conv = await sync_to_async(current_conversation)(p)
    box = Toolbox(p)

    user_text = text.strip()[:1000]
    if event == 'open':
        model_input = [{'role': 'developer', 'content': 'The person just opened Hunch. Greet them and begin.'}]
    else:
        model_input = [{'role': 'user', 'content': user_text}]
        await sync_to_async(Message.objects.create)(conversation=conv, role='user', text=user_text)

    previous = conv.last_response_id or None
    if previous and conv.turns >= CHAIN_TURNS:
        previous = None
    if previous and conv.pending:
        # The last turn ended on a display tool; the model is owed those outputs first.
        model_input = conv.pending + model_input
    elif not previous:
        model_input = (await sync_to_async(_recent_as_context)(conv)) + model_input
    conv.pending = []

    memories = await sync_to_async(memory.recall)(str(p.id), user_text or 'food preferences')
    instructions = SYSTEM + '\n' + await sync_to_async(context)(p, memories)

    ack_parts: list[str] = []
    steps: list[dict] = []
    components: list[dict] = []
    final = ''
    used: list[str] = []
    usage = {'in': 0, 'out': 0}
    rounds = 0
    error = ''

    try:
        for rounds in range(1, MAX_ROUNDS + 1):
            stream = await client().responses.create(
                model=settings.OPENAI_MODEL,
                instructions=instructions,
                input=model_input,
                previous_response_id=previous,
                tools=TOOLS,
                parallel_tool_calls=True,
                reasoning={'effort': 'low'},
                max_output_tokens=1200,
                store=True,
                stream=True,
            )
            text_now, calls, response = '', [], None
            async for e in stream:
                if e.type == 'response.output_text.delta':
                    text_now += e.delta
                    yield {'type': 'text', 'delta': e.delta}
                elif e.type == 'response.output_item.done' and e.item.type == 'function_call':
                    calls.append(e.item)
                elif e.type == 'response.completed':
                    response = e.response
            if response is None:
                raise RuntimeError('The model stream ended early')
            previous = response.id
            if response.usage:
                usage['in'] += response.usage.input_tokens
                usage['out'] += response.usage.output_tokens

            if not calls:
                final = text_now
                break

            outputs, ended = [], False
            for c in calls:
                args = json.loads(c.arguments or '{}')
                used.append(c.name)
                label = await sync_to_async(box.label)(c.name, args)
                sid = f's{len(steps) + 1}'
                if label:
                    yield {'type': 'step', 'id': sid, 'label': label, 'status': 'running'}
                res = await sync_to_async(box.run)(c.name, args)
                for ev in res.events:
                    yield ev
                if label:
                    steps.append({'id': sid, 'label': label, 'summary': res.summary})
                    yield {'type': 'step', 'id': sid, 'label': label, 'status': 'done', 'summary': res.summary}
                if res.component:
                    components.append(res.component)
                    yield {'type': 'component', 'component': res.component}
                outputs.append({'type': 'function_call_output', 'call_id': c.call_id, 'output': dumps(res.output)})
                # A display tool that failed (closed kitchen, empty cart) hands back to the model to explain.
                ended = ended or (c.name in DISPLAY and res.component is not None)

            if ended:
                # What it said alongside what it showed is the answer.
                final = text_now
                conv.pending = outputs
                break
            # Words before working tools were the acknowledgement.
            if text_now.strip():
                ack_parts.append(text_now.strip())
                yield {'type': 'ack'}
            model_input = outputs
        else:
            final = final or "I couldn't finish that one. Try asking a little differently?"
    except Exception as e:  # the person always gets an answer, never a stack trace
        log.exception('agent turn failed')
        error = str(e)[:500]
        # A half-finished chain can't be continued; the next turn starts a fresh one.
        previous = None
        final = "Something went wrong on my side. Try that again?"
        yield {'type': 'error', 'message': final}

    if not error and not components and (box.cards or box.restaurants):
        # It looked things up and answered but forgot to show them: show what it found, what it named first.
        kind, found = ('dishes', box.cards) if box.cards else ('restaurants', box.restaurants)
        named = [c for c in found.values() if c['name'].lower() in final.lower()]
        auto = {'kind': kind, 'items': (named + [c for c in found.values() if c not in named])[:5 if kind == 'dishes' else 3]}
        components.append(auto)
        yield {'type': 'component', 'component': auto}
    if not final.strip() and not error:
        # Never leave the person with a card and no words.
        final = _words_for(components[-1]) if components else ' '.join(ack_parts)
        if final:
            yield {'type': 'text', 'delta': final}
    conv.last_response_id = previous or ''
    conv.turns += 1
    msg = await sync_to_async(_save)(conv, ' '.join(ack_parts), final.strip(), steps, components)
    await sync_to_async(AgentRun.objects.create)(
        conversation=conv, model=settings.OPENAI_MODEL, rounds=rounds, tools=used,
        input_tokens=usage['in'], output_tokens=usage['out'], ms=int((time.monotonic() - started) * 1000), error=error,
    )
    yield {'type': 'done', 'message_id': msg.id, 'cart': await sync_to_async(cart_view)(p), 'usage': usage}

    if user_text and final and not error:
        # After the person has their answer: let mem0 decide what's worth keeping.
        await sync_to_async(memory.remember_turn)(str(p.id), user_text, final)


def _words_for(c: dict) -> str:
    if c['kind'] == 'collect':
        need = {'name': 'your name', 'phone': 'a phone number for the rider', 'address': 'your block and room (or street)', 'sign_in': 'a quick email sign-in'}
        items = [need[m] for m in c['missing'] if m in need]
        return 'Before I place it, I need ' + (', '.join(items[:-1]) + ' and ' + items[-1] if len(items) > 1 else items[0]) + '.'
    if c['kind'] == 'choices':
        return c['question']
    if c['kind'] == 'checkout':
        o = c['order']
        return f"₹{o['total']} from {o['restaurant']}, about {o['eta_min']} min. Tap Pay when you're ready."
    return ''


def _save(conv: Conversation, ack: str, text: str, steps: list, components: list) -> Message:
    conv.save(update_fields=['last_response_id', 'pending', 'turns'])
    return Message.objects.create(conversation=conv, role='hunch', ack=ack, text=text, steps=steps, components=components)


def _recent_as_context(conv: Conversation) -> list[dict]:
    """A new model chain on an old thread: hand over the last few lines as plain text."""
    recent = list(conv.messages.order_by('-created_at')[:6])[::-1]
    if not recent:
        return []
    lines = '\n'.join(f"{'Person' if m.role == 'user' else 'Hunch'}: {m.text}" for m in recent if m.text)
    return [{'role': 'developer', 'content': f'Earlier in this conversation:\n{lines}'}]


def reset(p: Person) -> Conversation:
    """New conversation: the thread, the cart and today's switches clear; orders and memories stay."""
    p.conversations.filter(ended_at__isnull=True).update(ended_at=timezone.now())
    p.cart.all().delete()
    p.today = {}
    p.save(update_fields=['today'])
    return Conversation.objects.create(person=p)
