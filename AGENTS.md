# Revora

Monorepo for importing Temu product reviews into Shopify.

## Layout

- `revora-frontend/` — Next.js 16 Shopify embedded app (OAuth, APIs, Turso/Drizzle, shadcn/ui admin)
- `revora-extension/` — Chrome MV3 extension (Temu scrape + upload to Revora APIs)
- `revora-backend/` — placeholder only; no code yet

## Commands

Use **Bun**, not npm:

```bash
cd revora-frontend && bun install
bun run dev          # from repo root
cd revora-frontend && shopify app dev
```

## Secrets

Never commit `.env.local`, Turso tokens, Shopify API secrets, or HTTP capture files (`get.txt`, etc.).

## When changing APIs

Update **both** `revora-frontend` extension routes and `revora-extension/src/background.js` together. Pairing logic lives in `lib/extension/pairing-code.ts` (server) and `src/pairing.js` (extension) — keep in sync.

## Dev tunnel URLs

`shopify app dev` uses a changing Cloudflare URL. Extension pairing uses token + separate server URL with auto-sync from Shopify admin (`admin-bridge.js`). Do not hardcode tunnel URLs.