# Hunch — Home, Personalisation & Copy Spec

> Status: **locked v1**. Visual foundations live in `HUNCH_DESIGN.md`; this file decides *what* we show, *when*, and *in which words*.
> Code that implements it: `frontend/src/domain/` (rules, ranking, copy) and `frontend/src/data/` (sample data).
> Every rule below is enforced by a test in `frontend/src/domain/recommend.test.ts` (`npm test`).

---

## 1. Start from the person

When someone opens Hunch they are in one of three moments:

| They think | Share of orders | Hunch's job |
|---|---|---|
| "I'll just get my usual." | Most | **One tap.** |
| "I'm hungry, but what do I want?" | Often | **A few good options, grouped** by a reason they recognise. |
| "I want something specific." | Sometimes | **Let them say it** (mic or text). |

Every dish answers four questions, in this order: **Will I like it? Is the place good? What does it cost? When does it arrive?** That is the card. Everything else waits in the sheet.

Three rules:
1. **Hunch talks in a sentence; cards are the proof.**
2. **Card = glance (4 facts). Sheet = decide.**
3. **Show only what serves the moment.**

---

## 2. Home: the conversation

Home is a conversation. It opens with **one Today card**; every reply after it is **one card**.

### Three rules
1. **One Hunch turn = one white card.** The message and everything it refers to live inside it. Hunch never speaks in a bare bubble next to loose cards.
2. **Pills are only for things you tap.** Reasons, reviews and status are plain text.
3. **An icon means one thing and appears once.** See the icon map below.

### Top bar
Left: profile & settings (avatar, 36 px), vertically centred on Hunch. Centre: Hunch + **"Hunch"** name pill; a status line appears under it only while Hunch works (it takes no space otherwise). Right: empty.

### Today card (the empty state)
```
┌────────────────────────────────┐
│ ☁ 7:40 pm · Light rain · Cutting ›│  context row: icon + words, one line; tap → Today sheet
│                                  │
│ Raining. Something warm,         │  Hunch's line, 22 px
│ still light?                     │
│                                  │
│ [img] Chicken Dum Biryani        │  the one suggestion
│       Nawab's Kitchen · ₹289     │
│ [ Order again · ₹289 ]           │
│                                  │
│ Or ask me                        │
│ (☁) Something warm and light   › │  3 prompts: stage icon + words, tap to send
│ (⚖) High protein, under ₹300   › │
│ (⇄) Surprise me                › │
│ ─────────────────────────────    │
│ You skip non-veg on Thursdays…   │  ask, only when relevant
│ [Remember] [Not really]          │
└──────────────────────────────────┘
```
- **The one suggestion:** your usual when it fits the moment; otherwise Hunch's best fit. The only button on Home: **Order again · ₹289** (usual) or **Order · ₹249** (best fit). Tap the row → sheet.
- **Context row** shows time, notable weather and today's situational rules. Rules no longer appear as × chips; tapping the row opens the **Today sheet** with an on/off switch per rule (resets at midnight).
- The card sits in the vertical middle of the screen until the conversation starts.
- Order on its way: the suggestion is replaced by the tracking block.

### Reply card
```
┌────────────────────────────────┐
│ Chicken Tikka from Tandoor       │  the pick + why, ≤ 16 words
│ Street, 42 g protein. Fits your  │
│ cutting goal too.                │
│ ┌────┐ ┌────┐ ┌────┐ ┌──         │  tiles scroll inside the card
│ ✦ Chicken  Paneer   Chicken      │  ✦ marks the pick, first tile only
│ Tikka      Tikka    Momos        │  name wraps to 2 lines
│ Tandoor…   Tandoor… Midnight…    │
│ ₹299 · 26m ₹249 · 26m ₹169 · 25m │
│ (Only veg) (Here in 20 min)      │  ≤ 2 refine actions (pills: they are actions)
└──────────────────────────────────┘
```
- **Copy:** lead with the pick and the reason, never a count. ✗ "Found 3. Brew Lab is my pick." ✓ "Cold Coffee from Brew Lab, you've had it 3 times."
- Plans, checkout and tracking use the same card shape. The order confirmation lives inside the tracking card.
- Small acknowledgements ("Noted. I'll skip Nawab's Kitchen.") are the same card, sized to the text.

