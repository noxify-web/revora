# Revora Chrome Extension

Imports Temu product reviews into your Shopify store through the Revora app.

Built with **WXT**, **TypeScript**, and shared types from `@revora/shared`.

## Install (development)

1. Install dependencies from the repo root:

   ```bash
   bun install
   ```

2. Build or run the extension:

   ```bash
   bun run extension:dev
   ```

   For a production build:

   ```bash
   bun run extension:build
   ```

3. Run the Shopify app:

   ```bash
   bun run dev
   ```

4. In Shopify admin, open Revora and generate a connect code.
5. Open `chrome://extensions`, enable **Developer mode**, and click **Load unpacked**.
6. Select `revora-extension/.output/chrome-mv3` (created by WXT after `dev` or `build`).
7. Open the extension popup:
   - Click **Fill from admin** or paste the 6-character connect code
   - Confirm the synced server URL is shown
   - Click **Connect**
8. Open a Temu product page — the Revora panel appears in the bottom-right corner.

## Usage

1. Search and select the Shopify product to attach reviews to
2. Choose a **Review filter** (all, with text, or photos/videos)
3. Click **Import reviews**

The extension opens the reviews panel, switches to Photos/Videos when needed, scrolls automatically, intercepts Temu API responses, and uploads batches to Revora.

If collection fails, manually open the full reviews panel on Temu once, then click **Import reviews** again.

## Commands

From the repo root:

```bash
bun run extension:dev        # WXT dev server with HMR
bun run extension:build      # Production build
bun run extension:test       # Vitest unit tests
bun run extension:typecheck  # TypeScript check
```

## Architecture

- `entrypoints/background.ts` — API routing and auth
- `entrypoints/admin-bridge.content.ts` — Shopify admin iframe proxy + URL sync
- `entrypoints/temu-inject.content.ts` — MAIN-world Temu API interception
- `entrypoints/temu.content.ts` — Temu panel UI and import orchestration
- `entrypoints/popup.*` — connect flow
- `lib/` — transport, scraper helpers, review mapping
- `packages/revora-shared/` — shared types, schemas, and pairing logic