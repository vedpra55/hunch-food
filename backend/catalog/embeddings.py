"""Embeddings for meaning-based search: one vector per dish and per kitchen, one per query."""

from functools import lru_cache
import httpx
from django.conf import settings
from google import genai
from google.genai import types

_http_client = httpx.Client(verify=False, timeout=30.0)
_client: genai.Client | None = None


def client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(
            api_key=settings.GEMINI_API_KEY,
            http_options=types.HttpOptions(
                httpx_client=_http_client,
            ),
        )
    return _client


def embed(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    res = client().models.embed_content(
        model=settings.GEMINI_EMBED_MODEL,
        contents=texts,
        config=types.EmbedContentConfig(output_dimensionality=settings.EMBED_DIMS),
    )
    return [e.values for e in res.embeddings]


@lru_cache(maxsize=512)
def embed_query(text: str) -> tuple[float, ...]:
    return tuple(embed([text])[0])


def dish_text(d) -> str:
    return f'{d.name}. {d.description}. {d.kind}, {d.category.name if d.category else ""}. {" ".join(d.traits)}. {d.restaurant.name}, {", ".join(d.restaurant.cuisines)}'


def restaurant_text(r) -> str:
    return f'{r.name}. {", ".join(r.cuisines)}. {r.description}. {r.area.name}'


def embed_catalogue() -> int:
    from .models import Dish, Restaurant

    n = 0
    for model, text, related in ((Dish, dish_text, ('restaurant', 'category')), (Restaurant, restaurant_text, ('area',))):
        rows = list(model.objects.select_related(*related))
        for i in range(0, len(rows), 64):
            batch = rows[i : i + 64]
            for row, vec in zip(batch, embed([text(r) for r in batch])):
                row.embedding = vec
            model.objects.bulk_update(batch, ['embedding'])
            n += len(batch)
    return n
