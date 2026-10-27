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

## 2. Home, top to bottom

| # | Block | Content | Notes |
|---|---|---|---|
| 1 | Top bar | Left: profile & settings (avatar, 36 px). Centre: Hunch + **"Hunch"** name pill; status line under it only while working. Right: empty. | |
| 2 | Hunch's line | One sentence: why these, why now. | ≤ 12 words |
| 3 | Active rules | Small chips for *situational* rules only: `Veg day ×` `Cutting ×` `Navratri ×`. | Permanent diet is never shown here; it lives in Profile. |
| 4 | Ask (rare) | One confirmation card when Hunch noticed a pattern. | Max one at a time. |
| 5 | Your usual | One white dish card with the only button on Home: **Order again · ₹289**. | Hidden on first visit or if the usual breaks a rule today. A drink is never the usual; it goes with the meal. |
| 6 | Groups | **One or two** horizontal rows of white dish cards. | Never three. |
| 7 | Cart pill | `2 items · ₹538 · View`, above the message bar. | Only when the cart has items. |
| 8 | Message bar | Mic first; starter chips above it when the thread is empty. | 3 starters |

### Groups (horizontal rows)
- Title in the user's words, ≤ 3 words, with a reason: **Your usuals · Warm and comforting · Warm and light · High protein · Under ₹250 · Here in 20 min · Open late · Fasting-friendly · Light and fresh · Popular near you**.
- Never "Recommended" or "Top picks".
- 3–6 cards per row, ranked best first. The next card peeks in at the edge.
- A dish appears once on the screen (no repeats across usual and groups).
- **Variety:** at most 2 dishes from one kitchen per row.
- **Meal rows stay meals:** desserts and drinks never mix into Warm, Protein, Budget, Veg or Popular rows. They get their own rows (Something sweet, Light and fresh, Here in 20 min).
- **Cutting + High protein means lean:** ≤ 600 kcal.
- **In the heat,** Light and fresh shows nothing hot.
- **Never empty:** *Popular near you* is the fallback row, ranked by the person's own taste (strangers get crowd favourites). A fasting day may show 1–2 items rather than nothing.
- Desktop: same compact column; scroll arrows on hover.

### Dish card (white on `#FAFAFA`, 200 px wide)
```
┌─────────────────────┐
│ [photo 4:3]   Usual │  one tag max
├─────────────────────┤
│ ▣ Chicken Dum Biryani│  will I like it?
│ Nawab's Kitchen 4.6★│  is the place good?
│ ₹289 · 32 min       │  cost · time
└─────────────────────┘
```
- White, soft shadow (`e1`), 20 px corners, no border, no button (except *Your usual*).
- **Tag priority (pick one):** `Usual` › `₹54 off` › goal metric (`32 g protein` for protein goals, `380 kcal` when cutting) › none.
- **Closed restaurant:** card fades, last line becomes `Opens 7 pm`. Only *Your usual* can show closed; groups show open places only.
- Tap anywhere → sheet.

### Sheet (sections appear only when relevant)
1. Photo
2. Dish name + veg mark
3. Restaurant: **name · area · 1.8 km · 4.6★ (2.1k) · Open till 11:30 pm**
4. `₹289 · 32 min · Free delivery`
5. **Why Hunch picked this** — up to 3 reasons
6. **What people say** — 3 short phrases
7. **Your usual** — customisations already applied, one tap to change
8. Offer (if any)
9. Nutrition (only with a fitness goal): kcal · protein
10. Sticky footer: quantity stepper + **Add · ₹289**
11. Quiet link: **Not for me** → *Too spicy · Too pricey · Not this place · Not today*

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
| Active rules | Situational rules, tap × to switch off **for today** | `Veg day ×` |
| Group title | The blended reason | "Warm and light" |
| Card tag | One useful fact | "Usual", "32 g protein" |
| Sheet | ≤ 3 reasons + nutrition if a goal is set | "Raining · Fits your cutting goal · 4.6★ here" |

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

| Stage | When | Line | Usual | Groups | Starters |
|---|---|---|---|---|---|
| First visit | No orders yet | "Tell me what you're craving. I'll handle the rest." | — | Popular near you | Spicy, under ₹250 · Healthy lunch · Best biryani near me |
| Breakfast | 6–11 | "Breakfast? Your usual is 15 min away." | ✓ | Here in 20 min | Something filling · Just coffee · Surprise me |
| Lunch | 11–16 | "Lunch in 25 min?" | ✓ | Under ₹250 · Here in 20 min | Same as last time · Under ₹200 · Something new |
| Snack | 16–19 | "Snack time?" | ✓ | Light and fresh | Something sweet · Chai · Surprise me |
| Dinner | 19–23 | "Dinner? Your usual from Nawab's Kitchen?" | ✓ | context-driven | Something lighter · High protein · Surprise me |
| Late night | 23–6 | "Still up? These are open late." | if open | Open late · Something sweet | Light snack · Dessert · Chai |
| Order on its way | Active order | "12 min away. Arjun has it." | — | — (tracking card only) | Where's my rider? · Add a drink · Report an issue |

Line priority (first that applies wins): **order on its way › fasting › veg day › first visit › weather (blended with goal) › meal slot**.

When a rule shapes the day, starters follow it — fasting: *Vrat thali · Something sweet · Fruit, no sugar*; veg day: *Paneer, not too heavy · South Indian · Surprise me*.

---

## 5. Copy deck

### Rules
- Hunch's line ≤ 12 words, reason first. Status lines: verb + "…".
- Always name the restaurant. Never "a place nearby".
- Numbers: `₹289` · `32 min` · `4.6★` · `1.8 km` · `380 kcal` · `32 g protein`. Never "approx", never "mins".
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

### Sheet reasons (pick ≤ 3, strongest first)
`Your usual · ordered 6 times` · `Your favourite place` · `Fits your cutting goal` · `38 g protein` · `Veg day` · `Fasting-friendly` · `Raining → warm food` · `34° → something cool` · `Arrives in 18 min` · `₹54 off today` · `4.6★ from 2.1k ratings`

### Buttons and chips
`Order again · ₹289` · `Add · ₹289` · `Pay ₹335` · `Not now` · `Remember` · `Not really` · `Not for me`
