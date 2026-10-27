# Hunch — Experience & Design Plan

> Food ordering that knows what you want.
> North star: **you say a feeling, Hunch hands you a decision.** One tap, done.

Live preview of everything below: `docs/design/hunch-design-language.html` (open in a browser).

---

## 1. Experience principles

| # | Principle | What it means on screen |
|---|-----------|-------------------------|
| 1 | **One answer first** | Every reply leads with *the Hunch Pick*: one dish, one restaurant, one price, one ETA. Alternatives are a swipe away, never a list to scan. |
| 2 | **Show the why, in 3 chips** | Intelligence is felt through visible reasoning: `Raining → comfort food` · `Cutting → under 550 kcal` · `You loved Meghana's`. Never a paragraph. |
| 3 | **Zero forms** | Address, payment, spice level and usual add-ons are prefilled from memory. Confirmations are replaced with *Undo* (5 s). |
| 4 | **Everything is born from Hunch** | Generated UI grows out of the Hunch island at the top and settles into the stream. Hunch is the source of every surface. |
| 5 | **Food is the interface** | Image first, text second. Dishes are shot top-down and cut out as round plates. No grey boxes, no hairline borders. |
| 6 | **Hunch speaks first** | Proactive by default: at your usual time (or one you set, like 6 PM) Hunch opens with a ready-to-order suggestion. |

**The no-brainer test:** from app open to order placed in **≤ 3 taps or 1 sentence**.

---

## 2. Hunch, the character

Hunch is not a face on a robot. It is **a living drop of flavour**: a soft glass orb with a swirling, spice-coloured core and two glowing pill eyes. No mouth, no limbs. All emotion comes from **eyes, shape, colour and aura**.

### Anatomy
- **Core**: deformable blob (6–8 harmonic wobble), radial gradient that carries the current mood colour.
- **Swirl**: lighter inner blob that drifts, like saffron dissolving in milk.
- **Glass**: specular highlight top-left, so it reads as a polished object, same family as the dish plates.
- **Eyes**: two white pills. Blink every 3–6 s, look toward whatever Hunch is talking about (the card it just produced, your finger, the composer).
- **Aura**: soft blurred halo in the mood colour. Pulses with voice when listening.

### Where it lives
**Hunch sits on top of everybody.** It is docked at the top centre of every screen as the *Hunch Island*. It:
- expands into a pill when it talks ("Found 3 bowls under ₹300"),
- drops down and grows big in onboarding and empty moments,
- rides along the route line during tracking,
- peeks in from the top edge in a proactive notification.

There is exactly one Hunch on screen at any time. It moves between positions as a shared element, it never duplicates.

### Mood states

| State | Trigger | Colour | Body | Eyes |
|-------|---------|--------|------|------|
| **Idle** | Waiting | Masala (saffron → chili) | Slow breath, 4 s | Open, drift toward finger |
| **Listening** | Mic on | Brighter masala | Aura rings follow voice level | Wide, looking up |
| **Thinking** | Agent working | Hue walks through ingredients | Faster wobble, orbiting specks | Look side to side |
| **Found it** | Pick ready | Masala + sparkle | Squash-and-pop bounce | Happy squint `^ ^` |
| **Deal** | Better offer found | Gold | Glint sweeps across | Wide, one wink |
| **Trust** | Checkout / payment | Deep ink core, saffron rim | Still, almost no wobble | Steady, calm |
| **On the way** | Tracking | Lagoon blue | Rides the route, small orbit | Look forward |
| **Care** | Support / issue | Lavender | Slower, slightly lowered | Soft, tilted down |
| **Sleepy** | Late night | Indigo | Heavy, slow | Half-lidded |

Production build: prototype in Canvas/SVG (as in the preview), ship as a **Rive state machine** with the states above as inputs, so design can tune it without code.

### Voice
Warm, quick, a little cheeky. Short sentences. Hinglish when you use Hinglish.
- "Baarish ho rahi hai. Biryani? Your usual from Meghana's, 32 min."
- "Same paneer bowl is 20% off at Bowl Co. Switch and save ₹62?"
- "Rider's stuck at a signal. 4 min late. I've already asked for a ₹40 credit."
Never: "As an AI…", apologies stacked on apologies, walls of text.

---

## 3. Colour

Light mode. Warm-neutral canvas so food photography carries the colour.

