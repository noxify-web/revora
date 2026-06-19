# Revora Chrome Extension

Imports Temu product reviews into your Shopify store through the Revora app.

## Install (development)

1. Run the Shopify app: `cd revora-frontend && shopify app dev`
2. In Shopify admin, open Revora and generate a pairing token
3. Open `chrome://extensions`
4. Enable **Developer mode**
5. Click **Load unpacked** and select this `revora-extension/` folder
6. Open the extension popup and paste:
   - **API URL** — the tunnel URL from `shopify app dev` (e.g. `https://....trycloudflare.com`)
   - **Pairing token** — from the Revora admin page
7. Click **Verify**
8. Open a Temu product page — the Revora panel appears in the bottom-right corner

## Usage

1. Select the Shopify product to attach reviews to
2. Choose **Import all reviews** or **Import latest 100**
3. Click **Import reviews**
4. The extension opens the reviews panel, scrolls automatically, intercepts Temu API responses, and uploads batches to Revora

If collection fails, manually open the full reviews panel on Temu once, then click **Import reviews** again.