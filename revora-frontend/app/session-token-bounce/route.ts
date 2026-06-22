import { NextResponse } from "next/server";

import { APP_NAV_HTML } from "@/lib/shopify/app-nav-html";
import { applyEmbeddedAppHeaders } from "@/lib/shopify/headers";

export function GET() {
  const apiKey = process.env.SHOPIFY_API_KEY || "";
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="shopify-api-key" content="${apiKey}" />
    <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
    <script src="https://cdn.shopify.com/shopifycloud/polaris.js"></script>
  </head>
  <body>
    ${APP_NAV_HTML}
    <p>Connecting to Shopify...</p>
    <script>
      (async () => {
        const params = new URLSearchParams(window.location.search)
        const reloadPath = params.get("shopify-reload")

        if (!reloadPath) {
          document.body.textContent = "Missing shopify-reload parameter."
          return
        }

        try {
          const token = await shopify.idToken()
          const reloadUrl = new URL(reloadPath, window.location.origin)
          reloadUrl.searchParams.set("id_token", token)
          window.location.replace(reloadUrl.pathname + reloadUrl.search)
        } catch (error) {
          document.body.textContent =
            "Failed to authenticate with Shopify. Close this app and open it again from Shopify admin."
          console.error("Revora session token bounce failed", error)
        }
      })()
    </script>
  </body>
</html>`;

  const response = new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });

  return applyEmbeddedAppHeaders(response);
}
