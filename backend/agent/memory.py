"""
Soft memory with mem0: taste and habits in the person's own words ("hates coriander", "orders after
the 9 pm lab"). Hard rules (diet, allergies, veg days) never live only here: they are columns on
Person that the tools enforce. mem0 runs in-process on our OpenAI key and our Postgres (pgvector).
"""

import logging
from functools import lru_cache

from django.conf import settings

log = logging.getLogger('hunch')


def _conninfo() -> str:
    db = settings.DATABASES['default']
    parts = [f"dbname={db['NAME']}", f"user={db['USER']}", f"host={db['HOST']}", f"port={db['PORT']}"]
    if db['PASSWORD']:
        parts.append(f"password={db['PASSWORD']}")
    for k, v in db.get('OPTIONS', {}).items():
        parts.append(f'{k}={v}')
    return ' '.join(parts)


@lru_cache(maxsize=1)
def memory():
    from mem0 import Memory

    return Memory.from_config({
        # gpt-6 models take reasoning-style params (max_completion_tokens, reasoning_effort).
        'llm': {'provider': 'openai', 'config': {'model': settings.OPENAI_MODEL, 'api_key': settings.OPENAI_API_KEY, 'is_reasoning_model': True, 'reasoning_effort': 'low', 'max_tokens': 600}},
        'embedder': {'provider': 'openai', 'config': {'model': settings.OPENAI_EMBED_MODEL, 'api_key': settings.OPENAI_API_KEY, 'embedding_dims': settings.EMBED_DIMS}},
        'vector_store': {'provider': 'pgvector', 'config': {'connection_string': _conninfo(), 'collection_name': 'hunch_memories', 'embedding_model_dims': settings.EMBED_DIMS}},
        'history_db_path': '/tmp/hunch-mem0-history.db',
        'custom_fact_extraction_prompt': FACTS_PROMPT,
    })


FACTS_PROMPT = """You keep notes about a person for a food-ordering assistant in Punjab, India.
Extract only lasting facts about their food taste, habits, routine, budget, people they order for, and dislikes.
Ignore one-off requests ("something warm now"), anything about payments, and anything the assistant said.
Return JSON: {"facts": ["...", ...]}. Short, third person, present tense. Empty list if nothing lasting."""


def enabled() -> bool:
    return settings.MEMORY_ENABLED and bool(settings.OPENAI_API_KEY)


def recall(person_id: str, query: str, limit: int = 5) -> list[str]:
    if not enabled():
        return []
    try:
        res = memory().search(query, filters={'user_id': person_id}, top_k=limit)
        return [m['memory'] for m in res.get('results', [])]
    except Exception as e:  # memory must never break a turn
        log.warning('mem0 recall failed: %s', e)
        return []


def remember_turn(person_id: str, user_text: str, hunch_text: str) -> None:
    if not enabled() or not user_text.strip():
        return
    try:
        memory().add([{'role': 'user', 'content': user_text}, {'role': 'assistant', 'content': hunch_text}], user_id=person_id)
    except Exception as e:
        log.warning('mem0 add failed: %s', e)


def note(person_id: str, fact: str) -> None:
    """The agent saving something the person said about themselves, verbatim."""
    if not enabled():
        return
    try:
        memory().add(fact, user_id=person_id, infer=False)
    except Exception as e:
        log.warning('mem0 note failed: %s', e)


def all_memories(person_id: str) -> list[dict]:
    if not enabled():
        return []
    try:
        res = memory().get_all(filters={'user_id': person_id})
        return [{'id': m['id'], 'text': m['memory']} for m in res.get('results', [])]
    except Exception as e:
        log.warning('mem0 get_all failed: %s', e)
        return []


def forget(memory_id: str) -> None:
    if enabled():
        memory().delete(memory_id)


def forget_all(person_id: str) -> None:
    if enabled():
        memory().delete_all(user_id=person_id)