### Tile (dish inside a card, 132 px)
- Square photo, 14 px corners; name up to 2 lines; restaurant; `₹299 · 26 min`.
- **Numbers use Geist with tabular figures.** No monospace anywhere in the product UI.
- **Tag (max one):** `Usual` › `₹50 off`. Never kcal or protein unless the user asked for it.
- Closed restaurant: fades, last line `Opens 7 pm`.
- Veg mark 11 px, aligned with the first line of the name.

### Sheet (sections appear only when relevant)
1. Photo
2. Dish name + veg mark
3. Restaurant: **name · area · 1.8 km · 4.6★ (2.1k) · Open till 11:30 pm**
4. `₹289 · 32 min · Free delivery`
5. **Why Hunch picked it** — one plain sentence, no icons: "You've had it 6 times, your favourite place and warm for the rain."
6. **What people say** — three short quotes as plain lines
7. **Your usual** — customisations already applied, one tap to change
8. Offer (if any)
9. Nutrition (only with a fitness goal): kcal · protein
10. Sticky footer: quantity stepper + **Add · ₹289**
11. Quiet link: **Not for me** → *Too spicy · Too pricey · Not this place · Not today*

Section labels in sentence case. Pills only for real choices (spice, add-ons, Not-for-me reasons).

### Icon map (Phosphor, line weight)
| Icon | Means | Where |
|---|---|---|
| Sparkle | Hunch's pick | Once per reply card |
| Sun / Moon | Time of day | Context row, prompts |
| CloudRain / ThermometerHot / Snowflake | Weather | Context row, prompts |
| Leaf | Veg / light | Veg day, healthy prompts |
| FlowerLotus | Fasting | Navratri |
| Target | Cutting goal | Context row |
| Barbell | Protein | Prompts |
| Fire | Spicy | Prompts |
| BowlFood | A specific dish | Prompts |
| Coffee / Cake / Cookie | Drinks / dessert / snack | Prompts |
| Shuffle | Surprise me | Prompts |
| Moped | Delivery | Tracking |
| Tag | Offer / budget | Sheet, prompts |

### Cart pill
`2 items · ₹538 · View`, above the message bar, only when the cart has items.

---

## 3. Personalisation

### Four layers, strongest first
| Layer | Examples | Effect |
|---|---|---|
| **1. Rules** (never broken) | Diet (veg / egg / non-veg / Jain / vegan), allergies, veg days, fasting | **Filter.** Breaking dishes never appear. |
| **2. Goals** | Cutting, high protein, eat light, budget per meal | **Strong ranking.** Nutrition shown. |
| **3. Taste memory** | Usuals, favourite places, spice level, usual add-ons, price comfort, "not for me" | **Ranking + prefill.** |
| **4. Context** | Time / meal slot, weather, day, home or office | **Tone + grouping.** |

**Rules › Goals › Taste › Context.** Context never overrides a rule. Conflicts blend: rain + cutting → **Warm and light**.

### Veg days, festivals, fasting
- Never assumed from who someone is. Practices vary by family, region and faith.
- **Learned, then confirmed.** After 3 matching weeks (e.g. only veg on Thursdays), Hunch asks once: *"You skip non-veg on Thursdays. Should I remember that?"* **[Remember] [Not really]**.
- Until confirmed it is not a rule: non-veg stays orderable, but the usual and every row lead with veg so Hunch doesn't contradict its own question. After *Remember*, it is a rule.
- Neutral copy: "Veg day", never a religious reference.
- Festivals (Navratri): asked only if the user opted in or followed it before.

### Where personalisation shows (one signal at a time)
| Place | Shows | Example |
|---|---|---|
| Hunch's line | The single strongest reason | "Thursday, so all veg today." |
| Context row | Situational rules; tap to switch off **for today** in the Today sheet | `Leaf Veg day · Target Cutting` |
| Group title | The blended reason | "Warm and light" |
| Tile tag | One decisive fact | "Usual", "₹50 off" |
| Sheet | One sentence of ≤ 3 reasons + nutrition if a goal is set | "Warm for the rain, fits your cutting goal and rated 4.6★." |

