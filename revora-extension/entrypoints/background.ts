import type {
  BackgroundRequest,
  BackgroundResponse,
} from "@revora/shared/extension-messages"
import type { ConnectTokenResponse } from "@revora/shared/extension-types"
import { connectViaBrowser } from "../lib/connect-browser"
import {
  enrichConnection,
  fetchRevora,
  persistApiBaseUrl,
  readConnectionState,
  verifyAndPersistConnection,
} from "../lib/api-transport"
import { mapTemuReview } from "../lib/review-mapper"

const SHOPIFY_ADMIN_TAB_URL = "https://admin.shopify.com/*"

async function refreshShopifyAdminTabs() {
  const tabs = await chrome.tabs.query({ url: SHOPIFY_ADMIN_TAB_URL })

  for (const tab of tabs) {
    if (!tab.id) {
      continue
    }

    try {
      await chrome.tabs.reload(tab.id)
    } catch {
      // Tab may have closed before reload.
    }
  }
}

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install" || details.reason === "update") {
      void refreshShopifyAdminTabs()
    }
  })

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    void handleMessage(message as BackgroundRequest)
      .then((response) => sendResponse(response))
      .catch((error: unknown) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Request failed",
        } satisfies BackgroundResponse),
      )

    return true
  })
})

async function handleMessage(
  message: BackgroundRequest,
): Promise<BackgroundResponse> {
  if (message.type === "REVORA_SET_API_URL") {
    const apiBaseUrl = await persistApiBaseUrl(message.apiBaseUrl, {
      requestPermission: false,
    })
    return { ok: true, apiBaseUrl }
  }

  if (message.type === "REVORA_CONNECT_DIRECT") {
    const data: ConnectTokenResponse = {
      token: message.token,
      apiUrl: message.apiUrl,
      shop: message.shop,
      plan: "free",
      planName: "Free",
      reviewLimit: null,
    }

    await persistApiBaseUrl(data.apiUrl, { requestPermission: false })
    await verifyAndPersistConnection(data)
    return { ok: true, data }
  }

  if (message.type === "REVORA_CONNECT_BROWSER") {
    await persistApiBaseUrl(message.apiBaseUrl, { requestPermission: true })
    const data = await connectViaBrowser(message.apiBaseUrl)
    await verifyAndPersistConnection(data)
    return { ok: true, data }
  }

  if (message.type === "REVORA_GET_PLAN") {
    const stored = await readConnectionState()
    const data = await fetchRevora("/api/extension/plan")
    return {
      ok: true,
      data: enrichConnection(data as Record<string, unknown>, stored),
    }
  }

  if (message.type === "REVORA_VERIFY") {
    const stored = await readConnectionState()

    if (!stored.pairingToken) {
      throw new Error("Connect the extension from the popup first.")
    }

    const data = await fetchRevora("/api/extension/verify")
    return {
      ok: true,
      data: enrichConnection(data as Record<string, unknown>, stored),
    }
  }

  if (message.type === "REVORA_GET_PRODUCTS") {
    const search = message.search
      ? `?search=${encodeURIComponent(message.search)}`
      : ""

    const data = await fetchRevora(`/api/products${search}`)
    return { ok: true, data }
  }

  if (message.type === "REVORA_UPLOAD_BATCH") {
    const reviews = (message.reviews || []).map(mapTemuReview)

    const data = await fetchRevora("/api/reviews/import", {
      method: "POST",
      body: {
        importId: message.importId || undefined,
        temuGoodsId: message.temuGoodsId,
        temuProductUrl: message.temuProductUrl,
        temuProductTitle: message.temuProductTitle,
        shopifyProductId: message.shopifyProductId,
        shopifyProductTitle: message.shopifyProductTitle,
        totalExpected: message.totalExpected || undefined,
        batchIndex: message.batchIndex,
        isFinal: message.isFinal,
        reviews,
      },
    })

    return { ok: true, data }
  }

  return { ok: false, error: "Unknown message type" }
}