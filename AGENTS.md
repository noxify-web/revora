# Revora

Bun workspace monorepo: Temu review scrape (Chrome extension) → Revora APIs (Next.js Shopify app) → Shopify metaobjects/metafields for storefront.

## Layout

- `revora-frontend/` — Next.js 16 embedded Shopify app (`app/` routes, `lib/`, `components/`). Turso + Drizzle (`src/db/`). Config: `shopify.app.toml`, `drizzle.config.ts`. Theme app extension lives at `revora-frontend/extensions/revora-reviews/` (root-level `extensions/` is empty).
- `revora-extension/` — WXT MV3 extension (`entrypoints/`, `lib/`, `tests/`). Build output: `.output/chrome-mv3`.
- `packages/revora-shared/` — `@revora/shared`: Zod schemas, extension message types, storage-key/TTL constants. **Contract layer** for frontend ↔ extension.
- `revora-backend/` — not present in repo (ignore).
- `.cursor/rules/*.mdc` — **stale** (describe pre-WXT plain ES modules and "shadcn/ui"). Trust `package.json`/WXT config and this file instead.

## Commands

Use **Bun** (`packageManager`: `bun@1.3.14`). Install from repo root so workspaces link `@revora/shared`.

```bash
bun install

# Shopify app (preferred local dev)
bun run dev                    # → revora-frontend dev:stable (ngrok + shopify app dev)

# Extension — WXT dev server runs on :3001, separate from Next on :3000
bun run extension:dev          # WXT HMR; postinstall runs `wxt prepare` on fresh clone
bun run extension:build
bun run extension:test         # Vitest: revora-extension/tests/*.test.ts
bun run extension:typecheck

# Shared package tests
bun run shared:test

# Frontend only (from revora-frontend/)
bun run test                   # Vitest (node env); tests live in **/__tests__/*.test.ts
bun run typecheck
bun run build                  # runs build:widget THEN next build (see Build notes)
bun run db:generate | db:migrate | db:push | db:studio
bun run db:migrate-local       # one-off sqlite → Turso
bun run db:reset               # wipe/seed dev data

# Lint + format (Ultracite + Biome, whole monorepo)
bun run check                  # lint without writes
bun run fix                    # lint + format with safe auto-fixes
```

Run a single test via path filter, e.g. `cd revora-frontend && bun run test lib/reviews/__tests__/storefront.test.ts` (same pattern works in extension/shared).

Lint/format config lives at the repo root (`biome.jsonc`, `ultracite`). `revora-frontend` also exposes `lint`/`format` scripts that delegate to the root checker.

After code changes, verify at minimum: `bun run check && cd revora-frontend && bun run typecheck && bun run test`; extension/shared API changes → add `bun run extension:test && bun run extension:typecheck && bun run shared:test`.

## Build notes (non-obvious)

- `build:widget` compiles `revora-frontend/lib/storefront/revora-widget.ts` → `extensions/revora-reviews/assets/revora-widget.js` (IIFE, browser target) **before** `next build`. That generated file has lint/format **disabled** in `biome.jsonc` — don't hand-edit it.
- Import alias `@/*` → `revora-frontend/` root (tsconfig `paths`, mirrored in `vitest.config.ts`). A few `@revora/shared/*` subpaths (`theme`, `constants`, `theme-storefront`) are also aliased there.
- `@revora/shared` is consumed via **subpath exports** (`/extension-types`, `/extension-messages`, `/extension-schemas`, `/constants`, `/shopify-admin`, `/theme`, `/theme-storefront`), not just the barrel. Check `packages/revora-shared/package.json` `exports` before adding a new one. (The legacy `/pairing-code` and `/bridge-dom` subpaths were removed — no `REVORA1.` pairing-code format and no DOM-dataset token channel anymore.)

## Local Shopify dev (stable tunnel)

`bun run dev` uses `revora-frontend/scripts/dev-stable.sh`. Requires `revora-frontend/.env.local`:

- `STABLE_TUNNEL_URL` (public HTTPS base, no trailing path)
- `STABLE_TUNNEL_PORT` (default `3000`)
- ngrok (or equivalent) must be running on that port **before** starting dev

Script runs `shopify app dev --tunnel-url="${STABLE_TUNNEL_URL}:${STABLE_TUNNEL_PORT}"`. `shopify.app.toml` pins an example ngrok host; `automatically_update_urls_on_dev = true` updates dev URLs — still **do not hardcode** tunnel URLs in extension or shared code; use env / admin pairing.

