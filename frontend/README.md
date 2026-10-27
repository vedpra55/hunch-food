# Hunch — frontend

React + Vite + Tailwind 4 + Motion. Design tokens and building blocks for Hunch.

```bash
npm install
npm run dev            # http://localhost:5173  (app shell)
                       # http://localhost:5173/playground  (every building block)
npm run photos         # optional: download dish photos into public/food/ for offline use
```

## Where things live

| Path | What |
|------|------|
| `src/styles/index.css` | Design tokens (`@theme`): Indigo + Graphite, type scale, radius, elevation. Tailwind's default palette is removed on purpose. |
| `src/design/motion.ts` | Springs, durations and the "born from Hunch" emerge variants. |
| `src/components/hunch/` | The Hunch character: canvas engine, moods and the `<Hunch />` component. |
| `src/components/ui/` | Building blocks: Button, IconButton, MicButton, Chip, Composer, Island, Plate, DishRow, HunchPick, OfferNote, UndoToast… |
| `src/components/layout/AppShell.tsx` | Phone: full width. Desktop: centred compact column. |
| `src/data/dishes.ts` | Sample dishes. Photos are free Unsplash images (see credits in the file). |

Spec: `../docs/design/HUNCH_DESIGN.md`.
