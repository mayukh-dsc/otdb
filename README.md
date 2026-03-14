# OTDB — Old Temples Database

An interactive web app for exploring historically and archaeologically significant temples of India and Southeast Asia across 3,000 years of history.

## Features

- **Interactive Map** — Leaflet map covering India, Cambodia, Indonesia, Myanmar, Thailand, Vietnam, Sri Lanka, and Nepal with clustered temple markers
- **Time Range Filter** — Draggable dual-handle slider to filter temples by construction date (1000 BC – 2026 AD)
- **Temple Detail Panel** — Click any temple to view images, dates, dynasty, architectural style, history, and architecture notes
- **Color-coded markers** — Hindu (orange), Buddhist (yellow), Jain (green)

## Tech Stack

- **Next.js 16** (App Router) with TypeScript
- **Leaflet.js** + react-leaflet + react-leaflet-cluster
- **Tailwind CSS v4**
- **OpenStreetMap** tiles (free)

## Data

128 curated temples sourced from:
- **Wikidata** (SPARQL) — coordinates, dates, architectural styles, images
- **Wikipedia** — descriptions, history, and architecture sections

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data Pipeline

To re-seed the temple data from scratch:

```bash
# 1. Pull raw data from Wikidata
npx tsx scripts/seed-from-wikidata.ts

# 2. Curate top temples and enrich from Wikipedia
npx tsx scripts/curate-temples.ts

# 3. Fix descriptions and religions
npx tsx scripts/fix-descriptions.ts
npx tsx scripts/fix-religions.ts
npx tsx scripts/cleanup-data.ts

# 4. Convert image URLs to direct thumbnails
npx tsx scripts/fix-image-urls.ts
```

## License

MIT
