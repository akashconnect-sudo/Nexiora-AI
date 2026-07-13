# Creator Intelligence Engine — Module Spec

## Mission

Help YouTube creators discover high-opportunity content ideas **before saturation**, using public internet signals, optional consented channel data, and Nexiora search behavior — **never claiming to read minds**.

## Non-negotiables

1. Never invent private channel metrics.
2. Every recommendation includes a short **why**.
3. Every item is tagged `prediction` | `signal` | `verified`.
4. No Google/YouTube access without explicit permission.

## Phased delivery

| Phase | Scope |
|-------|--------|
| **C0 (this ship)** | Profile + permissions, Creator DNA skeleton, dashboard API, opportunity scoring domain, public-signal recommendations, coach tips, ideas generator, web UI |
| **C1** | YouTube OAuth + Analytics read (consented), real CTR/retention fields |
| **C2** | Trend workers (GT, YT trending, Reddit, GH, Product Hunt), notification fan-out |
| **C3** | Competitor graph, calendar, monetization/CPM models with cited sources |

## API (v1)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/v1/creator/profile` | Bearer | Profile + permissions |
| PUT | `/v1/creator/profile` | Bearer | Upsert niche / display |
| PATCH | `/v1/creator/permissions` | Bearer | Grant/revoke scopes |
| GET | `/v1/creator/dna` | Bearer | Creator DNA snapshot |
| GET | `/v1/creator/dashboard` | Bearer | Personalized home payload |
| GET | `/v1/creator/opportunities` | Bearer | Ranked topics + scores |
| GET | `/v1/creator/trends` | Bearer | Trend board |
| POST | `/v1/creator/ideas` | Bearer | Titles, hooks, SEO pack |
| POST | `/v1/creator/search/enrich` | Bearer | Search-side recommendations |
| GET | `/v1/creator/coach` | Bearer | Growth coach tips |

## Scoring (Content Opportunity)

Domain function weights (0–100 inputs → opportunity 0–100):

- demand, competition (inverted), growthSpeed, evergreen, monetization, cpm, difficulty (inverted), audienceInterest, trendPrediction, virality

Confidence rises when more **verified** inputs are present (connected YouTube).

## Web routes

`/creator`, `/creator/onboarding`, `/creator/trends`, `/creator/opportunities`, `/creator/ideas`, `/creator/coach`, `/creator/dna`