### Base
| Token | Hex | Use |
|-------|-----|-----|
| `canvas` | `#FAF9F6` | App background |
| `surface` | `#FFFFFF` | Raised cards, sheets |
| `ink` | `#1A1611` | Primary text |
| `ink-2` | `#6E665B` | Secondary text |
| `ink-3` | `#ABA398` | Hints, disabled |
| `tint` | `#F2EFEA` | Chips, quiet fills (instead of borders) |

### Masala (brand)
`#FFB547 → #FF6A3D → #E2366E` — the Hunch gradient. Used on Hunch, the primary action and progress. Never on large background areas.

### Flavours (state + section accents)
| Token | Hex | Owns |
|-------|-----|------|
| `saffron` | `#FF9F1C` | Discovery, the Hunch Pick |
| `chili` | `#F2542D` | Primary CTA, cart |
| `gold` | `#E9A800` | Offers and savings |
| `basil` | `#1F9D55` | Health goals, protein, veg |
| `lagoon` | `#2F7CF0` | Tracking, delivery |
| `lavender` | `#8B7CF2` | Support |
| `indigo` | `#3D3A8C` | Night mode for Hunch, scheduled orders |

### Rules
- **Colour pools, not borders.** Group content with a soft radial wash of the section colour (8–12 % opacity) behind it.
- **Food-tinted shadows.** A card's shadow takes the dish's dominant hue (`0 18px 40px -18px rgb(dish / 45%)`).
- Indian veg / non-veg marks keep their standard green square and brown triangle. They are never restyled.
- Text on colour always passes WCAG AA (4.5:1).

---

## 4. Typography

| Role | Face | Why |
|------|------|-----|
| Display / Hunch's voice | **Bricolage Grotesque** (opsz 48–96, 600–700) | Warm, slightly quirky grotesk with personality. Feels like a character, not a bank. |
| UI / body | **Instrument Sans** (400–600) | Clean, compact, very legible at 13–16 px. |
| Numbers (₹, ETA, kcal) | **Geist Mono** (500) | Prices and minutes line up and feel precise. |
| Devanagari | **Mukta** (400–600) | Matches Instrument Sans in colour and x-height for Hindi replies. |

Scale (px / line-height): `display 40/44` · `title 28/32` · `heading 20/26` · `body 16/24` · `small 14/20` · `micro 12/16` (uppercase, +4 % tracking).

Dish names use the display face. Everything Hunch "says" uses the display face at heading size, so its voice is recognisable at a glance.

---

## 5. Iconography

**Phosphor Icons.** Regular weight at rest, **duotone** with the section colour when active. 24 px grid, 1.5 px optical stroke. One family, no mixing. Custom glyphs for food-specific concepts (spice level, protein, veg mark) are drawn on the same grid.

---

## 6. Layout

One continuous canvas, three layers:

```
┌──────────────────────────────┐
│        ( Hunch Island )      │  ← always on top, the source of everything
│                              │
│   context chip: 7:40 PM ·    │
│   Light rain · Indiranagar   │
│                              │
│   STREAM                     │  ← conversation + generated UI
│   user words, thought chips, │
│   plates, compare, cart…     │
│                              │
│  ╭────────────────────────╮  │
│  │ Ask for anything…  (●) │  │  ← composer: mic orb is primary
│  ╰────────────────────────╯  │
└──────────────────────────────┘
```

- **No tab bar.** Orders and Taste Profile are reached by asking, or by pulling down on the Hunch Island.
- **Radius scale:** 12 · 20 · 28 · full. Plates are circles, sheets are 28, chips are full.
- **Spacing:** 4 px base, 16 px gutters, 24 px between stream items.
- **Plates carousel:** dishes as round cut-outs on a gently curved track. Centre plate is large and sharp, sides shrink and blur slightly (depth, like the reference).

---

## 7. Generative UI catalogue

Each agent tool call maps to exactly one component. Same component, same place, same motion, every time.