### How Hunch learns
1. **Onboarding:** 3 taps — Diet · Goals (optional) · Allergies.
2. **Conversation:** "I'm cutting till December" → *"Got it. Lighter picks until 31 Dec."* Goals always end.
3. **Behaviour:** inferred patterns are confirmed before becoming rules.
4. **Feedback:** *Not for me* + one reason.

### Profile → What Hunch knows
| Section | Contents | Controls |
|---|---|---|
| Food rules | Diet, veg days, fasting, allergies | Toggle, pick days |
| Goals | Goal, end date, optional daily protein / kcal | Edit, end now |
| Favourites | Dishes, restaurants | Remove |
| Learned habits | Spice level, meal times, budget comfort | Source shown (*"Learned from 6 orders"*), delete |
| Suggestions | Proactive time (e.g. 6 PM), days | Set, pause |
| Context | Location, weather | On / off |
| Privacy | **Just this once** ordering, reset all | |

Trust rules: today-only overrides reset at midnight · every item shows its source · inferred never enforced without consent · if a rule hides results, the active-rules row says so · location only while the app is open.

---

## 4. Stages

| Stage | Context row | Line | Suggestion | Prompts |
|---|---|---|---|---|
| First visit | Clock · Indiranagar | "Tell me what you're craving. I'll handle the rest." | Best fit | Fire Spicy, under ₹250 · Leaf Something healthy · BowlFood Best biryani nearby |
| Breakfast | Sun · 8:40 am | "Breakfast? Your usual is 15 min away." | Usual | Coffee Just coffee · Egg Something filling · Shuffle Surprise me |
| Lunch | Sun · 1:20 pm | "Lunch in 22 min?" | Usual | BowlFood Same as last time · Tag Under ₹200 · Shuffle Surprise me |
| Snack | Sun | "Snack time?" | Usual or best fit | Cake Something sweet · Coffee Chai · Shuffle Surprise me |
| Dinner | Moon · rain · goal | "Raining. Something warm, still light?" | Usual | CloudRain Something warm and light · Barbell High protein, under ₹300 · Shuffle Surprise me |
| Hot day | ThermometerHot · 35° | "35° outside. Something cool?" | Usual | Snowflake Something cool · … |
| Veg day | Leaf Veg day | "Thursday, so all veg today." | Veg usual | Leaf Paneer, not too heavy · BowlFood South Indian · Shuffle Surprise me |
| Fasting | FlowerLotus Navratri · day 3 | "Navratri, day 3. All fasting-friendly today." | Best fit | BowlFood Vrat thali · Cake Something sweet · Leaf Fruit, no sugar |
| Late night | Moon · 12:40 am | "Still up? These are open late." | Best open fit | Cookie Light snack · Cake Dessert · Coffee Chai |
| Order on its way | Moon · 8:40 pm | "On its way from Nawab's Kitchen." | Tracking block (the ETA appears here, once) | Moped Where's my rider? · Coffee Add a drink · Cake Add dessert |

Line priority (first that applies wins): **order on its way › fasting › veg day › first visit › weather (blended with goal) › meal slot**.

Behind the suggestion, Hunch still ranks the rows described in earlier versions (Warm and light, High protein, Popular near you…). They choose the best fit and feed replies; they are no longer shown as rows on Home.

---

## 5. Copy deck

### Rules
- Hunch's line ≤ 12 words, reason first. Status lines: verb + "…".
- Always name the restaurant. Never "a place nearby".
- Numbers: `₹289` · `32 min` · `4.6★` · `1.8 km` · `380 kcal` · `32 g protein`, in Geist tabular figures. Never "approx", never "mins".
- Buttons: verb + amount. Hinglish only after the user uses it. No emoji.

### Lines
| Situation | Line |
|---|---|
| Veg day | "Thursday, so all veg today." |
| Fasting | "Navratri, day 3. All fasting-friendly today." |
| Rain | "Raining in Indiranagar. Something warm?" |
| Rain + cutting | "Raining. Something warm, still light?" |
| Hot (≥ 33°) | "34° outside. Something cool?" |
| Pattern ask | "You skip non-veg on Thursdays. Should I remember that?" |
| Goal set | "Got it. Lighter picks until 31 Dec." |
| Rule off today | "Veg day off for today." |

