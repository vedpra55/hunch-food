# Hunch backend

Django (ASGI) for everything: catalogue, search, the agent, cart, orders, payments, identity.
Supabase is the Postgres (pgvector + pg_trgm) and the email-OTP sign-in. No background jobs: order
status moves with the clock, memory is written right after each reply.

## Run locally

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # fill OPENAI_API_KEY, DODO_PAYMENTS_API_KEY, DATABASE_URL
python manage.py migrate
python manage.py seed --embed   # 14 areas · 34 kitchens · 357 dishes · ~1,600 reviews · 71 offers (~$0.001 of embeddings)
uvicorn hunch.asgi:application --port 8000
```

Frontend: `cd ../frontend && cp .env.example .env.local && npm run dev`. Without `VITE_API_URL` (or with
`?demo`) the frontend runs the offline demo with the dev panel.

## Test

```bash
MEMORY_ENABLED=0 python manage.py test orders      # rules, cart, offers, checkout gate, lifecycle, webhook, tools (no model calls)
python scripts/talk.py --dev you@test.in "spicy momos under 150"   # one live agent turn per argument (costs tokens)
```

## How the agent works

`agent/loop.py`, one turn, streamed as server-sent events:

1. **Context** is rebuilt every turn (`agent/prompt.py`): time, where they are, rules (diet, allergies,
   veg day), cart, live order, what's missing before checkout, and the top mem0 memories.
2. **Acknowledge, then act.** The model first says what it understood and what it's doing ("Spicy, under
   ₹150, got it. Checking kitchens near Law Gate."), then calls tools. Each tool call is shown as a step
   with a plain label and a result ("Found 6 · 2 with offers").
3. **Answer with a thing.** One or two sentences with the pick and one reason, plus a component:
   dishes, kitchens, a menu, choices, the details form, checkout, or the order.

Tools (`agent/tools.py`): `search_food`, `find_restaurants`, `get_menu`, `get_history`, `update_cart`,
`save_profile`, `set_location`, `remember`, `show_dishes`, `show_restaurants`, `show_menu`, `checkout`,
`ask_choice`, `order_status`.

Safety lives in code, not the prompt: diet, allergies and veg days are filtered inside search and the
cart; one kitchen per order; totals are computed on the server; the agent can prepare a checkout but
never pay, cancel or refund (those are the person's taps).

Model: `gpt-6-luna` everywhere (conversation and mem0), `text-embedding-3-small` at 512 dimensions.
The OpenAI transcript is kept server-side (`store=True`) and chained by response id; the person's
thread is stored in `agent_message` and restored on reload. "Reset conversation" starts a new thread
and clears the cart; orders and memories stay.

## Memory

- Hard rules are columns on `accounts_person` (diet, allergies, veg days, spice, budget) and are enforced
  by the tools.
- Soft taste lives in mem0 (open source, in-process): OpenAI for extraction, pgvector in the same database
  (`hunch_memories`). Visible and deletable in Profile.

## Payments (Dodo, test mode)

One pay-what-you-want INR product (`DODO_PRODUCT_ID`) carries every order; the amount is the order
total set on the server. Checkout opens Dodo's hosted page; on return the server asks Dodo for the
session status and places the order. `POST /api/webhooks/dodo` verifies Standard Webhooks signatures
(`DODO_WEBHOOK_SECRET`) and applies each event once. Cancel while cooking refunds in full.

## Identity

`X-Guest-Id` (browser) → guest. `Authorization: Bearer <Supabase token>` → verified with Supabase
`/auth/v1/user`; the guest's cart and conversation move into the account. Sign-in is asked for only at
checkout (email + 6-digit code). Supabase dashboard: Auth → Email templates → Magic Link must include
`{{ .Token }}` so the email carries the code.

## Database (Supabase project `hunch`, ap-south-1)

The schema, Django migration history and the full catalogue are already loaded. Row-level security
is on for every table and the API keys have no table grants: only Django (role `hunch_app`) reads and
writes. On GCP set `DATABASE_URL` to the Supabase session pooler with user `hunch_app.<project-ref>`.

## Deploy (not done yet)

`Dockerfile` is Cloud Run ready (`asia-south1`, min instances 1 so the first reply isn't slow). Secrets
from Secret Manager; `DEBUG=0` turns the dev sign-in header off.
