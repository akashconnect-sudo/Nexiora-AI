# UI/UX Plan

**Product:** Nexiora AI / Nova Search  
**Document:** UX-1.0  
**Status:** Draft — Awaiting Approval

---

## 1. Design Principles

1. **Brand first** — Nexiora / Nova Search is the hero signal on marketing surfaces; headlines never overpower the brand.
2. **One job per section** — no dashboard clutter on the landing hero.
3. **Citation-native** — trust UI is first-class, not a footnote.
4. **Speed as a feeling** — streaming tokens, skeleton restraint, instant omnibox focus.
5. **Apple-level quiet** — minimal chrome, expressive typography, atmospheric background (not flat gray; not purple-gradient cliché).
6. **Accessible by default** — WCAG 2.2 AA, keyboard, reduced motion.

---

## 2. Visual Direction

| Token | Direction |
|-------|-----------|
| Mood | Precision, calm authority, “editorial tech” |
| Light | Cool paper white with soft graphite ink; subtle grid/noise atmosphere |
| Dark | Deep charcoal (not pure black) with restrained teal accent |
| Accent | Single teal/cyan signal for CTA and confidence — avoid purple/indigo AI cliché |
| Display font | Distinctive geometric sans (e.g. Satoshi / General Sans) — not Inter/Roboto |
| Body | Highly readable grotesque companion |
| Radius | Modest (6–10px); no pill overload |
| Motion | 2–3 intentional motions: omnibox focus glow settle, answer stream fade-in, citation rail stagger |

**Forbidden on brand surfaces:** purple-on-white gradients, cream+terracotta broadsheet clone, emoji decoration, floating badge spam on hero media.

---

## 3. Information Architecture

### Marketing

`/` Landing · `/pricing` · `/features` · `/docs` · `/blog` · `/legal/*`

Landing first viewport: **Brand + one headline + one sentence + CTA group (Search / Get Started) + full-bleed atmospheric visual**. No stats strip, no card grid in hero.

Below fold: Trending · Latest News · Categories · Features · Pricing teaser · Testimonials · Footer.

### App

Shell: left nav (collapsible) + top omnibox affordance + account.

Routes: Dashboard, Search, News, Saved, History, Collections, Bookmarks, Notes, Workspace, Notifications, Account, Subscription, API Keys, Settings.

### Admin

Dense but calm data UI; separate visual density tokens.

---

## 4. Key Screens

### 4.1 Landing Hero

- Brand wordmark large
- Headline supporting Nova Search promise
- Functional search box (submits to search experience)
- Secondary: Get Started / Login
- Theme toggle

### 4.2 Search Results

Layout:

```
┌──────────────────────────────────────────────┐
│ Omnibox + mode chips + filters               │
├────────────────────────────┬─────────────────┤
│ Summary (stream)           │ Citations rail  │
│ Detailed answer            │ Trust / Official│
│ Media / News modules       │ Actions         │
│ Related + Creator panel    │                 │
├────────────────────────────┴─────────────────┤
│ Assistant dock (collapsible)                 │
└──────────────────────────────────────────────┘
```

Confidence as compact meter + numeric; never vanity badges overlaid on media.

### 4.3 Result / Citation Item

Title · domain · official · trust · published · snippet · actions (open, copy, bookmark).

### 4.4 Dashboard

Resume last searches, saved, brief trends — not a KPI wall for consumers.

---

## 5. Component System (`packages/ui`)

Built on Tailwind + Shadcn primitives + React Aria where needed:

- `Omnibox`, `ModeChip`, `FilterDrawer`
- `AnswerStream`, `CitationRail`, `ConfidenceMeter`
- `SourceBadge`, `TrustScore`
- `NewsTicker`, `TrendList`
- `CollectionCard` (interaction container only)
- `AssistantDock`
- Theme provider, focus rings, skip links

React Virtual for long citation/history lists.

---

## 6. Motion Spec

| Motion | Where | Duration |
|--------|-------|----------|
| Omnibox elevate | Focus | 180ms |
| Token fade | Answer stream | per chunk |
| Citation stagger | Rail populate | 40ms cascade |
| Page transition | App routes | 200ms fade (respect reduced motion → none) |

---

## 7. Content & Tone

- Confident, precise, non-hype
- Disclaimers for healthcare/legal/finance modes
- Empty states teach one next action

---

## 8. Localization & RTL

- String catalogs via `next-intl` (or equivalent)
- RTL layout verification for Arabic (Phase 3+)

---

## 9. Usability Metrics

- Time-to-first-query from landing < 5s
- Citation click-through healthy but not forced
- SUS ≥ 80 for Pro users in research study

---

## 10. Approval

Design direction + IA approval before high-fidelity implementation in Phase 1.
