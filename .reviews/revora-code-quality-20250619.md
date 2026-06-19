# Code Quality Review

**Scope:** Full working-tree diff (modified + untracked) — billing, connect flow, admin proxy, publish pipeline, theme extension, dev tunnel setup.

**Verdict: REQUEST CHANGES**

Behavior is largely correct and the admin-proxy architecture is the right call for tunnel churn. But the diff pushes a core file past 1k lines, duplicates transport logic in multiple places, and papers over data-shape bugs at the wrong layer. Several security/billing gaps from the prior review remain open. Do not merge until the structural issues below are addressed or explicitly justified.

---

## 1. Structural regressions

### [BLOCKER] `content.js` crosses 1k lines — decompose before adding more
- **File:** `revora-extension/src/content.js` (1101 lines)
- **Issue:** One file owns shadow-DOM UI (~250 lines inline CSS/HTML), Temu DOM heuristics (see-all button, dialog scroll, photos tab), upload batching, plan state, and panel lifecycle.
- **Why it matters:** Every new Temu UI tweak or import feature will land in an already-unscannable file. This is the clearest file-size violation in the diff.
- **Code-judo move:** Split into focused modules:
  - `temu-panel.js` — shadow host, styles, panel state, `initializePanel`
  - `temu-scraper.js` — dialog discovery, scroll, filter, `ingestPayload`
  - `temu-upload.js` — `flushUploads`, batching, `startImport` orchestration
  - Keep `content.js` as a thin bootstrap that wires the three together.
- **Approval bar:** This file should not grow further without decomposition.

### [BLOCKER] Extension transport logic is duplicated and spreading
- **Files:** `revora-extension/src/background.js` (504 lines), `revora-extension/src/admin-bridge.js` (282 lines)
- **Issue:** `apiRequest` implements direct-fetch → ngrok headers → admin-proxy fallback. `REVORA_CONNECT_EXCHANGE` re-implements the same direct → proxy fallback with different error strings and without reusing `apiRequest`. `ngrokHeaders`, `getStoredConnection`, and shop/plan fallbacks are bolted onto individual message handlers (`REVORA_VERIFY`, `REVORA_GET_PLAN`).
- **Why it matters:** Three places to update for every networking change; fallbacks mask real API failures instead of fixing transport once.
- **Code-judo move:** Extract `src/api-transport.js`:
  ```js
  fetchRevora({ path, method, body, auth: "token" | "none" })
  enrichConnection(data) // single stored-shop merge
  ```
  Message listener becomes a thin dispatcher. `REVORA_CONNECT_EXCHANGE` becomes `fetchRevora({ path: "/api/extension/connect/exchange", auth: "none", body: { code } })` plus `persistConnection(data)`.
- Delete `getStoredSettings` / `getStoredConnection` overlap — one `readConnectionState()`.

### [MAJOR] Publish pipeline updates state non-atomically
- **File:** `revora-frontend/lib/shopify/sync-reviews.ts:182-277`
- **Issue:** Each review is marked `published` in DB as soon as its metaobject succeeds. `productUpdate` runs afterward. If product metafields fail, reviews exist in Shopify but the storefront block (which reads product metafields) won't show them. Import row ends `partial` with no surfaced per-review errors in admin UI.
- **Code-judo move:** Two-phase publish:
  1. Create/update all metaobjects (collect IDs + errors, no DB writes yet)
  2. Single `productUpdate` with collected IDs
  3. Batch DB update only after product metafields succeed
  On product failure: nothing marked published; return `{ published: 0, failed, errors: [...] }`.