| Component | Tool call | Identity |
|-----------|-----------|----------|
| `ThoughtChips` | any reasoning step | Small tint chips streaming in, each with an icon. Collapses to one line once the answer lands. |
| `HunchPick` | `recommend` | Big plate, dish name in display face, price · ETA · kcal in mono, one-tap **Order**. |
| `PlateCarousel` | `search_dishes` | Curved row of round plates, snap to centre. |
| `RestaurantDuel` | `compare` | Two restaurants side by side over a split colour pool; differences highlighted, ties muted. |
| `OfferInterception` | `find_offers` | Gold glint card that slides in *between* you and checkout: "Same thing, ₹62 less." Accept / ignore. |
| `ReviewDigest` | `summarise_reviews` | Three phrases with sentiment dots ("smoky, not oily", "portion is generous"), star score in mono. No raw review walls. |
| `CartPlate` | `build_cart` | Items stacked as a plate stack; swipe to remove, steppers inline. |
| `PaySheet` | `checkout` | Razorpay test sheet, Hunch in Trust state, one big **Pay ₹289**. |
| `TrackOrbit` | `track_order` | Abstract route line, Hunch rides it, ETA large in mono. |
| `SupportThread` | `support` | Lavender pool, issue already identified, resolution offered first ("Refund ₹40 or re-send?"). |
| `ProactiveCard` | scheduled push | Hunch peeks from the top edge with one suggestion and **Order** / **Not today**. |

---

## 8. Every stage has an identity

| Stage | Colour pool | Hunch state | Signature moment |
|-------|-------------|-------------|------------------|
| **Onboarding** | Masala | Idle → Found it | Hunch "tastes" you: tap the plates you crave as they float by, pick goals (High protein, Cutting, Veg, Jain), choose English / हिंदी. Done in 30 s, no forms. |
| **Now (home)** | Time-of-day wash | Idle | Context chip + one Hunch Pick ready before you type. Morning peach, afternoon citrus, evening dusk, night indigo. |
| **Conversation** | Saffron | Listening → Thinking → Found it | Thought chips stream, then the answer grows out of the island. |
| **Restaurant & dish** | Dish's own colour | Idle | Full-bleed photo, plate cut-out, review digest, offers inline. |
| **Offers** | Gold | Deal | Interception card with glint, savings in mono. |
| **Checkout** | Neutral, ink | Trust | Everything stills. One button. |
| **Tracking** | Lagoon | On the way | Hunch on the route line; ETA counts down. |
| **Support** | Lavender | Care | Calm, slower motion, solution before questions. |
| **Proactive** | Dusk gradient | Peeking | Lock-screen style card at your usual time. |
| **Late night** | Indigo | Sleepy | Dimmer canvas, smaller portions suggested. |

---

## 9. Motion

**Principles**
1. **Born from Hunch.** New UI scales up from the island's position (`transform-origin` at Hunch), with blur 8 px → 0 and rise 16 px → 0.
2. **Breathe.** Hunch and the active primary action breathe on a 4 s cycle. Nothing else idles.
3. **Springs, not curves.** All interactive motion uses springs so it can be interrupted.
4. **Calm where money is.** Checkout and support use the gentle spring only, no bounce.

**Tokens** (Framer Motion)

| Token | Value | Use |
|-------|-------|-----|
| `spring.snappy` | stiffness 420, damping 32 | Taps, chips, toggles |
| `spring.gentle` | stiffness 200, damping 28 | Sheets, cards settling |
| `spring.bouncy` | stiffness 320, damping 14 | Found it, offer accepted |
| `dur.micro` | 120 ms | Press states |
| `dur.base` | 240 ms | Fades, colour shifts |
| `dur.emerge` | 420 ms | Generated UI arriving |
| `stagger` | 40 ms | Chips, carousel items |

`prefers-reduced-motion`: Hunch keeps blinking and colour changes, wobble and travel are removed, emergence becomes a 200 ms fade.

---

## 10. Imagery

- **Dishes:** top-down, natural daylight, cut out onto a circle (the plate *is* the shape). Consistent 30° light from top-left, matching Hunch's highlight.
- **Restaurants:** wide, warm interior or storefront photo with a bottom scrim; logo never larger than 32 px.
- Mock data ships with a curated image set (one per dish) so the demo never shows a placeholder.

---

## 11. Build plan (frontend)

Stack: React + Vite, Tailwind (tokens from §3–§6 as CSS variables), Framer Motion, Vercel AI SDK (`useChat` with tool calls mapped to §7 components), Phosphor React.

1. **Foundations** — tokens, fonts, `<Hunch state="…"/>` component (canvas), Hunch Island, composer with mic.
2. **Conversation + generative UI** — stream, ThoughtChips, HunchPick, PlateCarousel, RestaurantDuel, ReviewDigest, OfferInterception on mock data.
3. **Money path** — CartPlate, PaySheet (Razorpay test mode), Undo pattern.
4. **After the order** — TrackOrbit, cancellation, SupportThread.
5. **Proactive + onboarding** — taste onboarding, ProactiveCard, time-of-day and weather theming.
