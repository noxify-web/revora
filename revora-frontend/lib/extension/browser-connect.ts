import { randomUUID } from "crypto"

import {
  generateExtensionToken,
  revokeShopExtensionTokens,
} from "@/lib/extension/auth"
import { getAppBaseUrl } from "@/lib/extension/app-url"
import { resolveShopPlan } from "@/lib/shopify/resolve-plan"
import { db } from "@/src/db"
import { extensionTokens } from "@/src/db/schema"

export const EXTENSION_REDIRECT_COOKIE = "revora_extension_redirect"

export type ExtensionBrowserConnectPayload = {
  token: string
  apiUrl: string
  shop: string
  plan: string
  planName: string
  reviewLimit: number | null
}

export function isValidExtensionRedirectUri(uri: string) {
  try {
    const parsed = new URL(uri)
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.endsWith(".chromiumapp.org")
    )
  } catch {
    return false
  }
}

export function normalizeShopDomain(shop: string) {
  const trimmed = shop.trim().toLowerCase()

  if (!trimmed) {
    return null
  }

  if (trimmed.endsWith(".myshopify.com")) {
    return trimmed
  }

  return `${trimmed.replace(/\.myshopify\.com$/, "")}.myshopify.com`
}

export async function mintExtensionTokenForShop(
  shop: string,
  request?: Request
): Promise<ExtensionBrowserConnectPayload> {
  await revokeShopExtensionTokens(shop)

  const { token, tokenHash } = generateExtensionToken()
  const now = new Date().toISOString()
  const resolved = await resolveShopPlan(shop)
  const apiUrl = await getAppBaseUrl(request)

  await db.insert(extensionTokens).values({
    id: randomUUID(),
    shop,
    tokenHash,
    label: "Chrome extension",
    createdAt: now,
  })

  return {
    token,
    apiUrl,
    shop,
    plan: resolved.plan,
    planName: resolved.planName,
    reviewLimit: resolved.reviewLimit,
  }
}

export function buildExtensionErrorRedirectUrl(
  redirectUri: string,
  error: string
) {
  const url = new URL(redirectUri)
  url.searchParams.set("error", error)
  return url.toString()
}

export function buildExtensionRedirectUrl(
  redirectUri: string,
  payload: ExtensionBrowserConnectPayload
) {
  const url = new URL(redirectUri)

  url.searchParams.set("token", payload.token)
  url.searchParams.set("api_url", payload.apiUrl)
  url.searchParams.set("shop", payload.shop)
  url.searchParams.set("plan", payload.plan)
  url.searchParams.set("plan_name", payload.planName)

  if (payload.reviewLimit != null) {
    url.searchParams.set("review_limit", String(payload.reviewLimit))
  }

  return url.toString()
}

export function renderShopPromptHtml({
  redirectUri,
  error,
}: {
  redirectUri: string
  error?: string | null
}) {
  const safeRedirectUri = redirectUri
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
  const errorBlock = error
    ? `<p style="color:#d9480f;margin:0 0 12px">${error.replace(/</g, "&lt;")}</p>`
    : ""

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Connect Revora Extension</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #fff4eb;
        color: #1a1a1a;
      }
      main {
        width: min(420px, calc(100vw - 32px));
        padding: 28px;
        border-radius: 16px;
        background: #fff;
        border: 1px solid #f0e4d8;
        box-shadow: 0 12px 40px rgba(251, 119, 1, 0.08);
      }
      h1 {
        margin: 0 0 8px;
        font-size: 22px;
      }
      p {
        margin: 0 0 16px;
        color: #5c5c5c;
        line-height: 1.5;
      }
      label {
        display: block;
        margin-bottom: 8px;
        font-size: 13px;
        font-weight: 600;
      }
      input {
        width: 100%;
        box-sizing: border-box;
        padding: 12px 14px;
        border-radius: 10px;
        border: 1px solid #e8dfd4;
        font-size: 14px;
      }
      button {
        width: 100%;
        margin-top: 14px;
        padding: 12px 14px;
        border: 0;
        border-radius: 10px;
        background: #fb7701;
        color: #fff;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Connect Revora extension</h1>
      <p>Sign in with your Shopify store to link the Revora Chrome extension.</p>
      ${errorBlock}
      <form method="GET" action="/api/extension/connect/browser">
        <input type="hidden" name="redirect_uri" value="${safeRedirectUri}" />
        <label for="shop">Store domain</label>
        <input
          id="shop"
          name="shop"
          type="text"
          placeholder="your-store.myshopify.com"
          required
          autocomplete="off"
          spellcheck="false"
        />
        <button type="submit">Continue with Shopify</button>
      </form>
    </main>
  </body>
</html>`
}