### Status lines
`Finding dinner…` · `Checking 14 kitchens…` · `Comparing 3 places…` · `Checking offers…` · `Placing your order…`

### Reasons (≤ 3, strongest first; written as phrases so they read in a sentence)
`you've had it 6 times` · `your favourite place` · `fasting-friendly` · `fits your cutting goal` · `42 g protein` · `light, as you wanted` · `under your ₹300 budget` · `warm for the rain` · `cool for the heat` · `₹54 off today` · `here in 18 min` · `rated 4.6★ by 2.1k people`

Reply: "{Dish} from {Restaurant}, {reason 1}. {Reason 2} too." Sheet: "{Reason 1}, {reason 2} and {reason 3}."

### Buttons and actions
`Order again · ₹289` · `Order · ₹249` · `Add · ₹289` · `Pay ₹335` · `Not now` · `Remember` · `Not really` · `Not for me` · refine: `Only veg` · `Under ₹200` · `Here in 20 min`

---

## 6. Ordering: checkout, tracking, failures

One checkout card per order attempt. It lives in the thread, so every change happens in place, never on a new screen.

### Checkout card (top to bottom)
1. **Better deal** (only when found): "Found a better deal" + "Same {kind} at {place}, ₹60 less." · `Switch and save ₹60` · `Keep mine`. Switching shows "Switched to {place}. You save ₹60."
2. **Header**: "Placing your order at {restaurant}" (or "from 2 kitchens").
3. **Lines**: photo, name (wraps to 2 lines), restaurant, stepper (trash at qty 1), price. Removing the last line empties it: "Your cart's empty. Want something else?"
4. **Deliver to** row: label, address · ETA, `Change` → address sheet.
5. **Pay with** row: method · masked number, `Change` → payment sheet.
6. **To pay** total · `Pay ₹363` (cash: `Place order` + "Pay ₹363 at the door.") · `Not now`.

### Deal rules
- Same `kind` and same diet, at a different kitchen, open, in stock and reachable from the chosen address.
- Saving ≥ ₹30 after delivery fees and offers. Show the biggest one, once.
- Recomputed when quantities or the address change; gone once paid or dismissed.

### Address and payment
- Address sheet: Home · Work · Parents'. A place that can't reach a cart kitchen shows in red: "{kitchen} doesn't deliver here".
- Reach: kitchen distance + address extra ≤ 7 km. ETA grows 3 min per extra km.
- Payment sheet: GPay, PhonePe, HDFC card, Cash on delivery. Choosing a method clears a payment error.

### Failure states
| Failure | Where | Copy | Way out |
|---|---|---|---|
| Out of reach | Address row turns red, Pay disabled | "{kitchen} doesn't deliver to {area}. Change the address, or ask me for something nearby." | `Change` |
| Payment declined | Pay row turns red | "Payment didn't go through. GPay declined it. Try again, or pay another way." | `Try again` · `Change` |
| Sold out | Tile and sheet | "Sold out today", Add disabled, never picked or suggested | — |
| No match | Reply card | "Nothing open fits that right now. Try something close?" | `Anything good nearby` |
| Empty cart | Checkout card | "Your cart's empty. Want something else?" | — |

### Live tracking
- After paying: "Paid · {restaurant} ₹129" receipt, then a tracking card: "Done. I'll tell you when it's close."
- Block: dish photo, "Arriving in **14 min**", four-step bar (placed · cooking · picked up · near), one caption: "{restaurant} is cooking" → "{rider} picked it up" → "Arriving now" → "Delivered at 8:45 pm".
- The Today card's line becomes "On its way from {restaurant}." and the top bar status shows "On the way · 14 min". The ETA is shown big only once.
- Picked up at ≤ 55% of the ETA left; near at ≤ 3 min.

### Cancel and rate
- `Cancel order` while cooking only. Inline confirm, no dialog: "Cancel this order? You get ₹129 back." · `Cancel order` · `Keep it`.
- Cancelled: "Cancelled. ₹129 is on its way back to GPay ••4821, usually in 2–3 days." Cash: "Cancelled. Nothing to pay."
- After delivery: "How was it?" · `Loved it` (Hunch learns it as a usual) · `Not great` (never suggested again).

### Not in this pass
Support / report an issue, voice and language.
