# Revora Chrome Extension

Imports Temu product reviews into your Shopify store through the Revora app.

## Install (development)

1. Run the Shopify app: `bun run dev` from the repo root (or `cd revora-frontend && shopify app dev`)
2. In Shopify admin, open Revora and generate a pairing code
3. Open `chrome://extensions`
4. Enable **Developer mode**
5. Click **Load unpacked** and select this `revora-extension/` folder
6. Open the extension popup, paste the pairing code, and click **Sync URL** if the tunnel changed
7. Click **Verify**
8. Open a Temu product page — the Revora panel appears in the bottom-right corner

## Usage

1. Select the Shopify product to attach reviews to
2. Choose a **Review filter** (all, with text, or photos/videos)
3. Optionally set an **Import limit** (latest 100)
4. Click **Import reviews**

The extension opens the reviews panel, switches to Photos/Videos when needed, scrolls automatically, intercepts Temu API responses, and uploads batches to Revora.

If collection fails, manually open the full reviews panel on Temu once, then click **Import reviews** again.