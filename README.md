# Selah — Illuminated Bible Reading Sanctuary

A local-first Bible reading tracker for logging daily Scripture readings, visualizing progress across all **66 books (1,189 chapters)**, keeping reading rhythms, and collecting **28 illuminated achievement seals**.

## Features

- **Sanctuary Dashboard**: Overall, Old Testament (929 ch), and New Testament (260 ch) animated radial progress rings, quick-log bar, 52-week reading rhythm heatmap, and active streak oil lamp (with optional 1-day/week Sabbath grace).
- **Books & 1,189-Chapter Mosaic**: Filter all 66 books by Testament, division, or status; switch between Bookshelf cards and a 1,189-tile whole-Bible mosaic; open any book sheet to toggle chapters, `Shift+Click` chapter ranges, track multiple read-through cycles (`2×`), or attach reflection notes.
- **Hall of Seals (Achievements)**: 28 curated achievements across Bronze, Silver, Gold, and Luminous tiers (including secret seals) with custom SVG medallions, unlock toasts, and a 3D tilt inspector modal.
- **Journal & Guided Plans**: Chronological reading history with inline editing, deletion, and reflection search, plus 4 synced reading plans (*Gospels & Acts Journey*, *Psalms & Proverbs Month*, *New Testament in 90 Days*, and *Canonical Bible in 1 Year*).
- **Adaptive Themes & Backup**: Dawn Parchment (light) and Vesper Candlelight (dark) themes, IndexedDB local-first storage (`Dexie.js`), `Temporal.PlainDate` timezone-safe dates, and JSON export/import.

## Getting Started

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — Start the Vite development server
- `npm run build` — Type-check with TypeScript and build production assets
- `npm test` — Run the Vitest unit and UI test suite
