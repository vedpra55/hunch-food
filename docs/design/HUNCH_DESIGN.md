# Hunch — Design Foundations

> Food ordering that knows what you want.
> North star: **you say a feeling, Hunch hands you a decision.** One tap, done.

Live reference for everything below: `docs/design/hunch-design-language.html`.
This document covers the building blocks only. Screens come after these are locked.

---

## 1. Experience principles

| # | Principle | On screen |
|---|-----------|-----------|
| 1 | **One answer first** | Every reply leads with one Hunch Pick: dish, price, ETA. Alternatives are a swipe away. |
| 2 | **Show the why, in 3 chips** | Intelligence is felt through short reasoning chips: `Raining → comfort food`. Never a paragraph. |
| 3 | **Zero forms** | Address, payment and usual add-ons are prefilled. *Undo* replaces confirm dialogs. |
| 4 | **Born from Hunch** | New UI grows out of Hunch at the top of the screen. |
| 5 | **Calm by default** | The UI is almost entirely neutral. Colour is rare, so when it appears it means something. |
| 6 | **Food is the colour** | Photography carries the saturation. The interface stays quiet around it. |

The no-brainer test: app open to order placed in **≤ 3 taps or 1 sentence**.

---

## 2. Colour

**Two families. That's the whole palette.**

### Persimmon (brand)
One warm hue in 10 tones. Most of the time you see the light end (50–200).

| Step | Hex | Use |
|------|-----|-----|
| 50  | `#FFF7F2` | Washes, selected backgrounds |
| 100 | `#FFEDE2` | Soft brand buttons, offer notes |
| 200 | `#FFDCC8` | Hunch body, rings, focus halos |
| 300 | `#FFC2A2` | Hunch body edge, blush |
| 400 | `#FFA273` | Hunch rim, waveform |
| 500 | `#F57F48` | The one accent: Hunch Pick label, active icon |
| 600 | `#DC6431` | Brand text on white (large only) |
| 700 | `#B54C22` | Brand text on 50/100 tints |
| 800 | `#8A3A1B` | — |
| 900 | `#5E2812` | — |

### Stone (neutral)
Very slightly warm, so it sits well next to food.

| Step | Hex | Use |
|------|-----|-----|
| 0   | `#FFFFFF` | Surfaces |
| 25  | `#FBFAF9` | App canvas |
| 50  | `#F5F4F2` | Fills: chips, inputs, secondary buttons |
| 100 | `#ECEAE7` | Pressed fills, dividers when unavoidable |
| 200 | `#DEDBD6` | Disabled borders |
| 300 | `#C5C1BB` | Placeholder icons |
| 400 | `#A09B94` | Placeholder text, hints |
| 500 | `#7A756E` | Secondary text (4.6:1 on white) |
| 600 | `#5C5852` | Icons at rest |
| 700 | `#45413C` | Body text on tints |
| 800 | `#2B2825` | Hunch's eyes and mouth |
| 900 | `#1A1816` | Primary text, primary button |

### Rules
- **Ratio:** ~90 % Stone, ~8 % Persimmon tints (50–300), ≤ 2 % Persimmon 500+.
- **One colour at a time.** A screen never shows more than one brand moment at full strength (usually Hunch or the Pick label).
- **The primary button is ink (Stone 900),** not orange. Orange buttons shout; ink feels confident.
- **Gradients are light and single-hue.** Only three exist:
  - `wash` — Persimmon 50 → white, top of screen behind Hunch.
  - `orb` — Persimmon 50 → 200 → 400, only on Hunch and the mic.
  - `shimmer` — Stone 50 → Persimmon 50 → Stone 50, moving across "thinking" text.
- **Functional colours are not palette colours.** The veg mark (`#1E8E4E`), non-veg mark (`#8B3A1C`) and error (`#C8372D`) appear only where they carry meaning, always small.
- Text contrast meets WCAG AA (4.5:1) for body text.

---

## 3. Hunch, the character

