# Revora

Bun workspace monorepo: Temu review scrape (Chrome extension) → Revora APIs (Next.js Shopify app) → Shopify metaobjects/metafields for storefront.

## Layout

- `revora-frontend/` — Next.js 16 embedded Shopify app (`app/` routes, `lib/`, `components/`). Turso + Drizzle (`src/db/`). Config: `shopify.app.toml`, `drizzle.config.ts`.
- `revora-extension/` — WXT MV3 extension (`entrypoints/`, `lib/`, `tests/`). Build output: `.output/chrome-mv3`.
- `packages/revora-shared/` — `@revora/shared`: Zod schemas, extension message types, pairing-code, constants. **Contract layer** for frontend ↔ extension.
- `revora-backend/` — not present in repo (ignore).

## Commands

Use **Bun** (`packageManager`: `bun@1.3.14`). Install from repo root so workspaces link `@revora/shared`.

```bash
bun install

# Shopify app (preferred local dev)
bun run dev                    # → revora-frontend dev:stable (ngrok + shopify app dev)

# Extension
bun run extension:dev          # WXT HMR; run postinstall wxt prepare on fresh clone
bun run extension:build
bun run extension:test         # Vitest: revora-extension/tests/*.test.ts
bun run extension:typecheck

# Frontend only (from revora-frontend/)
bun run lint
bun run typecheck
bun run build
bun run db:generate | db:migrate | db:push | db:studio
```

No root script for frontend lint/typecheck — run them inside `revora-frontend/`. Frontend has **no** automated test suite in `package.json`.

After code changes, verify at minimum: `revora-frontend` → `bun run lint && bun run typecheck`; extension API/shared changes → `bun run extension:test && bun run extension:typecheck`.

## Local Shopify dev (stable tunnel)

`bun run dev` uses `revora-frontend/scripts/dev-stable.sh`. Requires `revora-frontend/.env.local`:

- `STABLE_TUNNEL_URL` (public HTTPS base, no trailing path)
- `STABLE_TUNNEL_PORT` (default `3000`)
- ngrok (or equivalent) must be running on that port **before** starting dev

Script runs `shopify app dev --tunnel-url="${STABLE_TUNNEL_URL}:${STABLE_TUNNEL_PORT}"`. `shopify.app.toml` pins example ngrok host; `automatically_update_urls_on_dev = true` updates dev URLs — still **do not hardcode** tunnel URLs in extension or shared code; use env / admin pairing.

Plain `shopify app dev` (ephemeral Cloudflare tunnel) is possible via `cd revora-frontend && shopify app dev` but breaks extension pairing unless URLs stay consistent — prefer `dev:stable`.

## Environment (`revora-frontend/.env.local`)

Loaded by Next and `drizzle.config.ts` (via dotenv). Required for real runs:

- `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL` (or `HOST`)
- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`

Never commit `.env.local`, Turso tokens, Shopify secrets, or HTTP capture dumps (`get.txt`, etc.).

## When changing extension APIs or payloads

1. Update `packages/revora-shared/` (schemas, messages, types).
2. Update `revora-frontend/app/api/extension/**` and `lib/extension/**` (many files re-export shared modules).
3. Update `revora-extension/entrypoints/background.ts` and related `lib/` / content scripts.
4. Run `extension:test` and both packages' typecheck.

Pairing: admin **Connect extension** (`components/extension-bridge.tsx` + `admin-bridge.content.ts` session-token broadcast), or popup `chrome.identity.launchWebAuthFlow` → `/api/extension/connect/browser`.

## Product data model (Shopify)

Defined in `shopify.app.toml`: metaobject `revora_review`, product metafields `revora_reviews`, counts/ratings/JSON. Publishing logic lives in `revora-frontend/lib/shopify/` and `lib/reviews/`. App proxy: `/apps/revora`.

## UI stack note

Admin UI uses Shopify **Polaris web components** (`s-*` tags) in components, not the React Polaris npm package — match existing patterns in `components/`.

## Extension load

Chrome → Load unpacked → `revora-extension/.output/chrome-mv3` (after `extension:dev` or `extension:build`).