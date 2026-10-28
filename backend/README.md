# Hunch backend

Django (ASGI) for everything: catalogue, search, the agent, cart, orders, payments, identity.
Supabase is the Postgres (pgvector + pg_trgm) and, when turned on, the email-OTP sign-in. No background
jobs: order status moves with the clock, and payments are checked with Dodo whenever an unpaid order is read.

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
python manage.py test orders agent   # rules, cart, offers, payments sync, live cards, the turn loop with a scripted model (no tokens)
python scripts/talk.py --guest g1 --setup "Ved,phg-gt-road" "spicy momos under 150"   # one live turn per argument (costs tokens)
```

## How it's built: the app owns the state, the agent talks

Everything that touches money or identity is plain code with no model: onboarding (`POST /api/onboarding`),
the cart, checkout, payment and order status. The agent searches, recommends, answers and changes the cart
when asked, and reads the current state on every turn.

**The thread** (`agent/thread.py`) is one timeline on the server: the person's words, Hunch's turns, and app
events ("Added 1× Momos", "Paid ₹125", "Set up"). A reload shows exactly what streamed. Order and checkout
cards are stored as references and drawn from the database each time, so a paid order never shows Pay again.

## How a turn works (`agent/loop.py`)

1. **Fresh input every turn:** the fixed rules (`agent/prompt.py`, cached by OpenAI), this moment's context
   (time, place, rules, tastes, cart, orders, what's missing), and the last 14 entries of the thread, with
   what each turn showed (dish ids included) and the app events. Nothing is chained across turns, so a failed
   or stopped turn can't break the next one.
2. **Acknowledge, then act.** Plain text before tools is the acknowledgement ("Spicy, under ₹150, got it.
   Checking kitchens near Law Gate."); each tool call is a step with a label and a result ("Found 6 · 2 with offers").
3. **One `reply`.** Every turn ends with exactly one `reply` call: words in `say` (streamed as they're
   written) and one card in `show` (dishes, kitchens, menu, checkout, order, or none), plus tappable `choices`.
   The server checks it first: unknown ids or an empty cart go back to the model to fix.
4. **The protocol.** Each send carries a turn id: a retried send is answered from the saved copy, never run
   twice. One turn at a time per thread. A heartbeat every 10 s. Stop cancels and saves what was there. On an
   error, the person's message comes off the thread and they can send it again.

Tools (`agent/tools.py`): `search_food`, `find_restaurants`, `get_menu`, `get_history`, `update_cart`,
`save_profile`, `set_location`, `remember`, `order_status`, `reply`.

Safety lives in code, not the prompt: diet, allergies and veg days are filtered inside search and the
cart; one kitchen per order; totals are computed on the server; the agent can prepare a checkout but
never pay, cancel or refund (those are the person's taps).

Model: `gpt-6-luna`; embeddings `text-embedding-3-small` at 512 dimensions. `AgentRun` logs rounds, tools,
tokens (and cached tokens) and time for every turn.

## Memory

- Rules are columns on `accounts_person` (diet, allergies, veg days, spice, budget) and are enforced by the tools.
- Tastes are `accounts_tastenote` rows, written only when the person states one ("I hate coriander") or adds
  it in Profile. Near-repeats update the old note; at most 20. Never recommendations, carts, payments or times.
- Favourites come from orders.

## Payments (Dodo, test mode), no webhook needed

One pay-what-you-want INR product (`DODO_PRODUCT_ID`) carries every order; the amount is the order total set
on the server. Every read of an unpaid order (the order card, home, the agent's context, its order tool) first
asks Dodo about that order's checkout session (`orders/payments.py: sync`, at most every 3 s per order) and
applies the result once. So the order is confirmed whether they come back through the return link, press Back,
or just open the app later. The same cart reuses the unpaid order and its payment page; a newer checkout never
fails a paid one. `POST /api/webhooks/dodo` (verified, applied once) is a second path once deployed.

## Identity

`X-Guest-Id` (browser) → a guest. `AUTH_REQUIRED=0` (default): a guest with a name, phone and address can
order; Dodo's page asks for their email. `AUTH_REQUIRED=1` adds an email + 6-digit code sign-in before the
first payment (`Authorization: Bearer <Supabase token>`, verified with `/auth/v1/user`; the guest's cart and
thread move into the account). For that, Supabase → Auth → Email templates → Magic Link must include
`{{ .Token }}` so the email carries a code instead of a link.

## Database (Supabase project `hunch`, ap-south-1)

The schema, Django migration history and the full catalogue are already loaded. Row-level security
is on for every table and the API keys have no table grants: only Django (role `hunch_app`) reads and
writes. On GCP set `DATABASE_URL` to the Supabase session pooler with user `hunch_app.<project-ref>`.

## Deploy (not done yet)

`Dockerfile` is Cloud Run ready (`asia-south1`, min instances 1 so the first reply isn't slow). Secrets
from Secret Manager; `DEBUG=0` turns the dev sign-in header off.
