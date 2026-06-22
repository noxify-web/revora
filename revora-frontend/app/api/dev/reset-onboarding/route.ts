import { NextResponse } from "next/server"

import {
  ONBOARDING_STORAGE_KEYS,
  REVORA_CLIENT_STORAGE_KEYS,
} from "@/lib/onboarding"
import { applyEmbeddedAppHeaders } from "@/lib/shopify/headers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not found", { status: 404 })
  }

  const storageKeys = JSON.stringify([...REVORA_CLIENT_STORAGE_KEYS])
  const flowRestartedKey = ONBOARDING_STORAGE_KEYS.flowRestarted

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Reset Revora onboarding</title>
  </head>
  <body>
    <p>Resetting onboarding…</p>
    <script>
      (function () {
        var keys = ${storageKeys};
        keys.forEach(function (key) {
          window.localStorage.removeItem(key);
        });
        window.localStorage.setItem(${JSON.stringify(flowRestartedKey)}, "true");

        var params = new URLSearchParams(window.location.search);
        params.delete("reset");
        var query = params.toString();
        window.location.replace(
          "/" + (query ? "?" + query : "")
        );
      })();
    </script>
  </body>
</html>`

  const response = new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })

  return applyEmbeddedAppHeaders(response)
}