import type {
  BackgroundRequest,
  BackgroundResponse,
} from "@revora/shared/extension-messages"
import { connectExchangeSchema } from "@revora/shared/extension-schemas"
import type { ConnectExchangeResponse } from "@revora/shared/extension-types"
import {
  enrichConnection,
  fetchRevora,
  persistApiBaseUrl,
  persistConnection,
  readConnectionState,
} from "../lib/api-transport"
import { mapTemuReview } from "../lib/review-mapper"

export default defineBackground(() => {
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

  if (message.type === "REVORA_CONNECT_EXCHANGE") {
    connectExchangeSchema.parse({ code: message.code })

    const data = await fetchRevora<ConnectExchangeResponse>(
      "/api/extension/connect/exchange",
      {
        method: "POST",
        body: { code: message.code },
        auth: false,
      },
    )

    await persistConnection(data)
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