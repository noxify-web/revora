import { REVORA_CLIENT_ID } from "./constants"

export function getShopSlug(shop: string) {
  return shop.replace(/\.myshopify\.com$/i, "")
}

/**
 * Deep link to the embedded Revora app in Shopify admin.
 * Uses the app client ID so it works regardless of handle suffix (revora vs revora-1).
 */
export function getRevoraAdminAppUrl(shop: string) {
  return `https://admin.shopify.com/store/${getShopSlug(shop)}/apps/${REVORA_CLIENT_ID}`
}