import "@shopify/shopify-api/adapters/web-api"
import { ApiVersion, shopifyApi, type Shopify } from "@shopify/shopify-api"

import { sessionStorage } from "./session-storage"

function getHostSettings() {
  // Prefer HOST from Shopify CLI during `shopify app dev` (tunnel URL).
  const appUrl =
    process.env.HOST?.trim() ||
    process.env.SHOPIFY_APP_URL?.trim() ||
    "http://localhost:3000"
  const parsed = new URL(appUrl)

  return {
    appUrl,
    hostName: parsed.hostname,
    hostScheme: parsed.protocol.replace(":", "") as "http" | "https",
  }
}

let shopifyClient: Shopify | null = null

export function getShopify() {
  if (!shopifyClient) {
    const { appUrl, hostName, hostScheme } = getHostSettings()
    const apiKey = process.env.SHOPIFY_API_KEY

    if (!apiKey) {
      throw new Error(
        "Missing SHOPIFY_API_KEY. Add your Revora Client ID to .env.local."
      )
    }

    shopifyClient = shopifyApi({
      apiKey,
      apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
      scopes: (
        process.env.SCOPES ||
        "read_products,write_products,read_metaobject_definitions,write_metaobject_definitions,read_metaobjects,write_metaobjects,read_themes"
      ).split(","),
      hostName,
      hostScheme,
      apiVersion: ApiVersion.January25,
      isEmbeddedApp: true,
      appUrl,
    })
  }

  return shopifyClient
}

export { sessionStorage }