A **soft pearl of persimmon**, light and slightly translucent, like a gummy or a drop of mango lassi. Ink eyes, a small mouth, blush when happy. Abstract body, readable face.

### Anatomy
| Part | Detail | Carries |
|------|--------|---------|
| Body | Deformable blob, `orb` gradient, pearl highlight top-left, soft inner glow bottom-right | Breath, squash/stretch, lean |
| Eyes | Ink ovals with a white catchlight | Look direction, blink |
| Lids | Upper lid cuts the eye at a height and an angle; lower lid pushes up for smiles | Most of the emotion |
| Mouth | Smile, grin, "o", flat, soft | Tone |
| Blush | Persimmon 300 ovals under the eyes | Warmth, delight |
| Aura | Faint Persimmon 200 glow | Presence; rings when listening |

The face slides across the body toward where Hunch is looking, so it feels 3D.

### Expression kit

| Mood | When | Lids | Mouth | Body |
|------|------|------|-------|------|
| **Idle** | Waiting | Relaxed | Small smile | Slow breath (4 s) |
| **Listening** | Mic on | Wide open | "o" sized by voice | Rings pulse with voice |
| **Thinking** | Agent working | Half, slightly narrowed, looking up-side | Flat, off-centre | Faster wobble, orbiting dots |
| **Found it** | Pick ready | Happy arcs `^ ^` | Grin | Hop, sparkles, blush |
| **Delighted** | Better deal found | Wide, double catchlight | Open grin | Hop, blush |
| **Focused** | Checkout, payment | Level, slightly lowered | Neutral smile | Almost still |
| **On the way** | Tracking | Open, looking ahead | Smile | Leans forward, speed lines |
| **Care** | Support | Inner corners raised | Soft, small | Slower, looks down |
| **Sleepy** | Late night | Heavy | Tiny "o" | Slow, floating "z" |

Colour stays persimmon in every mood. Care and Sleepy are slightly desaturated toward Stone; nothing else changes hue. Emotion comes from the face and the body.

### Where it lives
Hunch is docked at the top centre of every screen in a frosted pill (the **Island**). It expands to speak, drops large into onboarding and empty states, and leaves the island to ride the route during tracking. One Hunch on screen at a time.

Production: ship as a Rive state machine with these nine moods plus `lookX`, `lookY` and `voiceLevel` inputs. The Canvas version in the reference page is the spec.

### Voice
Warm, quick, a little cheeky. Short sentences. Hinglish when you use Hinglish.
- "Baarish ho rahi hai. Biryani? Your usual from Meghana's, 32 min."
- "Same bowl is 20% off at FitBowl Co. Switch and save ₹54?"

---

## 4. Typography

**One family: Geist.** Calm, precise, modern. Personality comes from Hunch, not from the typeface.

| Token | Size / line | Weight | Use |
|-------|-------------|--------|-----|
| `display` | 40 / 44, −2 % | 600 | Hunch's opening line |
| `title` | 28 / 34, −1.5 % | 600 | Screen titles, dish name on Pick |
| `heading` | 20 / 26, −1 % | 600 | Card titles |
| `body` | 16 / 24 | 400 | Messages, descriptions |
| `label` | 14 / 20 | 500 | Buttons, chips |
| `caption` | 12 / 16 | 500 | Meta, hints |
| `numeric` | Geist Mono 14 / 20 | 500 | ₹, minutes, kcal (tabular) |
| `hindi` | Mukta, same sizes | 400–600 | Devanagari replies |

---

## 5. Space, radius, elevation, material

- **Space:** 4 px base. `4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56`. Screen gutter 16, between stream items 24.
- **Radius:** `xs 8 · sm 12 · md 16 · lg 24 · xl 32 · full`. Chips and buttons are full; cards lg; sheets xl; plates are circles.
- **Elevation** (shadows only, never borders):
  - `e0` flat — content on canvas.
  - `e1` rest — `0 1px 2px rgb(26 24 22 / 4%), 0 4px 12px rgb(26 24 22 / 4%)` — cards.
  - `e2` raised — `0 12px 32px -12px rgb(26 24 22 / 14%)` — pressed-up cards, dish Pick.
  - `e3` floating — `0 24px 48px -16px rgb(26 24 22 / 20%)` — Island, sheets, toasts.