Plain `shopify app dev` (ephemeral Cloudflare tunnel) is possible via `cd revora-frontend && shopify app dev` but breaks extension pairing unless URLs stay consistent — prefer `dev:stable`.

## Environment (`revora-frontend/.env.local`)

Loaded by Next and `drizzle.config.ts` (via dotenv). `drizzle.config.ts` **throws** if `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` are missing. Required for real runs:

- `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL` (or `HOST`)
- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`

Never commit `.env.local`, Turso tokens, Shopify secrets, or HTTP capture dumps (`get.txt`, `next.txt`, `responce.txt` — all gitignored).

## When changing extension APIs or payloads

1. Update `packages/revora-shared/` (schemas, messages, types).
2. Update `revora-frontend/app/api/extension/**` and `lib/extension/**` (many files re-export shared modules).
3. Update `revora-extension/entrypoints/background.ts` and related `lib/` / content scripts.
4. Run `extension:test`, `shared:test`, and both packages' typecheck.

Extension entrypoints: `background.ts` (API/auth, local status cache, pairing-confirmed broadcast), `admin-bridge.content.ts` (token receive from admin iframe + pairing-confirmed forwarding), `app-bridge.content.ts` (same-origin token receive + pairing-confirmed forwarding, dev tunnels only), `temu-inject.content.ts` (MAIN-world Temu API intercept), `temu.content.ts` (panel + import orchestration), `popup/`.

## Extension ↔ app connection (single path, event-based)

One connect path: the admin app mints a bearer token (`rvr_<64 hex>`, stored server-side as SHA-256) via `POST /api/extension/token` (Shopify-session-gated), then `components/extension-bridge.tsx` broadcasts `REVORA_CONNECT_TOKEN` to the extension via **pinned-origin** `postMessage` (same-origin for `app-bridge`, `https://admin.shopify.com` for `admin-bridge` — never `*`, never DOM dataset). The content script relays `REVORA_CONNECT_DIRECT` to the background, which calls `/api/extension/verify` (direct fetch, host permission granted at connect) and on success broadcasts `REVORA_PAIRING_CONFIRMED` back to the app — **zero polling**. The app's `waitForPairingConfirmedMessage` resolves its pairing promise on receipt.

- Bearer tokens have a **90-day rolling expiry** (`TOKEN_TTL_MS`), refreshed on each `/verify`; `pairedAt` is set on first verify (the explicit "paired" signal, replacing the old `lastUsedAt` heuristic).
- `REVORA_GET_CONNECTION_STATUS` reads local `chrome.storage.sync` state and only hits `/verify` when stale (`STALE_THRESHOLD_MS` = 7 days) — not on every popup open.
- Transport is **direct-fetch-only** (`fetchRevora` in `lib/api-transport.ts`); the old admin-iframe proxy fallback was removed. On network failure the popup shows "Cannot reach Revora — re-connect."
- CORS is pinned to `REVORA_EXTENSION_ID` (env) in prod; any `chrome-extension://` in dev. Rate limits apply to `/verify`, `/token`, `/plan`, `/disconnect`, `/health`.
- Storage keys (`apiBaseUrl`, `pairingToken`, `shop`, `userDisconnected`, `lastVerifiedAt`) are the `STORAGE_KEYS` constant in `packages/revora-shared/src/constants.ts` — both sides share it.
- The browser-OAuth path (`chrome.identity.launchWebAuthFlow` → `/api/extension/connect/*`) and the `REVORA1.` pairing-code format were removed entirely.

## Product data model (Shopify)

Defined in `shopify.app.toml`: metaobject `revora_review`, product metafields `revora_reviews` (list.metaobject_reference), `revora_review_count`, `revora_average_rating`, `revora_reviews_json`. Publishing logic lives in `revora-frontend/lib/shopify/` and `lib/reviews/`. App proxy: `/apps/revora`.

## UI stack note

Admin UI uses Shopify **Polaris web components** (`s-*` tags: `s-page`, `s-stack`, `s-button`, `s-modal`, …) in `components/` — **not** the React Polaris npm package and **not** shadcn/ui (shadcn is only a leftover template scaffold; the `README.md` still mentions it but the real UI is `s-*`). Match existing `s-*` patterns.

## Extension load

Chrome → `chrome://extensions` → enable Developer mode → Load unpacked → `revora-extension/.output/chrome-mv3` (after `extension:dev` or `extension:build`). Reload here after code changes.
