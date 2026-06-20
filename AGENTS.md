# Revora

Monorepo for importing Temu product reviews into Shopify.

## Layout

- `revora-frontend/` — Next.js 16 Shopify embedded app (OAuth, APIs, Turso/Drizzle, shadcn/ui admin)
- `revora-extension/` — Chrome MV3 extension (Temu scrape + upload to Revora APIs)
- `revora-backend/` — placeholder only; no code yet

## Commands

Use **Bun**, not npm:

```bash
bun install                              # from repo root (workspaces)
bun run dev                              # Shopify app (stable tunnel)
bun run extension:dev                    # WXT extension dev + HMR
bun run extension:build                  # extension production build
cd revora-frontend && shopify app dev
```

Load unpacked extension from `revora-extension/.output/chrome-mv3` after `extension:dev` or `extension:build`.

## Secrets

Never commit `.env.local`, Turso tokens, Shopify API secrets, or HTTP capture files (`get.txt`, etc.).

## When changing APIs

Update **both** `revora-frontend` extension routes and `revora-extension/entrypoints/background.ts` together. Shared pairing logic, schemas, and message types live in `packages/revora-shared/` — keep frontend and extension in sync through that package.

## Dev tunnel URLs

`shopify app dev` uses a changing Cloudflare URL. Extension pairing uses token + separate server URL with auto-sync from Shopify admin (`admin-bridge.js`). Do not hardcode tunnel URLs.