- **Frost:** `rgb(255 255 255 / 72%)` + 20 px backdrop blur, for the Island and the composer over content.

---

## 6. Iconography

Line icons on a 24 px grid, 1.5 px stroke, round caps and joins (Phosphor Regular in production). Stone 600 at rest, Stone 900 when active, Persimmon 500 only for the Hunch sparkle. No filled or duotone variants, no other families.

Core set: sparkle (Hunch), mic, send, bag, clock, pin, tag, shield, scooter, chat, star, flame, leaf, protein, check, close, chevron, undo.

---

## 7. Components (building blocks)

| Component | Anatomy | Notes |
|-----------|---------|-------|
| **Button** | Primary (ink), Soft (Persimmon 100 / 700 text), Secondary (Stone 50), Text, Icon. Heights 52 / 44 / 36. | One primary per view. |
| **Mic button** | 56 px circle, `orb` gradient, ink mic glyph. Listening adds Persimmon 200 rings. | The main input. |
| **Composer** | Stone 50 pill, placeholder, mic. Listening: white, halo, live waveform, "Sun raha hoon…". | Voice first, typing second. |
| **Island** | Frost pill with Hunch. Collapsed, Speaking, Thinking (shimmer text). | Always top centre. |
| **Thought chip** | Stone 50, Persimmon sparkle, label text. | Max 3 per answer. |
| **Context chip** | No fill, Stone 500 text, small icon. | Time · weather · area. |
| **Filter chip** | Stone 50 → selected ink with white text. | |
| **Dish row** | Plate 72–88, name, restaurant, numeric meta, veg mark, add button. | |
| **Hunch Pick** | Large plate, Persimmon "Hunch pick" label, title, numeric meta, chips, primary button. | The hero of every answer. |
| **Offer note** | Persimmon 50 surface, tag icon, saving in numeric, Soft button. | No gold, no flashing. |
| **Undo toast** | Ink pill, white text, countdown ring. | Replaces confirm dialogs. |

---

## 8. Motion

1. **Born from Hunch.** New UI scales from Hunch's position, blur 8 → 0 px, rise 16 → 0 px.
2. **Only Hunch breathes.** Everything else is still until touched.
3. **Springs, not curves,** so motion can be interrupted.
4. **Calm where money is.** Checkout and support use the gentle spring only.

| Token | Value | Use |
|-------|-------|-----|
| `spring.snappy` | stiffness 420, damping 32 | Taps, chips, toggles |
| `spring.gentle` | stiffness 200, damping 28 | Sheets, cards settling |
| `spring.bouncy` | stiffness 320, damping 14 | Found it, offer accepted |
| `dur.micro` | 120 ms | Press states |
| `dur.base` | 240 ms | Fades, mood changes |
| `dur.emerge` | 420 ms | Generated UI arriving |
| `stagger` | 40 ms | Chips, list items |

`prefers-reduced-motion`: Hunch keeps blinking and expressions; wobble, hops and travel are removed; emergence becomes a 200 ms fade.

---

## 9. Imagery

Dishes are shot top-down in daylight and cut to a circle (the plate is the shape), with light from the top-left to match Hunch's highlight. Restaurants use one wide photo with a soft bottom fade. Mock data ships with one curated photo per dish.

---

## 10. Build order (frontend)

React + Vite, Tailwind with the tokens above as CSS variables, Framer Motion, Vercel AI SDK, Phosphor React.

1. **Foundations** — tokens, Geist, icons, `<Hunch mood lookX lookY voiceLevel />`, Island, Button, Chip, Composer.
2. **Answer blocks** — Thought chips, Hunch Pick, Dish row, Offer note, Undo toast.
3. **Screens** — conversation, checkout (Razorpay test), tracking, support, onboarding, proactive.