### [MAJOR] Plan source-of-truth is split across three layers
- **Files:** `lib/shopify/plan-store.ts`, `lib/shopify/billing.ts`, `app/api/billing/status/route.ts`, `app/api/extension/plan/route.ts`
- **Issue:** Import limits read `ShopPlan` table only. Billing status reads Shopify subscriptions but never reconciles/downgrades. Extension plan endpoint never checks subscription state.
- **Why it matters:** Feature logic (limits) and billing truth diverge silently — architectural boundary leak.
- **Code-judo move:** One `resolveShopPlan(shop, session)` that:
  - Reads Shopify `activeSubscriptions`
  - Upserts `ShopPlan` to match
  - Returns plan + limits
  Used by billing status, extension plan, and import enforcement. Delete ad-hoc reads of stale local state.

---

## 2. Missed simplification / code-judo

### [MAJOR] Picture normalization belongs at import boundary, not publish
- **Files:** `revora-extension/src/background.js:317`, `lib/extension/import.ts:113`, `lib/shopify/sync-reviews.ts:29-52`
- **Issue:** Temu sends `{ url, width, height }` objects. Import stores them raw. Publish failed with "Value must be a single line text string" until `parsePictures` was patched. The publish layer now knows Temu wire format — wrong boundary.
- **Code-judo move:** Normalize once in `mapReview` or `processImportBatch`:
  ```ts
  pictures: normalizePictureUrls(review.pictures) // string[]
  ```
  `sync-reviews` only deals with `string[]` JSON. Delete `pictureUrl`/`parsePictures` object-branching from publish path.

### [MAJOR] Admin proxy should be a narrow gateway, not a generic fetch relay
- **File:** `revora-frontend/components/extension-bridge.tsx:100-115`
- **Issue:** Any `path` from `postMessage` is fetched. No allowlist, no method restrictions. Trust boundary is the iframe, but the implementation is maximally permissive.
- **Code-judo move:** `const ALLOWED_PREFIXES = ["/api/extension/", "/api/products", "/api/reviews/import"]` — reject before fetch. This deletes an entire class of misuse without adding complexity elsewhere.

### [MODERATE] `REVORA_THEME` duplicated; `theme.js` is dead code
- **Files:** `revora-extension/src/content.js:9-19`, `revora-extension/src/theme.js`
- **Issue:** Identical tokens in two places; module never imported.
- **Fix:** Import `REVORA_THEME` in `content.js` and `popup` styles, or delete `theme.js`. Trivial, but signals incomplete cleanup.

### [MODERATE] `connect-extension.tsx` copy contradicts implementation
- **File:** `revora-frontend/components/connect-extension.tsx:83-106`
- **Issue:** UI still tells users to copy/paste "Server URL" into the extension, but `config.js` hardcodes the ngrok URL and the popup removed manual URL entry.
- **Fix:** Remove server URL copy UI and stale instructions. One less concept for users and maintainers.

### [MODERATE] Sequential N+1 GraphQL in publish loop
- **File:** `lib/shopify/sync-reviews.ts:182-208`
- **Issue:** `for (const review of reviews) { await upsertReviewMetaobject(...) }` — 9 reviews = 9+ round trips in 6.6s (matches server log).
- **Code-judo move:** `Promise.all` with concurrency cap (e.g. 5), or Shopify bulk mutation if available. Orchestration separate from field-building (`buildReviewFields(review)` pure function).

---

## 3. Spaghetti / branching growth

### [MAJOR] `getSettings()` dual pairing paths
- **File:** `revora-extension/src/background.js:13-47`
- **Issue:** `pairingToken` direct storage vs `pairingCode` decode branch. Every consumer must understand both legacy and connect-code flows.
- **Suggestion:** On connect exchange, write only `pairingToken` + drop `pairingCode` encoding for new connections. Migration: if `pairingCode` exists without `pairingToken`, decode once and rewrite. Collapse `getSettings` to one path.

### [MODERATE] Shop/plan fallbacks in handlers paper over transport bugs
- **File:** `revora-extension/src/background.js:411-447`
- **Issue:** `REVORA_VERIFY` and `REVORA_GET_PLAN` merge `stored.shop` when API response is empty. This fixed "Connected to undefined" but adds permanent fallback branches in two handlers.
- **Better:** Fix transport once (ngrok header + JSON validation in `directApiRequest` is good); use single `enrichConnection(data)` if fallback is still needed. Don't duplicate per handler.

