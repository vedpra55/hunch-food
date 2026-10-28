"""Embeddings for meaning-based search: one vector per dish and per kitchen, one per query."""

from functools import lru_cache

from django.conf import settings
from openai import OpenAI


@lru_cache(maxsize=1)
def client() -> OpenAI:
    return OpenAI(api_key=settings.OPENAI_API_KEY)


def embed(texts: list[str]) -> list[list[float]]:
    res = client().embeddings.create(model=settings.OPENAI_EMBED_MODEL, input=texts, dimensions=settings.EMBED_DIMS)
    return [d.embedding for d in res.data]


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
        for i in range(0, len(rows), 128):
            batch = rows[i : i + 128]
            for row, vec in zip(batch, embed([text(r) for r in batch])):
                row.embedding = vec
            model.objects.bulk_update(batch, ['embedding'])
            n += len(batch)
    return n
