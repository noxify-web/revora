import type { AdminBridgeRequest } from "@revora/shared/extension-messages"

const SHOPIFY_ADMIN_URL = "https://admin.shopify.com/*"
const ADMIN_BRIDGE_SCRIPT = "content-scripts/admin-bridge.js"

export async function queryShopifyAdminTabs() {
  return chrome.tabs.query({ url: SHOPIFY_ADMIN_URL })
}

async function ensureAdminBridgeOnTab(tabId: number) {
  try {
    const pong = await chrome.tabs.sendMessage(tabId, {
      type: "REVORA_PING",
    } satisfies AdminBridgeRequest)

    if (pong?.ok) {
      return true
    }
  } catch {
    // Content script not ready yet.
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [ADMIN_BRIDGE_SCRIPT],
    })
    await new Promise((resolve) => setTimeout(resolve, 150))

    const pong = await chrome.tabs.sendMessage(tabId, {
      type: "REVORA_PING",
    } satisfies AdminBridgeRequest)

    return Boolean(pong?.ok)
  } catch {
    return false
  }
}

export async function sendAdminBridgeMessage<T>(
  message: AdminBridgeRequest,
): Promise<T | null> {
  const tabs = await queryShopifyAdminTabs()

  for (const tab of tabs) {
    if (!tab.id) {
      continue
    }

    const ready = await ensureAdminBridgeOnTab(tab.id)
    if (!ready) {
      continue
    }

    try {
      const response = await chrome.tabs.sendMessage(tab.id, message)
      if (response != null) {
        return response as T
      }
    } catch {
      // Content script not available on this tab yet.
    }
  }

  return null
}

export async function readApiBaseUrlFromAdmin(): Promise<string | null> {
  const response = await sendAdminBridgeMessage<{ apiBaseUrl: string | null }>({
    type: "REVORA_GET_API_URL",
  })

  return response?.apiBaseUrl?.replace(/\/$/, "") || null
}

export async function readConnectTokenFromAdmin(): Promise<{
  token: string | null
  apiUrl: string | null
  shop: string | null
  plan: string | null
  planName: string | null
  reviewLimit: number | null
} | null> {
  const response = await sendAdminBridgeMessage<{
    token: string | null
    apiUrl: string | null
    shop: string | null
    plan: string | null
    planName: string | null
    reviewLimit: number | null
  }>({
    type: "REVORA_GET_CONNECT_TOKEN",
  })

  return response
}