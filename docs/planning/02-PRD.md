# Product Requirements Document (PRD)

**Product:** Nexiora AI — Nova Search  
**Document:** PRD-1.0  
**Status:** Draft — Awaiting Approval

---

## 1. Vision

**Nexiora AI** builds the world’s most trustworthy AI knowledge layer.  
**Nova Search** is the flagship experience: ask anything, get a verified, cited, real-time answer — plus creator and research superpowers.

**Positioning:** Not Google. Not “chat that sometimes searches.”  
**Category:** AI Knowledge Platform — intent → multi-source retrieval → verification → synthesis → action.

**North-star promise:** Every factual claim is attributable; every answer shows confidence and freshness.

---

## 2. Problem

| Problem | Who feels it | Cost |
|---------|--------------|------|
| Search results are link lists, not answers | Everyone | Time, cognitive load |
| Chatbots hallucinate without sources | Professionals, students | Wrong decisions |
| Trustworthy sources are hard to filter | Researchers, journalists | Misinformation risk |
| Creators need trends + SEO + scripts in many tools | Creators | Tool sprawl |
| Teams can’t share verified research trails | Knowledge workers | Duplicated work |

---

## 3. Goals & Non-Goals

### Goals (12 months)

1. Become the default “verify then decide” search for power users
2. 1M MAU with retention D30 ≥ 25% for Pro cohort
3. Gross margin ≥ 60% on Pro after inference optimization
4. API developers contributing ≥ 15% of revenue
5. WCAG 2.2 AA and SOC 2 Type I readiness path started

### Non-Goals (Year 1)

- Replacing Google for navigational queries (“facebook login”)
- Building a full social network
- Training a frontier foundation model from scratch
- Guaranteeing medical/legal advice (we cite; we do not replace licensed professionals)

---

## 4. Personas

### P1 — Maya, Knowledge Worker (Primary)

Needs fast, cited answers for reports. Pays for Pro. Uses Research Mode, exports APA/BibTeX.

### P2 — Arjun, Content Creator

Needs trends, hooks, scripts, SEO. Uses Creator Mode daily. Shares results to Notion/Drive later.

### P3 — Dev, API Consumer

Integrates Nova Search into an internal wiki. Needs stable REST, keys, usage metering.

### P4 — Sam, Anonymous Explorer

Tries 3–5 searches from landing; converts if answer quality beats Perplexity/Google AI Overview.

### P5 — Admin Ops

Monitors abuse, cost spikes, moderation queue.

---

## 5. User Journeys (Critical)

### J1 — First Search (Anonymous)

Landing → type query → stream summary + citations → soft gate on 4th search → sign up.

### J2 — Authenticated Deep Search

Dashboard → Universal Search → filters (Official + Past Week) → Detailed Answer → Fact Check → Save to Collection → Export PDF.

### J3 — Creator Pipeline

Enable Creator Mode → query niche topic → get titles/hooks/keywords/hashtags → generate script → save.

### J4 — Research Citation

Research Mode → academic filters → paper cards → BibTeX export → chat “compare methodology of top 3”.

### J5 — Subscribe & API

Hit rate limit → Pricing → Checkout → API Keys → first successful `/v1/search`.

---

## 6. Feature Spec (Product View)

### 6.1 Marketing Site

- Hero with brand-forward Nexiora / Nova Search identity
- Primary search CTA (functional, not decorative)
- Trending, latest news teaser, categories, features, pricing, testimonials, footer
- Dark / light mode, motion with reduced-motion fallback

### 6.2 Core Search Experience

**Input:** omnibox with mode chips, voice, image attach, filters drawer.

**Output composition (single result page, sections not competing cards in hero):**

1. AI Summary (streamed)
2. Detailed Answer (streamed, structured)
3. Citations rail (trust, confidence, updated_at, official badge)
4. Media: images / videos when relevant
5. Live news module when news intent
6. Related questions + query suggestions
7. Creator panel (if mode on)
8. Assistant dock (chat with this result)

**Result card fields:** title, description, AI summary snippet, official flag, confidence, pub date, read time, author, language, actions (translate, bookmark, share, copy, export, listen, save).

