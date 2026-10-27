# Hunch — frontend

React + Vite + Tailwind 4 + Motion. Design tokens and building blocks for Hunch.

```bash
npm install
npm run dev            # http://localhost:5173  (app shell)
                       # http://localhost:5173/playground  (every building block)
npm run photos         # optional: download dish photos into public/food/ for offline use
npm test               # the Home rules (veg days, allergies, goals, copy length…)
```

## Where things live

| Path | What |
|------|------|
| `src/styles/index.css` | Design tokens (`@theme`): Indigo + Graphite, type scale, radius, elevation. Tailwind's default palette is removed on purpose. |
| `src/design/motion.ts` | Springs, durations and the "born from Hunch" emerge variants. |
| `src/components/hunch/` | The Hunch character: canvas engine, moods and the `<Hunch />` component. |
| `src/components/ui/` | Building blocks: Button, IconButton, MicButton, Chip, Composer, Island, Plate, DishRow, HunchPick, OfferNote, UndoToast… |
| `src/components/layout/AppShell.tsx` | Phone: full width. Desktop: centred compact column. |
| `src/domain/` | What Home shows and why: `rules.ts` (never broken), `recommend.ts` (ranking, rows, usual), `copy.ts` (every sentence), `types.ts`. Spec: `../docs/design/HOME_SPEC.md`. |
| `src/data/` | Sample data: 11 fictional kitchens, 26 dishes, sample people and 9 scenarios (one per Home stage). Photos are free Unsplash images listed in `photos.json`. |

Spec: `../docs/design/HUNCH_DESIGN.md`.
