"""
One turn of Hunch, streamed. The shape the person feels:

  ack     "Spicy, under ₹150, got it. Checking kitchens near Law Gate."   (plain text before tools)
  steps   ✓ Searching kitchens near Law Gate for spicy · Found 6, 2 with offers
  say     "Chilli Paneer from Momo Junction, ₹30 off and here in 18 min."  (the reply's words)
  card    [dish cards]                                                     (the reply's card)

Events (server-sent, one JSON each): ack, step, say, cart, profile, done, error.
`done` carries the saved message: the client replaces its live copy with it, so what streamed and
what a reload shows are the same thing.

Each turn starts clean: instructions (fixed rules, then this moment's context) plus the recent thread
from our database. Rounds within a turn are chained by response id; nothing carries across turns, so
a failed or stopped turn can't break the next one.
"""

import asyncio
import json
import logging
import time
from typing import AsyncIterator

from asgiref.sync import sync_to_async
from django.conf import settings
from django.utils import timezone
from openai import AsyncOpenAI

from accounts.models import Person
from orders.payments import sync_all
from orders.services import cart_view
from .models import AgentRun, Conversation, Message
from .prompt import SYSTEM, context
from .thread import current_conversation, message_view, transcript
from .tools import TOOLS, Toolbox, dumps

log = logging.getLogger('hunch')
MAX_ROUNDS = 5
SORRY = "Something went wrong on my side. Try that again?"

_client: AsyncOpenAI | None = None


def client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY, timeout=45, max_retries=1)
    return _client


class SayStream:
    """Pulls the `say` string out of the reply's arguments while they stream, so the words appear as written."""

    def __init__(self):
        self.args = ''
        self.sent = 0

    def feed(self, delta: str) -> str:
        self.args += delta
        now = partial_string(self.args, 'say')
        new = now[self.sent:]
        self.sent = len(now)
        return new


def partial_string(buf: str, key: str) -> str:
    """The value of "key" in a JSON object that may still be arriving, as far as it has arrived."""
    i = buf.find(f'"{key}"')
    if i < 0:
        return ''
    colon = buf.find(':', i + len(key) + 2)
    start = buf.find('"', colon + 1) if colon >= 0 else -1
    if start < 0:
        return ''
    out, k = [], start + 1
    while k < len(buf):
        ch = buf[k]
        if ch == '\\':
            if k + 1 >= len(buf):
                break
            nx = buf[k + 1]
            if nx == 'u':
                if k + 6 > len(buf):
                    break
                out.append(chr(int(buf[k + 2:k + 6], 16)))
                k += 6
                continue
            out.append({'n': '\n', 't': '\t', 'r': '', 'b': '', 'f': ''}.get(nx, nx))
            k += 2
            continue
        if ch == '"':
            break
        out.append(ch)
        k += 1
    return ''.join(out)


