# Revora — Product & Engineering Plan

> **One-liner:** Revora helps Shopify dropshippers import Temu product reviews (text, ratings, photos) onto their store — fast, without CSVs, with a storefront shoppers can actually see.

**Last updated:** June 2026  
**Status:** MVP import pipeline works (extension → API → Turso). Storefront publish **not built**.

---

## Table of contents

1. [Vision & positioning](#1-vision--positioning)
2. [Target customer](#2-target-customer)
3. [Problem we solve](#3-problem-we-solve)
4. [Competitive landscape](#4-competitive-landscape)
5. [Current state (what works)](#5-current-state-what-works)
6. [Gap analysis (what’s missing)](#6-gap-analysis-whats-missing)
7. [Product roadmap](#7-product-roadmap)
8. [Technical architecture](#8-technical-architecture)
9. [Tech stack decisions](#9-tech-stack-decisions)
10. [Data model evolution](#10-data-model-evolution)
11. [Legal, policy & distribution](#11-legal-policy--distribution)
12. [Monetization options](#12-monetization-options)
13. [Success metrics](#13-success-metrics)
14. [Risks & mitigations](#14-risks--mitigations)
15. [Phase checklist](#15-phase-checklist)

---

## 1. Vision & positioning

### Vision

Become the **default Temu review import tool** for Shopify dropshippers — not a generic multi-marketplace review app with Temu bolted on, but a product built **Temu-first** for merchants who source from Temu and sell on Shopify.

### Positioning statement

**For** Shopify dropshippers who list Temu-sourced products  
**Who** need social proof on product pages without manual CSV work  
**Revora is** a Temu → Shopify review importer  
**That** captures live reviews via browser extension and publishes them to the storefront  
**Unlike** general review apps (Kudosi, Judge.me, Loox)  
**We** focus only on the Temu → Shopify workflow: faster setup, Temu-specific UX, and filters dropshippers actually use (photos-only, text-only).

### Brand principles

- **Temu-native UX** — understand Temu’s review dialog, Photos/Videos tab, lazy loading
- **No CSV hell** — import from the live product page in clicks
- **Honest tooling** — clear that we are not affiliated with Temu or Shopify
- **Merchant owns the outcome** — reviews land on *their* products, *their* store

---

## 2. Target customer

### Primary: Temu dropshippers on Shopify

| Trait | Detail |
|-------|--------|
| **Business model** | Dropshipping / arbitrage — Temu supplier, Shopify storefront |
| **Pain** | New Shopify products have zero reviews; Temu listings have hundreds |
| **Skill level** | Non-technical to semi-technical; will install a Chrome extension |
| **Budget** | Sensitive to price; compares to $10–30/mo review apps |
| **Volume** | 5–50 products initially; 50–500 SKUs as they scale |

### Jobs to be done

1. Copy social proof from the Temu supplier listing onto my Shopify PDP
2. Import reviews **with photos** (highest trust signal)
3. Skip empty star-only reviews that look fake on my store
4. Map one Temu product → one Shopify product quickly
5. See reviews live on the storefront without theme coding

### Anti-personas (not our focus in v1)

- Enterprise brands with legal/compliance teams blocking third-party review import
- Merchants who only sell Amazon/AliExpress (Kudosi already owns that mindshare)
- Stores not using Shopify

---

## 3. Problem we solve

```
Temu product page          Shopify product page
─────────────────          ────────────────────
★★★★★ 4.5 (2,341 reviews)  ☆☆☆☆☆ No reviews
Photos, verified badges    Looks untrustworthy → lower conversion
```

Dropshippers lose conversion because:

- Most review apps support AliExpress/Amazon **out of the box**, not Temu
- CSV import is tedious and breaks on images
- Manual copy-paste does not scale
- Shopify Community threads show merchants **explicitly asking** for Temu import without CSV ([Shopify discussion, May 2025](https://community.shopify.com/t/import-reviews-from-temu/413358))

Revora closes the loop: **Temu page → extension → Revora → Shopify product → theme block on storefront**.

---

## 4. Competitive landscape

> **Important:** Revora is **not** the only Temu-capable solution. Be accurate in marketing.

### Direct competitors (Temu import via extension)

| Product | Model | Temu support | Notes |
|---------|--------|--------------|-------|
| **[Kudosi](https://kudosi.ai)** (formerly Ali Reviews) | Shopify app + Chrome extension | ✅ Paid plans | “Import from anywhere” — Amazon, AliExpress, **Temu**, eBay, Etsy. Photo/text filters. Publish to storefront. Market leader. |
| **Wise Reviews**, **Ryviu**, **Judge.me**, **Loox** | Review apps | ⚠️ Mostly CSV / Ali / Amazon | Temu usually manual or unsupported |

### Revora differentiation (why we still win a niche)

| Dimension | Kudosi / incumbents | Revora |
|-----------|---------------------|--------|
| **Focus** | All marketplaces | **Temu-only** workflow |
| **Onboarding** | Large app, many features | Install → pair → import in minutes |
| **UX** | Generic “import from anywhere” | Temu dialog automation, Photos/Videos tab, filters we built for Temu DOM |
| **Pricing** | Temu behind paid tier | Opportunity: **Temu-first free tier** or lower entry price |
| **Tone** | Enterprise review platform | Built for dropshippers |
| **Tech debt** | Legacy Ali Reviews codebase | Greenfield, modern stack |

### Market opportunity

- Kudosi proves **merchants pay** for extension-based Temu import
- Gap: no **Temu-dedicated** Shopify app with best-in-class Temu scraping UX
- Dropshipper forums repeatedly request this workflow

---

## 5. Current state (what works)

### Architecture today

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────┐
│ Temu product    │     │ revora-extension     │     │ Turso DB    │
│ page            │────▶│ intercept + scroll   │────▶│ imports +   │
│                 │     │ + upload batches     │     │ reviews     │
└─────────────────┘     └──────────────────────┘     └─────────────┘
                                    │
                                    ▼
                        ┌──────────────────────┐
                        │ revora-frontend        │
                        │ Shopify embedded admin │
                        │ pairing, import list   │
                        └──────────────────────┘
```

### ✅ Shipped

| Area | Feature |
|------|---------|
| **Shopify app** | OAuth, embedded admin, session storage (Turso) |
| **Admin UI** | shadcn/ui — pairing codes, token list, recent imports |
| **Extension** | MV3, Temu API intercept, floating panel (Shadow DOM) |
| **Temu automation** | “See all reviews” click, dialog scroll, Photos/Videos tab |
| **Filters** | All / text-only / photos-videos-only, latest 100 limit |
| **Pairing** | `REVORA1.*` codes, tunnel URL auto-sync from Shopify admin |
| **API** | Extension auth, product list, batch import, health check |
| **DB** | `Session`, `ExtensionToken`, `ReviewImport`, `ImportedReview` |

### 🔴 Not shipped (blocks customer value)

| Area | Missing |
|------|---------|
| **Shopify sync** | Reviews never written to Shopify (metafields/metaobjects) |
| **Storefront** | No theme app extension — shoppers see nothing |
| **Publish flow** | No “Publish to store” button or auto-publish |
| **Admin review mgmt** | Cannot view/edit/delete imported reviews in app |
| **Images** | Temu CDN URLs stored as strings; not mirrored to Shopify |
| **Billing** | No Shopify Billing API / plans |

---

## 6. Gap analysis (what’s missing)

### Customer-visible gaps (priority)

1. **Reviews on product pages** — #1 reason dropshippers would pay
2. **Publish control** — draft vs live, unpublish, re-sync
3. **Import detail UI** — see what was imported before publishing
4. **Product picker in admin** — App Bridge Resource Picker (better than extension-only mapping)
5. **Reliable large imports** — incremental upload, retry, progress persistence

### Technical gaps

1. `write_products` scope unused — no GraphQL mutations to Shopify
2. No metaobject / metafield definitions in `shopify.app.toml`
3. No theme app extension in repo
4. Drizzle migrations incomplete (only `Session` in SQL migration; rest via `db:push`)
5. No `syncStatus` on reviews (pending / published / failed)
6. `revora-backend/` empty — fine for now; may need job runner later

---

## 7. Product roadmap

### Phase 0 — Foundation (1 week)

**Goal:** Schema and Shopify primitives ready for publish.

- [ ] Add `syncStatus`, `shopifyMetaobjectId`, `syncError` to `ImportedReview`
- [ ] Add `publishStatus` on `ReviewImport`
- [ ] Define `$app:review` metaobject + product metafield in `shopify.app.toml`
- [ ] Add scopes: `read_metaobjects`, `write_metaobjects`
- [ ] Proper Drizzle migrations (replace ad-hoc `db:push` workflow)
- [ ] Zod schemas for all API request bodies

**Exit criteria:** `shopify app deploy` installs metafield definitions on dev store.

---

### Phase 1 — Publish to Shopify (2 weeks) 🎯 **Critical path**

**Goal:** Merchant clicks Publish → reviews attach to Shopify product.

- [ ] `lib/shopify/sync-reviews.ts` — create/update metaobjects via Admin GraphQL
- [ ] Product metafield: `list.metaobject_reference<$app:review>`
- [ ] Optional aggregate metafield: `average_rating`, `review_count`
- [ ] `POST /api/imports/[id]/publish` — manual publish
- [ ] Auto-publish setting (off by default)
- [ ] Dedupe by `temuReviewId` on re-publish
- [ ] Handle image URLs (v1: store Temu URLs; v1.5: upload to Shopify Files)

**Exit criteria:** After import + publish, metaobjects visible in Shopify Admin → Product → Metafields.

---

### Phase 2 — Storefront display (2 weeks) 🎯 **Critical path**

**Goal:** Shoppers see reviews on product pages.

- [ ] Theme app extension: `extensions/reviews-block/`
- [ ] App block: star summary, review list, photo gallery
- [ ] Merchant settings: max reviews, sort (newest / highest), layout
- [ ] Admin: “Add block to theme” deep link + setup guide
- [ ] JSON-LD structured data for SEO (optional v2)

**Exit criteria:** Dev store product page shows imported reviews via theme editor block.

---

### Phase 3 — Admin product experience (1–2 weeks)

**Goal:** Merchants manage imports without re-opening Temu.

- [ ] Import detail page — paginated review table
- [ ] Review preview (text, stars, photos)
- [ ] Publish / unpublish / re-sync actions
- [ ] App Bridge **Resource Picker** for product mapping
- [ ] TanStack Query for client-side data (imports, reviews, sync status)
- [ ] Toast notifications via App Bridge
- [ ] Empty states, error states, sync failure retry UI

**Exit criteria:** Full import lifecycle manageable from Shopify admin only.

---

### Phase 4 — Extension hardening (1 week)

**Goal:** Reliable imports at scale (500–1000 reviews).

- [ ] Incremental upload during scroll (use `pendingUpload` queue)
- [ ] Product search in extension panel (API already supports `?search=`)
- [ ] Show skipped duplicate count from API
- [ ] Retry failed batches with exponential backoff
- [ ] Resume interrupted import via `importId`
- [ ] Temu DOM fallback docs + selector override improvements

**Exit criteria:** 1000-review import completes without single-point-of-failure at end.

---

### Phase 5 — Go to market (2–4 weeks)

**Goal:** Real merchants outside dev mode.

| Track | Tasks |
|-------|-------|
| **Shopify App Store** | Listing, screenshots, privacy policy, support email, app review |
| **Chrome Web Store** | $5 dev fee, privacy policy, permission justification, unlisted → public |
| **Billing** | Shopify Billing API — free tier (N imports/mo) + Pro |
| **Hosting** | Production deploy (Fly.io / Railway / Vercel + Turso) — stable URL, no Cloudflare tunnel |
| **Monitoring** | Sentry for API + extension error reports |
| **Docs** | Merchant help center: install extension, first import, add theme block |

**Exit criteria:** One paying merchant completes import → publish → live storefront without founder hand-holding.

---

### Phase 6 — Growth features (post-launch)

- Bulk import: Temu URL list → queue multiple products
- Auto-match Temu URL to Shopify product by SKU/handle
- Review moderation (approve before publish)
- Translate reviews to store language
- AliExpress / Shein expansion (only if Temu PMF proven)
- Analytics: import → publish → conversion uplift

---

## 8. Technical architecture

### Target architecture (end state)

```
┌──────────────┐    ┌─────────────────────────────────────────────────┐
│ Chrome       │    │ revora-frontend (Next.js on Bun)                │
│ Extension    │───▶│  ├─ Admin UI (shadcn + TanStack Query)          │
│              │    │  ├─ Extension APIs (/api/extension/*, /import)  │
└──────────────┘    │  ├─ Publish API (/api/imports/[id]/publish)     │
                    │  ├─ Shopify GraphQL sync layer                  │
                    │  └─ Theme app extension (storefront block)      │
                    └───────────────┬─────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              ┌──────────┐  ┌────────────┐  ┌──────────────┐
              │ Turso    │  │ Shopify    │  │ Shopify      │
              │ (source  │  │ Metaobjects│  │ Theme        │
              │ of truth)│  │ + product  │  │ (app block)  │
              │          │  │ metafields │  │              │
              └──────────┘  └────────────┘  └──────────────┘
```

### Sync flow (publish)

```
1. Merchant clicks "Publish" (or auto-publish on import complete)
2. API loads ImportedReview rows for importId + shopifyProductId
3. For each review:
   a. metaobjectCreate / metaobjectUpdate ($app:review)
   b. Mirror images → Shopify Files (phase 1.5)
4. productUpdate → set metafield list.metaobject_reference
5. Update syncStatus in Turso
6. Theme block reads metafields → renders on PDP
```

### Monorepo layout (keep single repo)

```
revora/
├── plan.md                 # This document
├── AGENTS.md               # AI / dev conventions
├── package.json            # bun run dev
├── revora-frontend/         # Shopify app + APIs + theme extension
│   ├── app/                # Next.js routes
│   ├── extensions/         # Theme app extension (Phase 2)
│   ├── lib/shopify/        # GraphQL, sync, auth
│   └── src/db/             # Drizzle schema
├── revora-extension/       # Chrome MV3
└── revora-backend/         # Defer — use Inngest in frontend first
```

---

## 9. Tech stack decisions

### Keep (already chosen correctly)

| Layer | Choice | Why |
|-------|--------|-----|
| **Runtime / package manager** | Bun | Fast, lockfile committed, team preference |
| **Framework** | Next.js 16 (App Router) | Shopify CLI default, SSR for embedded app |
| **Language** | TypeScript | Type safety across API + admin |
| **Database** | Turso (libSQL) | Serverless-friendly, edge replication, SQLite DX |
| **ORM** | **Drizzle** | Lightweight, SQL-like, great Turso support — **keep, don’t switch to Prisma** |
| **Admin UI** | shadcn/ui + Tailwind 4 | Working, flexible; hybrid App Bridge for pickers/toasts |
| **Shopify SDK** | `@shopify/shopify-api` v13 | OAuth, GraphQL, session storage |
| **Extension** | Chrome MV3 plain ES modules | No bundler needed yet; simple load-unpacked dev |
| **Auth (extension)** | Bearer tokens in Turso | Simple, works with pairing codes |

### Add (recommended for next phases)

| Layer | Choice | When | Why |
|-------|--------|------|-----|
| **Client data fetching** | **TanStack Query v5** | Phase 3 | Caching, refetch, polling sync status, pagination — better than raw `fetch` in `extension-pairing.tsx` |
| **Validation** | **Zod** | Phase 0 | API input validation, shared types with extension payloads |
| **Background jobs** | **Inngest** (or Trigger.dev) | Phase 1 if publish is slow | Publish 1000 reviews without HTTP timeout; retries |
| **Error monitoring** | **Sentry** | Phase 5 | Production debugging |
| **Rate limiting** | **Upstash Redis** | Phase 5 | Extension API abuse protection (optional) |
| **Image storage** | **Shopify Files API** | Phase 1.5 | Temu hotlinks break; Shopify-hosted images persist |
| **Testing** | **Vitest** + Playwright | Phase 4+ | API unit tests; optional Temu E2E (fragile) |

### Do not add (yet)

| Layer | Why skip |
|-------|----------|
| **Prisma** | Already on Drizzle; migration cost for no gain |
| **tRPC** | Overkill for extension REST + admin fetch |
| **Separate Express backend** | Next.js API routes sufficient until job volume grows |
| **GraphQL API (our own)** | Extension needs simple REST |
| **Full Polaris UI** | shadcn works; use App Bridge surgically |
| **Kubernetes** | Absurd for current scale |

### Drizzle vs Prisma (decision record)

**Decision: Keep Drizzle.**

- Turso is libSQL/SQLite — Drizzle’s first-class `@libsql/client` support is excellent
- Lighter bundle for serverless/edge routes
- Schema is simple (4 tables, growing to ~6)
- `better-sqlite3` in package.json is legacy from local dev — remove when fully on Turso

### TanStack Query vs alternatives

**Decision: Add TanStack Query for admin client components only.**

- Server components stay for initial auth/shop context
- Client pages (import detail, review table, publish button) benefit from `useQuery` / `useMutation`
- Do **not** add Redux/Zustand unless global UI state becomes complex

---

## 10. Data model evolution

### New fields (Phase 0)

**`ImportedReview`**
```ts
syncStatus: 'pending' | 'published' | 'failed'
shopifyMetaobjectId: string | null
syncError: string | null
publishedAt: string | null
```

**`ReviewImport`**
```ts
publishStatus: 'draft' | 'published' | 'partial'
shopifySyncCompletedAt: string | null
```

### Shopify metaobject: `$app:review`

| Field | Type | Source |
|-------|------|--------|
| `author_name` | single_line_text | `authorName` |
| `comment` | multi_line_text | `comment` or `translatedComment` |
| `score` | number_integer | `score` (1–5) |
| `review_date` | date | `reviewTime` |
| `pictures` | list.url or list.file_reference | `pictures[]` |
| `temu_review_id` | single_line_text | dedup key |
| `source` | single_line_text | `"temu"` |

**Product metafield:** `product.metafields.app.reviews` → `list.metaobject_reference<$app:review>`

---

## 11. Legal, policy & distribution

### Chrome Web Store

- **Cost:** ~$5 one-time developer registration
- **Review:** Yes — every publish and update is reviewed (days to weeks)
- **Risks:** Privacy policy required, `inject.js` fetch interception, broad host permissions
- **Beta strategy:** Load unpacked + unlisted listing

### Shopify App Store

- Separate review process
- Privacy policy + GDPR data handling documentation
- Must demonstrate working embedded app + clear billing if paid

### Temu / content

- Scraping may violate Temu ToS — product risk, not just technical
- Marketing: “unofficial tool for merchants” — never imply Temu partnership
- Consider mirroring images to Shopify Files to reduce hotlink dependency

---

## 12. Monetization options

| Plan | Price | Limits |
|------|-------|--------|
| **Free** | $0 | 3 products/mo, 100 reviews/import, manual publish |
| **Starter** | $9.99/mo | 20 products/mo, 500 reviews/import, auto-publish |
| **Pro** | $24.99/mo | Unlimited products, 1000 reviews/import, priority sync, image mirroring |

Implement via **Shopify Billing API** (required for App Store paid apps).

**Position vs Kudosi:** Undercut or offer generous free Temu tier — Kudosi puts Temu behind paid plans.

---

## 13. Success metrics

### MVP (Phase 1–2 complete)

| Metric | Target |
|--------|--------|
| Import → publish success rate | > 95% |
| Time to first storefront review | < 10 minutes from install |
| Reviews visible on PDP | 100% after publish + theme block added |

### Launch (Phase 5)

| Metric | Target |
|--------|--------|
| Active installs (Shopify) | 50 in 90 days |
| Paid conversion | 10% of active |
| Churn | < 8% monthly |
| Support tickets per import | < 0.1 |

---

## 14. Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Temu changes DOM/API | Extension breaks | Selector overrides, fast release cycle, monitor error rates |
| Kudosi copies Temu-first positioning | Competition | Move fast, better Temu UX, niche brand |
| Chrome Web Store rejection | No public extension | Unlisted listing; merchant zip install |
| Temu ToS / legal | Business risk | Legal review; merchant responsibility disclaimers |
| Temu image URLs die | Broken photos | Shopify Files mirroring (Phase 1.5) |
| Large import timeouts | Failed publishes | Inngest background jobs + incremental upload |
| Tunnel URL dev friction | Slow dev | Production stable host early for beta |

---

## 15. Phase checklist

### Now → MVP (merchant sees reviews on store)

```
[ ] Phase 0 — Schema + metaobject TOML + Zod
[ ] Phase 1 — Publish API + Shopify sync
[ ] Phase 2 — Theme app extension
[ ] Phase 3 — Import detail admin (minimal)
[ ] Production hosting with stable URL
[ ] Privacy policy page
```

### MVP → Launch

```
[ ] Phase 4 — Extension hardening
[ ] Phase 5 — App Store + Chrome Web Store + Billing
[ ] Sentry + basic analytics
[ ] Help docs
```

### Launch → Scale

```
[ ] Phase 6 — Bulk import, moderation, analytics
[ ] Image mirroring at scale
[ ] Optional: revora-backend worker if Inngest limits hit
```

---

## Appendix A — API surface (planned)

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/reviews/import` | Extension | Batch import (exists) |
| GET | `/api/imports` | Admin | List imports (exists) |
| GET | `/api/imports/[id]` | Admin | Import detail |
| GET | `/api/imports/[id]/reviews` | Admin | Paginated reviews |
| POST | `/api/imports/[id]/publish` | Admin | Sync to Shopify |
| POST | `/api/imports/[id]/unpublish` | Admin | Remove from Shopify |
| GET | `/api/products` | Extension/Admin | Product list (exists) |

---

## Appendix B — Key files reference

| Path | Role |
|------|------|
| `revora-extension/src/inject.js` | Temu API interception |
| `revora-extension/src/content.js` | Panel, scroll, filters |
| `revora-extension/src/background.js` | Upload to Revora API |
| `revora-frontend/lib/extension/import.ts` | DB batch insert |
| `revora-frontend/src/db/schema.ts` | Drizzle tables |
| `revora-frontend/shopify.app.toml` | App config + future metafield TOML |
| `revora-frontend/components/extension-pairing.tsx` | Admin pairing UI |

---

## Summary

Revora has a **working import pipeline** but is **~40% of the way** to what dropshippers will pay for. The critical path is:

1. **Publish reviews to Shopify** (metaobjects + product metafields)
2. **Show them on the storefront** (theme app extension)
3. **Let merchants manage the lifecycle** in admin

**Stack:** Keep Bun + Next.js + Turso + Drizzle + shadcn. Add TanStack Query, Zod, Inngest, and Shopify theme extension. Do not rewrite to Polaris or Prisma.

**Competition:** Kudosi exists for Temu — differentiate as **Temu-first**, simpler, dropshipper-focused.

**Next PR to ship:** Phase 0 + Phase 1a — metaobject definitions and `POST /api/imports/[id]/publish`.