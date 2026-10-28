import asyncio
import json
from datetime import timedelta

from asgiref.sync import sync_to_async
from django.db.models import Q
from django.http import JsonResponse, StreamingHttpResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from orders.payments import sync_all
from orders.services import cart_view
from .home import home
from .loop import reset, run_turn
from .models import Conversation, Message
from .thread import current_conversation, message_view, messages_view, profile_view
from .voice import transcribe_audio

# A turn that dies without finishing frees the thread after this long.
TURN_LOCK = timedelta(seconds=120)
HEARTBEAT_S = 10


def _person_or_401(request):
    if not request.person:
        return None, JsonResponse({'error': 'Send X-Guest-Id or sign in.'}, status=401)
    return request.person, None


def _lock(conv_id: int) -> bool:
    now = timezone.now()
    return bool(Conversation.objects.filter(id=conv_id).filter(Q(busy_until__isnull=True) | Q(busy_until__lt=now)).update(busy_until=now + TURN_LOCK))


def _unlock(conv_id: int) -> None:
    Conversation.objects.filter(id=conv_id).update(busy_until=None)


def _answered(conv: Conversation, turn_id: str) -> Message | None:
    """The reply to a turn we already ran (the browser retried the same send)."""
    asked = conv.messages.filter(role='user', turn_id=turn_id).first()
    if not asked:
        return None
    return conv.messages.filter(role='hunch', created_at__gt=asked.created_at).order_by('created_at').first()


def _sse(ev: dict) -> str:
    return f'data: {json.dumps(ev, ensure_ascii=False, default=str)}\n\n'


@csrf_exempt
@require_POST
async def chat(request):
    """One turn, streamed as server-sent events. Body: {"text": "...", "turn_id": "<browser id for this send>"}."""
    person = request.person
    if not person:
        return JsonResponse({'error': 'Send X-Guest-Id or sign in.'}, status=401)
    body = json.loads(request.body or b'{}')
    text, turn_id = (body.get('text') or '').strip(), str(body.get('turn_id') or '')[:40]
    if not text:
        return JsonResponse({'error': 'Say something.'}, status=400)
    conv = await sync_to_async(current_conversation)(person)

    if turn_id and (done := await sync_to_async(_answered)(conv, turn_id)):
        view = await sync_to_async(message_view)(done, person)
        cart = await sync_to_async(cart_view)(person)

        async def replay():
            yield _sse({'type': 'done', 'message': view, 'cart': cart, 'seq': 1})

        return StreamingHttpResponse(replay(), content_type='text/event-stream')

    if not await sync_to_async(_lock)(conv.id):
        return JsonResponse({'error': "I'm still answering your last message."}, status=409)

    async def stream():
        queue: asyncio.Queue = asyncio.Queue()

        async def produce():
            try:
                async for ev in run_turn(person.id, text, turn_id):
                    await queue.put(ev)
            finally:
                await queue.put(None)

        task = asyncio.create_task(produce())
        seq = 0
        try:
            while True:
                try:
                    ev = await asyncio.wait_for(queue.get(), HEARTBEAT_S)
                except TimeoutError:
                    yield ': ping\n\n'  # keeps proxies from closing a quiet connection
                    continue
                if ev is None:
                    break
                seq += 1
                yield _sse({**ev, 'seq': seq})
        finally:
            # The person pressed Stop or left: the turn stops and saves what it had.
            if not task.done():
                task.cancel()
                try:
                    await task
                except BaseException:
                    pass
            await sync_to_async(_unlock)(conv.id)

    res = StreamingHttpResponse(stream(), content_type='text/event-stream')
    res['Cache-Control'] = 'no-cache'
    res['X-Accel-Buffering'] = 'no'
    return res


@require_GET
def home_view(request):
    p, err = _person_or_401(request)
    if err:
        return err
    sync_all(p)
    conv = current_conversation(p)
    return JsonResponse({'home': home(p), 'profile': profile_view(p), 'messages': messages_view(conv, p)})


@csrf_exempt
@require_POST
def reset_view(request):
    p, err = _person_or_401(request)
    if err:
        return err
    reset(p)
    return JsonResponse({'ok': True, 'home': home(p)})


@csrf_exempt
@require_POST
def voice_transcribe(request):
    """Transcribe audio using Gemini 2.0 Flash."""
    p, err = _person_or_401(request)
    if err:
        return err

    audio_bytes = None
    mime_type = 'audio/webm'

    if 'audio' in request.FILES:
        uploaded = request.FILES['audio']
        audio_bytes = uploaded.read()
        mime_type = uploaded.content_type or 'audio/webm'
    elif request.content_type and any(request.content_type.startswith(m) for m in ('audio/', 'video/')):
        audio_bytes = request.body
        mime_type = request.content_type
    else:
        try:
            body = json.loads(request.body or b'{}')
            if 'audio' in body:
                import base64
                audio_bytes = base64.b64decode(body['audio'])
                mime_type = body.get('mime_type', 'audio/webm')
        except Exception:
            pass

    if not audio_bytes:
        return JsonResponse({'error': 'No audio data received.'}, status=400)

    try:
        text = transcribe_audio(audio_bytes, mime_type)
        return JsonResponse({'text': text})
    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=503)
    except Exception as e:
        return JsonResponse({'error': f'Transcription failed: {e}'}, status=500)

