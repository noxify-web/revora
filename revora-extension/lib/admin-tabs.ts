import type { AdminBridgeRequest } from "@revora/shared/extension-messages"
import type { ConnectTokenResponse } from "@revora/shared/extension-types"

const SHOPIFY_ADMIN_URL = "https://admin.shopify.com/*"
const PING_RETRY_MS = 200
const PING_MAX_ATTEMPTS = 8

export type AdminConnectPayload = {
  token: string | null
  apiUrl: string | null
  shop: string | null
  plan: string | null
  planName: string | null
  reviewLimit: number | null
}

type AdminProxyBridgeResponse = {
  ok?: boolean
  data?: ConnectTokenResponse
  error?: string
  unavailable?: boolean
}

export async function queryShopifyAdminTabs() {
  return chrome.tabs.query({ url: SHOPIFY_ADMIN_URL })
}

async function pingAdminBridge(tabId: number) {
  try {
    const pong = await chrome.tabs.sendMessage(tabId, {
      type: "REVORA_PING",
    } satisfies AdminBridgeRequest)

    return Boolean(pong?.ok)
  } catch {
    return false
  }
}

async function waitForAdminBridge(tabId: number) {
  for (let attempt = 0; attempt < PING_MAX_ATTEMPTS; attempt += 1) {
    if (await pingAdminBridge(tabId)) {
      return true
    }

    await new Promise((resolve) => setTimeout(resolve, PING_RETRY_MS))
  }

  return false
}

function isRevoraTabResponse(message: AdminBridgeRequest, response: unknown) {
  if (!response || typeof response !== "object") {
    return false
  }

  if (message.type === "REVORA_GET_API_URL") {
    return Boolean(
      (response as { apiBaseUrl?: string | null }).apiBaseUrl?.trim(),
    )
  }

  if (message.type === "REVORA_GET_CONNECT_TOKEN") {
    const payload = response as AdminConnectPayload
    return Boolean(payload.token || payload.apiUrl)
  }

  if (message.type === "REVORA_ADMIN_PROXY") {
    const payload = response as AdminProxyBridgeResponse
    if (payload.unavailable) {
      return false
    }

    return payload.ok === true
  }

  return true
}

export async function sendAdminBridgeMessage<T>(
  message: AdminBridgeRequest,
): Promise<T | null> {
  const tabs = await queryShopifyAdminTabs()

  for (const tab of tabs) {
    if (!tab.id) {
      continue
    }

    const ready = await waitForAdminBridge(tab.id)
    if (!ready) {
      continue
    }

    try {
      const response = await chrome.tabs.sendMessage(tab.id, message)
      if (response != null && isRevoraTabResponse(message, response)) {
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

export async function readConnectTokenFromAdmin(): Promise<AdminConnectPayload | null> {
  return sendAdminBridgeMessage<AdminConnectPayload>({
    type: "REVORA_GET_CONNECT_TOKEN",
  })
}

export async function createConnectTokenFromAdmin(): Promise<ConnectTokenResponse | null> {
  const response = await sendAdminBridgeMessage<AdminProxyBridgeResponse>({
    type: "REVORA_ADMIN_PROXY",
    path: "/api/extension/token",
    method: "POST",
    body: { label: "Chrome extension" },
  })

  if (!response?.ok || !response.data?.token) {
    return null
  }

  return response.data
}

export async function resolveConnectPayloadFromAdmin(): Promise<AdminConnectPayload | null> {
  const existing = await readConnectTokenFromAdmin()

  if (existing?.token && existing.apiUrl && existing.shop) {
    return existing
  }

  const created = await createConnectTokenFromAdmin()
  if (!created?.token || !created.apiUrl || !created.shop) {
    return null
  }

  return {
    token: created.token,
    apiUrl: created.apiUrl,
    shop: created.shop,
    plan: created.plan ?? null,
    planName: created.planName ?? null,
    reviewLimit: created.reviewLimit ?? null,
  }
}