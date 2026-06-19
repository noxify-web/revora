import { decodePairingCode, encodePairingCode } from "./pairing.js"

async function getStoredSettings() {
  return chrome.storage.sync.get([
    "pairingCode",
    "pairingToken",
    "apiBaseUrl",
  ])
}

async function getSettings() {
  const stored = await getStoredSettings()

  if (stored.pairingToken) {
    return {
      apiBaseUrl: (stored.apiBaseUrl || "").replace(/\/$/, ""),
      pairingToken: stored.pairingToken,
    }
  }

  if (stored.pairingCode) {
    const decoded = decodePairingCode(stored.pairingCode)

    return {
      apiBaseUrl: (stored.apiBaseUrl || decoded.apiBaseUrl || "").replace(
        /\/$/,
        "",
      ),
      pairingToken: decoded.pairingToken,
    }
  }

  return {
    apiBaseUrl: "",
    pairingToken: "",
  }
}

async function ensureHostPermission(apiBaseUrl) {
  try {
    const origin = `${new URL(apiBaseUrl).origin}/*`
    const hasPermission = await chrome.permissions.contains({ origins: [origin] })

    if (!hasPermission) {
      await chrome.permissions.request({ origins: [origin] })
    }
  } catch {
    // Ignore invalid URLs during permission checks.
  }
}

async function persistApiBaseUrl(apiBaseUrl) {
  const normalized = apiBaseUrl.replace(/\/$/, "")
  const stored = await getStoredSettings()
  const updates = { apiBaseUrl: normalized }

  const pairingToken =
    stored.pairingToken ||
    (stored.pairingCode
      ? decodePairingCode(stored.pairingCode).pairingToken
      : "")

  if (pairingToken) {
    updates.pairingToken = pairingToken
    updates.pairingCode = encodePairingCode({
      apiUrl: normalized,
      token: pairingToken,
    })
  }

  await chrome.storage.sync.set(updates)
  await ensureHostPermission(normalized)

  return normalized
}

async function syncApiUrlFromHealth(apiBaseUrl) {
  const response = await fetch(`${apiBaseUrl}/api/extension/health`)

  const data = await response.json().catch(() => ({}))

  if (!response.ok || !data.apiUrl) {
    return apiBaseUrl
  }

  const nextUrl = data.apiUrl.replace(/\/$/, "")
  if (nextUrl !== apiBaseUrl) {
    return persistApiBaseUrl(nextUrl)
  }

  return apiBaseUrl
}

async function apiRequest(path, init = {}) {
  let { apiBaseUrl, pairingToken } = await getSettings()

  if (!pairingToken) {
    throw new Error("Paste your pairing code in the extension popup")
  }

  if (!apiBaseUrl) {
    throw new Error(
      "Server URL missing. Open Revora in Shopify admin and click Sync URL in the extension popup.",
    )
  }

  const headers = new Headers(init.headers || {})
  headers.set("Authorization", `Bearer ${pairingToken}`)

  if (init.body) {
    headers.set("Content-Type", "application/json")
  }

  const attemptRequest = async (baseUrl) => {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status})`)
    }

    return data
  }

  try {
    const data = await attemptRequest(apiBaseUrl)

    if (data.apiUrl && data.apiUrl.replace(/\/$/, "") !== apiBaseUrl) {
      apiBaseUrl = await persistApiBaseUrl(data.apiUrl)
    }

    return data
  } catch (error) {
    const stored = await getStoredSettings()
    const refreshedUrl = stored.apiBaseUrl?.replace(/\/$/, "")

    if (
      refreshedUrl &&
      refreshedUrl !== apiBaseUrl &&
      error instanceof TypeError
    ) {
      apiBaseUrl = await persistApiBaseUrl(refreshedUrl)
      return attemptRequest(apiBaseUrl)
    }

    if (error instanceof TypeError) {
      throw new Error(
        `Cannot reach Revora at ${apiBaseUrl}. Keep "shopify app dev" running, open Revora in Shopify admin, then click Sync URL in the extension popup.`,
      )
    }

    throw error
  }
}

function mapReview(review) {
  return {
    temuReviewId: String(review.review_id),
    comment: review.comment || "",
    translatedComment: review.review_lang?.translate_comment || "",
    score: review.score ?? null,
    authorName: review.name || "",
    reviewTime: review.time ?? null,
    pictures: Array.isArray(review.pictures) ? review.pictures : [],
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "REVORA_SET_API_URL") {
    persistApiBaseUrl(message.apiBaseUrl)
      .then((apiBaseUrl) => sendResponse({ ok: true, apiBaseUrl }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Failed to save URL",
        }),
      )
    return true
  }

  if (message?.type === "REVORA_VERIFY") {
    getSettings()
      .then(async ({ apiBaseUrl, pairingToken }) => {
        if (!pairingToken) {
          throw new Error("Paste your pairing code in the extension popup")
        }

        if (!apiBaseUrl) {
          throw new Error(
            "Server URL missing. Open Revora in Shopify admin and click Sync URL.",
          )
        }

        const syncedUrl = await syncApiUrlFromHealth(apiBaseUrl)
        const health = await apiRequest("/api/extension/health")
        const data = await apiRequest("/api/extension/verify")

        return {
          ...data,
          apiUrl: health.apiUrl || syncedUrl,
        }
      })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Verification failed",
        }),
      )
    return true
  }

  if (message?.type === "REVORA_GET_PRODUCTS") {
    const search = message.search ? `?search=${encodeURIComponent(message.search)}` : ""
    apiRequest(`/api/products${search}`)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Failed to load products",
        }),
      )
    return true
  }

  if (message?.type === "REVORA_UPLOAD_BATCH") {
    const reviews = (message.reviews || []).map(mapReview)

    apiRequest("/api/reviews/import", {
      method: "POST",
      body: JSON.stringify({
        importId: message.importId,
        temuGoodsId: message.temuGoodsId,
        temuProductUrl: message.temuProductUrl,
        temuProductTitle: message.temuProductTitle,
        shopifyProductId: message.shopifyProductId,
        shopifyProductTitle: message.shopifyProductTitle,
        totalExpected: message.totalExpected,
        batchIndex: message.batchIndex,
        isFinal: message.isFinal,
        reviews,
      }),
    })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Upload failed",
        }),
      )
    return true
  }

  return false
})