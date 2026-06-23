import { randomUUID } from "node:crypto";
import { REVORA_LOGO_ASSETS } from "@revora/shared/constants";
import { getRevoraConnectPageStyles, REVORA_THEME } from "@revora/shared/theme";
import { getAppBaseUrl } from "@/lib/extension/app-url";
import {
  generateExtensionToken,
  revokeShopExtensionTokens,
} from "@/lib/extension/auth";
import { REVORA_PLAN } from "@/lib/plans";
import { db } from "@/src/db";
import { extensionTokens } from "@/src/db/schema";

export const EXTENSION_REDIRECT_COOKIE = "revora_extension_redirect";

export interface ExtensionBrowserConnectPayload {
  apiUrl: string;
  plan: string;
  planName: string;
  reviewLimit: number | null;
  shop: string;
  token: string;
}

export function isValidExtensionRedirectUri(uri: string) {
  try {
    const parsed = new URL(uri);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.endsWith(".chromiumapp.org")
    );
  } catch {
    return false;
  }
}

export function normalizeShopDomain(shop: string) {
  const trimmed = shop.trim().toLowerCase();

  if (!trimmed) {
    return null;
  }

  if (trimmed.endsWith(".myshopify.com")) {
    return trimmed;
  }

  return `${trimmed.replace(/\.myshopify\.com$/, "")}.myshopify.com`;
}

export async function mintExtensionTokenForShop(
  shop: string,
  request?: Request
): Promise<ExtensionBrowserConnectPayload> {
  await revokeShopExtensionTokens(shop);

  const { token, tokenHash } = generateExtensionToken();
  const now = new Date().toISOString();
  const apiUrl = await getAppBaseUrl(request);

  await db.insert(extensionTokens).values({
    id: randomUUID(),
    shop,
    tokenHash,
    label: "Chrome extension",
    createdAt: now,
  });

  return {
    token,
    apiUrl,
    shop,
    plan: REVORA_PLAN.id,
    planName: REVORA_PLAN.name,
    reviewLimit: REVORA_PLAN.reviewLimitPerImport,
  };
}

export function buildExtensionErrorRedirectUrl(
  redirectUri: string,
  error: string
) {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  return url.toString();
}

export function buildExtensionRedirectUrl(
  redirectUri: string,
  payload: ExtensionBrowserConnectPayload
) {
  const url = new URL(redirectUri);

  url.searchParams.set("token", payload.token);
  url.searchParams.set("api_url", payload.apiUrl);
  url.searchParams.set("shop", payload.shop);
  return url.toString();
}

export function renderShopPromptHtml({
  redirectUri,
  error,
}: {
  redirectUri: string;
  error?: string | null;
}) {
  const safeRedirectUri = redirectUri
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
  const errorBlock = error
    ? `<p style="color:${REVORA_THEME.textCritical};margin:0 0 12px">${error.replace(/</g, "&lt;")}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Connect Revora Extension</title>
    <link rel="icon" href="${REVORA_LOGO_ASSETS.ico}" type="image/x-icon" />
    <style>${getRevoraConnectPageStyles()}</style>
  </head>
  <body>
    <main>
      <header class="connect-brand">
        <img src="${REVORA_LOGO_ASSETS.svg}" alt="" width="40" height="40" decoding="async" />
        <div class="connect-brand-copy">
          <h1>Connect Revora extension</h1>
          <p>Sign in with your Shopify store to link the Revora Chrome extension.</p>
        </div>
      </header>
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
</html>`;
}
