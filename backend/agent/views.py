import json

from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from .home import home
from .loop import current_conversation, reset, run_turn
from .tools import profile_view


def _person_or_401(request):
    if not request.person:
        return None, JsonResponse({'error': 'Send X-Guest-Id or sign in.'}, status=401)
    return request.person, None


@csrf_exempt
@require_POST
async def chat(request):
    """One turn, streamed as server-sent events. Body: {"text": "...", "event": null | "open"}."""
    person = request.person
    if not person:
        return JsonResponse({'error': 'Send X-Guest-Id or sign in.'}, status=401)
    body = json.loads(request.body or b'{}')
    text, event = (body.get('text') or '').strip(), body.get('event')
    if not text and event != 'open':
        return JsonResponse({'error': 'Say something.'}, status=400)

    async def stream():
        async for ev in run_turn(person.id, text, event):
            yield f'data: {json.dumps(ev, ensure_ascii=False, default=str)}\n\n'

    res = StreamingHttpResponse(stream(), content_type='text/event-stream')
    res['Cache-Control'] = 'no-cache'
    res['X-Accel-Buffering'] = 'no'
    return res


@require_GET
def home_view(request):
    p, err = _person_or_401(request)
    if err:
        return err
    conv = current_conversation(p)
    messages = [{'id': m.id, 'role': m.role, 'text': m.text, 'ack': m.ack, 'steps': m.steps, 'components': m.components}
                for m in conv.messages.order_by('created_at')]
    return JsonResponse({'home': home(p), 'profile': profile_view(p), 'messages': messages})


@csrf_exempt
@require_POST
def reset_view(request):
    p, err = _person_or_401(request)
    if err:
        return err
    reset(p)
    return JsonResponse({'ok': True, 'home': home(p)})