### 6.3 Modes

| Mode | Behavior |
|------|----------|
| Universal | Balanced synthesis |
| Research | Academic/gov priority, citation export |
| News | Freshness-first + breaking |
| Code | GitHub/docs/StackOverflow-class sources |
| Academic | Papers-first |
| Creator | Append ideation artifacts |
| Shopping / Travel / Jobs / Maps / People / Companies / Healthcare / Finance | Specialized adapters + disclaimers |

### 6.4 Post-Login IA

Dashboard · Universal Search · Saved · History · Collections · Bookmarks · Notes · Workspace · Notifications · Account · Subscription · API Keys · Settings

### 6.5 Admin IA

Users · Roles · Permissions · Analytics · Subscriptions · Payments · API Usage · Logs · Reports · Moderation · Content Review · Security Dashboard

### 6.6 Monetization

| Tier | Search quota | Modes | API | Workspaces |
|------|--------------|-------|-----|------------|
| Free | Low daily | Universal, limited News | No | Personal |
| Pro | High | All consumer modes | Limited | Personal |
| Business | Team | All + shared collections | Higher | Team |
| Enterprise | Custom | Custom + SSO/audit | Custom | Org |

Exact numbers finalized in Pricing experiment; engineering must meter usage flexibly.

---

## 7. Success Metrics

| Metric | Definition | Target (6 mo post-MVP) |
|--------|------------|-------------------------|
| Answer citation rate | % answers with ≥1 citation | ≥ 95% |
| User trust CSAT | In-product “Was this trustworthy?” | ≥ 4.3/5 |
| p95 TTFB stream | First token | ≤ 2.5s |
| Activation | Signup → 3 searches in 24h | ≥ 40% |
| Free→Pro conversion | 30-day | ≥ 4% |
| Hallucination flag rate | User report / auto fact-check fail | Decreasing QoQ |
| API error rate | 5xx | < 0.1% |

---

## 8. Competitive Differentiation

| Capability | Google | Perplexity | ChatGPT | Nova Search |
|------------|--------|------------|---------|-------------|
| Citation-first UI | Partial | Strong | Partial | Strong + trust scores |
| Creator ideation layer | Weak | Weak | Chat-only | First-class mode |
| Research citation export | Weak | Partial | Weak | BibTeX/APA/MLA |
| Multi-model routing | N/A | Limited | Single vendor | Pluggable router |
| Cross-platform native clients | Strong | Web-first | Strong | Web+PWA+Electron+Mobile |
| API as product | Separate | Yes | Yes | Yes, metered |

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| LLM / search API cost explosion | Caching, model routing, query complexity classifier, hard budgets |
| Hallucinations | Mandatory citations, fact-check agent, abstain when low confidence |
| Provider ToS / scraping bans | Licensed APIs, respect robots, no ToS-violating scrapers in prod |
| Abuse (bot searches) | Captcha, device fingerprint heuristics, rate limits, anomaly detection |
| Brand confusion (Nexiora vs Nova) | Clear hierarchy in UI; approve branding in INDEX |

---

## 10. Launch Phases (Product)

Aligned with Development Roadmap:

- **MVP (Phase 1–2):** Auth, Universal Search streaming, citations, history, billing Free/Pro, web+PWA
- **Growth (Phase 3):** News, Creator, Research, Assistant, API keys
- **Platform (Phase 4):** Electron, mobile, workspaces, admin full
- **Scale (Phase 5–6):** Multi-region, advanced crawlers, enterprise SSO

---

## 11. Open Product Decisions (Need Approval)

1. Sole brand vs dual brand (Nexiora + Nova Search)?
2. Auth provider: Clerk (recommended) vs Auth.js self-hosted?
3. Mobile: React Native (Expo) vs Capacitor wrapping Next.js?
4. Default LLM for summary: Claude vs GPT vs Gemini (router still multi-model)?
5. MVP geography: global English-first vs EN+HI day-one?

---

## 12. Approval

Product Owner sign-off required before Phase 0 coding.
