<div align="center">

# Pokémon Card Portfolio Tracker (PCPT)

Track your Pokémon card collection's market value with live Cardmarket (EUR) and TCGPlayer (USD) prices — in the browser **and** as an installable PWA.

![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-ready-5c6bc0?logo=googlechrome&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

**Live demo:** https://demokritatom.github.io/PCPT/

</div>

---

## What is this?

A **zero-cost**, serverless web app for tracking Pokémon TCG card portfolios. It runs entirely as a static site on GitHub Pages with daily automated price updates via GitHub Actions — no server, no database, no subscription.

The app has **two modes** depending on how you open it:

| Mode | When | UI |
|------|------|----|
| **Desktop / Browser** | Opened in a regular browser tab | Full table-based view with sorting, filtering, dashboard |
| **PWA / Mobile** | Installed on a phone home screen | Mobile-first design: tab bar, card grid, camera scanner, bottom sheets |

---

## Features

### Price tracking
- **Cardmarket** prices in EUR (trend, avg7, avg30, low) — primary source
- **TCGPlayer** prices in USD (market, low, mid) — secondary source
- Prices fetched from [pokemontcg.io](https://pokemontcg.io/) (17 000+ cards, free tier)
- **Daily automated sync** via GitHub Actions (06:00 UTC) — commits updated prices to `data/`
- **Compact history file** (`data/price-history.json`) — one entry per card per day, no daily file sprawl
- Real price history chart with linear gap interpolation (no fake/synthetic data when real data exists)
- **Kursziel** (price target) per card — progress bar + "Reached!" badge in card detail

### Card data
- Live card search: name, set code + number (e.g. `PAL 072`, `sv3pt5-197`)
- 855-entry German→English Pokémon name translation (sourced from PokeAPI GraphQL)
- Fuzzy OCR name matching: handles truncated/noisy scan output
- 17 000+ cards from all sets

### Both modes
- Excel / CSV import & export
- Bilingual UI: 🇩🇪 German (default) · 🇺🇸 English
- Runs 100 % offline after first load (service worker)
- Dark / light theme

### Desktop browser
- Sortable / filterable portfolio table
- Dashboard with total portfolio value, top gainers & losers sparklines

### PWA (installed on phone)
- **Dashboard** — hero total with sparkline, Card of the Day, today's movers (gainers/losers), most valuable cards, activity feed
- **Portfolio** — searchable card list with sort & filter bottom sheets
- **Add card** — live search with thumbnail preview, condition / variant picker, quantity stepper
- **Scan** — camera viewfinder with Tesseract.js OCR, 4-orientation rotation, tight ROI boxes, fuzzy German name matching
- **Card detail** — real price chart (7d / 30d / 90d), stats, P&L, edit / delete, **Kursziel**
- **Settings** — drag-and-drop import, export, currency toggle (EUR / USD), language, theme, profile name, reset

---

## Prerequisites

- [Node.js](https://nodejs.org/) **≥ 20**
- npm ≥ 10
- A [GitHub](https://github.com/) account

---

## Deploy your own instance

### 1. Fork the repository

Click **Fork** on https://github.com/DemokritAtom/PCPT, then clone your fork:

```bash
git clone https://github.com/<YOUR_USERNAME>/PCPT.git
cd PCPT
```

### 2. Install dependencies & verify locally

```bash
cd app
npm install
npm run dev
```

Open `http://localhost:5173/` in your browser.

### 3. Enable GitHub Pages

1. Repo → **Settings** → **Pages** → Source: **GitHub Actions**
2. Push to `main` — `.github/workflows/deploy.yml` builds and deploys automatically

Your site will be live at `https://<YOUR_USERNAME>.github.io/PCPT/`.

### 4. Enable daily price sync

`.github/workflows/price-sync.yml` runs daily at 06:00 UTC.

- Add your [pokemontcg.io](https://pokemontcg.io/) API key as a repository secret named `POKEMON_TCG_API_KEY` (optional — free tier works without it, just slower)
- Trigger manually: **Actions → Daily Price Sync → Run workflow**
- Prices are written to `data/prices-latest.json` and appended to `data/price-history.json`

---

## Usage guide

### Adding cards

1. **PWA:** Tap the **+** tab in the center of the tab bar
2. Type a Pokémon name (German or English), e.g. `Glurak`, `Charizard`
3. Or type a set code + number: `PAL 072`, `base1-58`, `sv3pt5-197`
4. Set condition, variant, quantity, owner and optional purchase price
5. Save — card is stored locally on-device

### Scanning a card (PWA only)

1. Tap the **Scan** tab (camera icon)
2. Grant camera permission — nothing is uploaded, OCR runs locally
3. Hold the card in the frame; the app detects it automatically and scans
4. Confirm or adjust, then save

### Price targets (Kursziel)

1. Open any card in the portfolio → tap it to open the detail sheet
2. Scroll to the **Kursziel** section → tap **+ Setzen**
3. Enter your target price in EUR
4. A progress bar shows how close the current price is to your target
5. A "✓ Erreicht!" badge appears when the card hits the target price

---

## Project structure

```
PCPT/
├── app/                        # React/Vite app source
│   ├── src/
│   │   ├── pwa/                # PWA screens (Dashboard, Portfolio, Scan, …)
│   │   ├── components/         # Desktop components (Dashboard, CardDetail, …)
│   │   ├── hooks/              # usePortfolioData, …
│   │   └── lib/                # API, types, i18n, data-loader, price-utils
│   └── public/                 # SW, manifest (copied at build time)
├── data/                       # Static data (served by GitHub Pages)
│   ├── cards.json              # Card metadata cache
│   ├── user-cards.json         # Portfolio (committed to repo as example)
│   ├── prices-latest.json      # Latest price snapshot (updated daily)
│   └── price-history.json      # Compact per-card daily history
├── scripts/
│   ├── sync-prices.ts          # Daily price sync (run by GitHub Actions)
│   └── migrate-prices.ts       # One-time migration: daily files → history file
└── .github/workflows/
    ├── deploy.yml              # Build & deploy to GitHub Pages
    └── price-sync.yml          # Daily price fetch & commit
```

---

## Price data flow

```
pokemontcg.io API
       │  (daily, GitHub Actions)
       ▼
scripts/sync-prices.ts
       │
       ├─→ data/prices-latest.json   (full detail: all variants, URLs)
       └─→ data/price-history.json   (compact: date[], trendPrice[] per card)
                    │
                    ▼
            App loads on open
                    │
                    ▼
         buildHistoryArray()
         (real data if ≥2 points, else synthetic fallback from avg30/avg7)
                    │
                    ▼
            Sparkline charts
```

---

## License

MIT — free to use, fork, and self-host.

4. Tesseract.js reads the card name via OCR and finds the best match
5. Confirm or retry — the card opens directly in the Add screen

### Search syntax

| Input | Effect |
|-------|--------|
| `Pikachu` | Searches by card name |
| `PAL 072` | Searches by set code (PTCGO code) + collector number |
| `BS 4` | Base Set card #4 |

### Excel import

- Drag & drop an `.xlsx` or `.csv` file onto the Import/Export section
- Download the template first for the expected column format
- Browser: Import / Export tab · PWA: Settings screen

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19, TypeScript 5.8, Vite 6 |
| Styling (desktop) | Tailwind CSS 4 |
| Styling (PWA) | CSS custom properties (inline styles, no framework) |
| Table | TanStack Table v8 |
| Prices | [pokemontcg.io](https://pokemontcg.io/) API (Cardmarket EUR) |
| OCR | Tesseract.js (WASM, browser-only) |
| Import / Export | SheetJS (xlsx) |
| PWA | Vite PWA plugin + custom service worker |
| Hosting | GitHub Pages (free) |
| CI / CD | GitHub Actions |

---

## License

MIT — see [LICENSE](LICENSE).

> Pokémon and all related trademarks are property of The Pokémon Company. Prices are sourced from Cardmarket via pokemontcg.io. This project is not officially affiliated.

</div>