### [MODERATE] `createConnectCode` mints unbounded tokens
- **File:** `lib/extension/connect.ts:24-37`
- **Issue:** Each "Generate code" inserts a new `extensionTokens` row without revoking prior ones. Connect flow branching will get worse as token lifecycle grows.
- **Fix:** Revoke existing shop tokens (or cap at 1 active) inside `createConnectCode`.

---

## 4. Boundary / type / contract problems

### [MAJOR] Plaintext `pairingToken` in `ConnectCode` table
- **Files:** `lib/extension/connect.ts:44`, `src/db/schema.ts`
- **Issue:** `extensionTokens` stores hash; `connectCodes` stores raw `pairingToken`. Inconsistent security model.
- **Fix:** Store only `extensionTokenId`; derive token at creation time, return once in exchange response, never persist plaintext in connect table.

### [MAJOR] Connect exchange unauthenticated + brute-forceable
- **File:** `app/api/extension/connect/exchange/route.ts`
- **Issue:** 6-char code, no rate limit, no attempt logging.
- **Fix:** Rate limit per IP/code; lock after N failures; consider 8+ char codes.

### [MODERATE] Import API lacks runtime validation
- **File:** `app/api/reviews/import/route.ts` (referenced by extension upload)
- **Issue:** Connect exchange uses Zod; import uses unchecked cast. Asymmetric contract enforcement.
- **Fix:** Shared Zod schema for `ImportBatchRequest`.

### [MODERATE] Cast-heavy GraphQL in `sync-reviews.ts`
- **Issue:** Every mutation response cast from `unknown`. Readable but brittle.
- **Fix:** Small typed wrappers (`mutateMetaobjectCreate`, `mutateProductUpdate`) or generated types. Not blocking, but publish is core — worth typing.

### [MINOR] `averageScore` uses all reviews, not published subset
- **File:** `lib/shopify/sync-reviews.ts:211-217`
- **Issue:** After partial failure, average includes failed reviews' scores.
- **Fix:** Compute from successfully published metaobject IDs only.

---

## 5. What is working well

- Admin-proxy design (`extension-bridge.tsx` + `admin-bridge.js`) is the right abstraction for tunnel URL churn.
- Server-side plan enforcement in `processImportBatch` is in the correct layer.
- Connect codes are single-use with TTL.
- `proxy.ts` migration is clean and minimal.
- `plans.ts` is a good single source for tier definitions.
- Theme extension structure is complete; metafield keys align with publish code.
- Picture URL fix in `sync-reviews` is correct — just at the wrong layer.

---

## 6. Suggested PR decomposition

Instead of one large merge, consider:

1. **PR1 — Extension transport:** Extract `api-transport.js`, path allowlist on bridge, ngrok headers. No feature changes.
2. **PR2 — Connect security:** Rate limits, drop plaintext tokens, token revocation on new code.
3. **PR3 — Publish pipeline:** Normalize pictures at import, atomic publish, parallel GraphQL, admin error surfacing.
4. **PR4 — Billing reconcile:** `resolveShopPlan` + webhook.
5. **PR5 — content.js split:** Panel / scraper / upload modules.

---

## Approval checklist

| Criterion | Status |
|-----------|--------|
| No file crosses 1k without decomposition | ❌ `content.js` at 1101 |
| No duplicated transport fallback paths | ❌ |
| Data normalized at canonical boundary | ❌ pictures |
| No open admin proxy | ❌ |
| Plan/billing single source of truth | ❌ |
| Publish atomic + retryable | ❌ |
| Connect security model consistent | ❌ |
| Behavior correct on happy path | ✅ |

**Do not approve** until blockers are addressed or explicitly waived with a follow-up plan.