async def run_turn(person_id, text: str, turn_id: str = '') -> AsyncIterator[dict]:
    started = time.monotonic()
    p = await sync_to_async(Person.objects.get)(id=person_id)
    conv = await sync_to_async(current_conversation)(p)
    box = Toolbox(p)

    user_text = text.strip()[:1000]
    user_msg = await sync_to_async(Message.objects.create)(conversation=conv, role='user', text=user_text, turn_id=turn_id)

    # Payments first: the agent should never talk about an order whose payment we haven't checked.
    await sync_to_async(sync_all)(p)
    instructions = SYSTEM + '\n' + await sync_to_async(context)(p)
    model_input = await sync_to_async(transcript)(conv)

    ack_parts: list[str] = []
    steps: list[dict] = []
    used: list[str] = []
    usage = {'in': 0, 'cached': 0, 'out': 0}
    rounds, error, stopped = 0, '', False
    previous = None

    try:
        for rounds in range(1, MAX_ROUNDS + 1):
            stream = await client().responses.create(
                model=settings.OPENAI_MODEL,
                instructions=instructions,
                input=model_input,
                previous_response_id=previous,
                tools=TOOLS,
                tool_choice='required',
                parallel_tool_calls=True,
                reasoning={'effort': 'low'},
                max_output_tokens=1500,
                store=True,
                stream=True,
            )
            ack_now, calls, response = '', [], None
            replies: dict[int, SayStream] = {}
            async for e in stream:
                if e.type == 'response.output_text.delta':
                    ack_now += e.delta
                    yield {'type': 'ack', 'delta': e.delta}
                elif e.type == 'response.output_item.added' and e.item.type == 'function_call' and e.item.name == 'reply':
                    replies[e.output_index] = SayStream()
                elif e.type == 'response.function_call_arguments.delta' and e.output_index in replies:
                    if new := replies[e.output_index].feed(e.delta):
                        yield {'type': 'say', 'delta': new}
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
                details = getattr(response.usage, 'input_tokens_details', None)
                usage['cached'] += getattr(details, 'cached_tokens', 0) or 0
            if ack_now.strip():
                ack_parts.append(ack_now.strip())

            outputs = []
            # Work first, the reply last, so the reply can show what the work found.
            for c in sorted(calls, key=lambda c: c.name == 'reply'):
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
                outputs.append({'type': 'function_call_output', 'call_id': c.call_id, 'output': dumps(res.output)})
            if box.final:
                break
            if any(c.name == 'reply' for c in calls):
                # The reply couldn't be shown (a bad id, an empty cart): its words are void; the model fixes it.
                yield {'type': 'say_reset'}
            model_input = outputs
    except asyncio.CancelledError:
        stopped = True
    except Exception as e:  # the person always gets an answer, never a stack trace
        log.exception('agent turn failed')
        error = str(e)[:500]

    final = box.final or _fallback(box, ack_parts, stopped)
    if error and not box.final:
        # A failed turn leaves the thread as it was: their message comes off, and they can send it again.
        await sync_to_async(user_msg.delete)()
        await sync_to_async(_log)(conv, rounds, used, usage, started, error)
        yield {'type': 'error', 'message': SORRY, 'retry': user_text}
        return

    msg = await sync_to_async(Message.objects.create)(
        conversation=conv, role='hunch', ack=' '.join(ack_parts), text=final['say'], steps=steps, components=final['components'],
    )
    await sync_to_async(_log)(conv, rounds, used, usage, started, 'stopped' if stopped else '')
    if stopped:
        return
    view = await sync_to_async(message_view)(msg, p)
    yield {'type': 'done', 'message': view, 'cart': await sync_to_async(cart_view)(p), 'usage': usage}


def _fallback(box: Toolbox, ack_parts: list[str], stopped: bool) -> dict:
    """No valid reply (out of rounds, or stopped): show what the work found, in plain words."""
    if stopped:
        return {'say': 'Stopped.', 'components': []}
    if box.cards:
        return {'say': "Here's what I found.", 'components': [{'kind': 'dishes', 'items': list(box.cards.values())[:5]}]}
    if box.restaurants:
        return {'say': "Here's what I found.", 'components': [{'kind': 'restaurants', 'items': list(box.restaurants.values())[:3]}]}
    return {'say': "I couldn't finish that one. Try asking a little differently?", 'components': []}


def _log(conv: Conversation, rounds: int, used: list, usage: dict, started: float, error: str) -> None:
    AgentRun.objects.create(
        conversation=conv, model=settings.OPENAI_MODEL, rounds=rounds, tools=used, input_tokens=usage['in'],
        cached_tokens=usage['cached'], output_tokens=usage['out'], ms=int((time.monotonic() - started) * 1000), error=error,
    )


def reset(p: Person) -> Conversation:
    """New conversation: the thread, the cart and today's switches clear; orders and notes stay."""
    p.conversations.filter(ended_at__isnull=True).update(ended_at=timezone.now())
    p.cart.all().delete()
    p.today = {}
    p.save(update_fields=['today'])
    return Conversation.objects.create(person=p)
