# Review Summary

Large feature slice: billing tiers, connect-code pairing, admin-proxy extension routing, Shopify metaobject publish pipeline, and theme extension. Architecture is sound and the admin-proxy solves the tunnel-URL problem well. **Verdict: REQUEST CHANGES** — fix security gaps on connect-code exchange and extension proxy path validation, and reconcile billing plan state with Shopify subscriptions before shipping.

# Findings

### [SEVERITY: critical] Connect-code exchange is brute-forceable with no rate limiting
- **File:** `revora-frontend/app/api/extension/connect/exchange/route.ts`
- **Issue:** The exchange endpoint is unauthenticated and accepts 6-character codes (~32^6 combinations). There is no per-IP rate limiting, lockout, or attempt logging.
- **Impact:** An attacker who knows or guesses a valid code within the 10-minute TTL can obtain a long-lived `rvr_*` bearer token for a merchant's store and import/publish reviews.
- **Suggestion:** Add rate limiting (per IP + per code), constant-time comparison, optional shop hint, and lock codes after N failed attempts. Consider longer codes or single-use codes bound to a session nonce displayed in admin.

### [SEVERITY: major] Plaintext extension tokens stored in `ConnectCode` table
- **File:** `revora-frontend/lib/extension/connect.ts:44`, `revora-frontend/src/db/schema.ts:50`
- **Issue:** `pairingToken` is stored in plaintext in `connectCodes` while `extensionTokens` correctly stores only `tokenHash`.
- **Impact:** A database leak exposes active pairing tokens directly; inconsistent security model.
- **Suggestion:** Store only `extensionTokenId` on connect codes and look up via join, or store a hashed exchange secret. Return the raw token only once in the exchange response.

### [SEVERITY: major] Extension admin proxy accepts arbitrary API paths
- **File:** `revora-frontend/components/extension-bridge.tsx:39`
- **Issue:** `ExtensionBridge` fetches any `path` from a parent `postMessage` without an allowlist.
- **Impact:** Any script able to postMessage the embedded iframe (e.g. compromised admin context) could invoke internal routes. Today paths are controlled by `admin-bridge.js`, but the iframe is the trust boundary.
- **Suggestion:** Allowlist paths prefix `/api/extension/`, `/api/products`, `/api/reviews/import` only. Reject others before `fetch`.

### [SEVERITY: major] Billing plan can drift from Shopify subscription state
- **File:** `revora-frontend/lib/shopify/plan-store.ts`, `revora-frontend/app/api/billing/status/route.ts`, `revora-frontend/app/api/extension/plan/route.ts`
- **Issue:** `getShopPlan()` reads only local `ShopPlan` table. `billing/status` reports `hasActiveSubscription` from Shopify but never reconciles or downgrades local plan. No subscription webhook handler exists (`shopify.app.toml` webhooks section is empty).
- **Impact:** Cancelled subscriptions may retain premium (unlimited imports) indefinitely.
- **Suggestion:** On billing status load and extension plan fetch, sync plan from `getBillingStatus()` and downgrade when no active subscription. Add `APP_SUBSCRIPTIONS_UPDATE` webhook.

### [SEVERITY: major] Publish pipeline can leave inconsistent state on partial failure
- **File:** `revora-frontend/lib/shopify/sync-reviews.ts:167-250`
- **Issue:** Reviews are marked `published` individually, then `productUpdate` runs once at the end. If product metafield update fails, some reviews are synced to Shopify but product metafields are not updated.
- **Impact:** Storefront block reads product metafields — published reviews may not appear; DB shows mixed `syncStatus`.
- **Suggestion:** Wrap in transactional semantics: collect all metaobject IDs first, update product metafields, then mark reviews published. Or rollback/retry product update and surface `partial` status in UI with retry.

### [SEVERITY: minor] `ImportsManager` blocks retry after partial publish
- **File:** `revora-frontend/components/imports-manager.tsx:156`
- **Issue:** Publish button disabled when `publishStatus === "published"` only; `partial` status is not handled — button stays enabled but user may not understand state.
- **Impact:** Confusing UX after partial failures; no clear retry path.
- **Suggestion:** Handle `partial` explicitly with "Retry publish" label and show failed count.

### [SEVERITY: minor] New extension token created on every connect-code generation without revoking old ones
- **File:** `revora-frontend/lib/extension/connect.ts:24-37`
- **Issue:** Each "Generate connect code" inserts a new `extensionTokens` row without revoking prior tokens for the shop.
- **Impact:** Token sprawl; old tokens remain valid until manually revoked.
- **Suggestion:** Revoke previous extension tokens for the shop when issuing a new connect code, or cap active tokens per shop.

### [SEVERITY: minor] Import API lacks Zod validation (unlike connect exchange)
- **File:** `revora-frontend/app/api/reviews/import/route.ts:32`
- **Issue:** Body cast with `as ImportBatchRequest` — no runtime schema validation for batch fields, review shape, or `isFinal` semantics.
- **Impact:** Malformed payloads could cause DB errors or unexpected import state.
- **Suggestion:** Add Zod schema consistent with `connect/exchange` route.

### [SEVERITY: minor] Average rating computed from all reviews, not only successfully published
- **File:** `revora-frontend/lib/shopify/sync-reviews.ts:196-202`
- **Issue:** `averageScore` uses `reviews` array before filtering to successfully published subset.
- **Impact:** Product average rating may include failed reviews' scores.
- **Suggestion:** Compute average from reviews where `syncStatus === "published"` after the loop.

### [SEVERITY: minor] `postMessage` uses target origin `*`
- **File:** `revora-frontend/components/connect-extension.tsx`
- **Issue:** Connect code broadcast uses `window.parent.postMessage(..., "*")`.
- **Impact:** In non-standard embed contexts, connect code could leak to an unexpected parent.
- **Suggestion:** Use `https://admin.shopify.com` as target origin when available.

### [SEVERITY: nit] Metaobject `pictures` field format should be verified against Shopify API
- **File:** `revora-frontend/lib/shopify/sync-reviews.ts:59`
- **Issue:** `JSON.stringify(pictureUrls)` passed for `list.single_line_text_field` — format may need to match Shopify's expected JSON array encoding for list fields.
- **Impact:** Pictures may not render on storefront if format is wrong.
- **Suggestion:** Verify with a test publish on dev store; adjust to Shopify's list-field value format if needed.

### [SEVERITY: nit] `theme.js` added but unused in extension
- **File:** `revora-extension/src/theme.js`
- **Issue:** Theme tokens duplicated inline in `content.js`; shared module not imported.
- **Impact:** Drift risk between popup/content theme values.
- **Suggestion:** Import `REVORA_THEME` from `theme.js` in `content.js` or remove unused file.

# Positive Notes

- Admin-proxy architecture (`extension-bridge.tsx` + `admin-bridge.js`) is a strong solution for changing dev tunnel URLs — extension only needs stable `admin.shopify.com` access.
- Server-side plan enforcement in `lib/extension/import.ts` correctly caps free tier at 100 reviews per import.
- Connect codes are single-use with TTL and marked `usedAt` on exchange.
- Extension token auth uses SHA-256 hashes in `extensionTokens`, with `lastUsedAt` tracking.
- `getAppBaseUrl()` now prefers `x-forwarded-host` over static env — fixes wrong localhost URLs behind tunnel.
- Theme extension structure completed with `locales/` and valid `enabled_on` schema.
- `middleware.ts` → `proxy.ts` migration aligns with Next.js 16 conventions.
- Publish pipeline creates app-owned metaobjects and updates product metafields — completes the end-to-end story.

# Test Gaps

- Connect flow: generate code → Connect from admin → verify on Temu page (with admin tab open and closed).
- Connect-code brute force / expiry / reuse rejection.
- Free plan: import >100 reviews — confirm server truncates and extension shows limit message.
- Premium upgrade → confirm unlimited imports; cancel subscription → confirm downgrade (currently expected to fail).
- Publish 0, partial, and full imports; verify theme block renders on product page.
- Tunnel restart during active extension session — confirm admin proxy still works with admin tab open.
- `shopify app build` / theme check passes (verified once; re-run after fixes).