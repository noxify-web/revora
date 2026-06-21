import {
  REVORA_APP_PATH_PATTERN,
  REVORA_CLIENT_ID,
} from "@revora/shared/constants"
import type {
  AdminBridgeRequest,
  AdminProxyResponse,
  ConnectTokenBroadcast,
  ConnectTokenRequest,
  ConnectTokenPullResponse,
} from "@revora/shared/extension-messages"

const PROXY_TIMEOUT_MS = 30_000
const CONNECT_TOKEN_CACHE_TTL_MS = 10 * 60 * 1000

type ConnectTokenPayload = {
  token: string
  apiUrl: string
  shop: string
  plan: string | null
  planName: string | null
  reviewLimit: number | null
}

let latestConnectToken: ConnectTokenPayload | null = null
let latestConnectTokenCreatedAt = 0

function clearConnectTokenCache() {
  latestConnectToken = null
  latestConnectTokenCreatedAt = 0
}

function getFreshConnectToken() {
  if (!latestConnectToken?.token) {
    return null
  }

  if (Date.now() - latestConnectTokenCreatedAt > CONNECT_TOKEN_CACHE_TTL_MS) {
    clearConnectTokenCache()
    return null
  }

  return latestConnectToken
}

function cacheConnectToken(payload: ConnectTokenPayload) {
  if (latestConnectToken?.token !== payload.token) {
    latestConnectToken = payload
    latestConnectTokenCreatedAt = Date.now()
    return
  }

  latestConnectToken = payload
  latestConnectTokenCreatedAt = Date.now()
}

function persistConnectToken(payload: ConnectTokenPayload) {
  cacheConnectToken(payload)

  chrome.runtime
    .sendMessage({
      type: "REVORA_CONNECT_DIRECT",
      token: payload.token,
      apiUrl: payload.apiUrl,
      shop: payload.shop,
      plan: payload.plan || undefined,
      planName: payload.planName || undefined,
      reviewLimit: payload.reviewLimit,
    })
    .catch(() => {})

  chrome.runtime
    .sendMessage({
      type: "REVORA_SET_API_URL",
      apiBaseUrl: payload.apiUrl,
    })
    .catch(() => {})
}

function isRevoraAppPage() {
  const path = window.location.pathname
  return (
    REVORA_APP_PATH_PATTERN.test(path) ||
    path.includes(`/apps/${REVORA_CLIENT_ID}`)
  )
}

function isRevoraEmbeddedIframe(url: URL) {
  if (url.hostname.endsWith("admin.shopify.com")) {
    return false
  }

  if (
    REVORA_APP_PATH_PATTERN.test(url.pathname) ||
    url.pathname.includes(`/apps/${REVORA_CLIENT_ID}`)
  ) {
    return true
  }

  if (
    url.searchParams.get("embedded") === "1" &&
    url.searchParams.get("shop") &&
    isRevoraAppPage()
  ) {
    return true
  }

  return false
}

function findRevoraIframe() {
  for (const element of document.querySelectorAll("iframe[src]")) {
    if (!(element instanceof HTMLIFrameElement)) {
      continue
    }

    try {
      const url = new URL(element.getAttribute("src") || "")

      if (!isRevoraEmbeddedIframe(url)) {
        continue
      }

      return {
        iframe: element,
        origin: url.origin,
      }
    } catch {
      // Ignore malformed iframe URLs.
    }
  }

  return null
}

function findRevoraIframeOrigin() {
  return findRevoraIframe()?.origin ?? null
}

function proxyToRevoraApp({
  path,
  method = "GET",
  body,
  headers = {},
}: {
  path: string
  method?: string
  body?: unknown
  headers?: Record<string, string>
}) {
  return new Promise<unknown>((resolve, reject) => {
    const match = findRevoraIframe()
    const iframeWindow = match?.iframe.contentWindow

    if (!match || !iframeWindow) {
      reject(
        new Error(
          "Open Revora in Shopify admin first, then try again from the extension.",
        ),
      )
      return
    }

    const { origin } = match
    const requestId = crypto.randomUUID()

    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onResponse)
      reject(new Error("Revora admin request timed out. Refresh the app page."))
    }, PROXY_TIMEOUT_MS)

    function onResponse(event: MessageEvent<AdminProxyResponse>) {
      if (event.origin !== origin) {
        return
      }

      if (event.data?.type !== "REVORA_ADMIN_PROXY_RESPONSE") {
        return
      }

      if (event.data.requestId !== requestId) {
        return
      }

      window.clearTimeout(timer)
      window.removeEventListener("message", onResponse)

      if (event.data.ok) {
        resolve(event.data.data)
        return
      }

      reject(new Error(event.data.error || "Request failed"))
    }

    window.addEventListener("message", onResponse)

    iframeWindow.postMessage(
      {
        type: "REVORA_ADMIN_PROXY_REQUEST",
        requestId,
        path,
        method,
        body,
        headers,
      },
      origin,
    )
  })
}

function requestConnectTokenFromIframe() {
  return new Promise<ConnectTokenPayload | null>((resolve) => {
    const match = findRevoraIframe()
    const iframeWindow = match?.iframe.contentWindow

    if (!match || !iframeWindow) {
      resolve(null)
      return
    }

    const { origin } = match
    const requestId = crypto.randomUUID()
    let settled = false

    const finish = (payload: ConnectTokenPayload | null) => {
      if (settled) return
      settled = true
      window.removeEventListener("message", onResponse)
      clearTimeout(timer)

      if (payload?.token) {
        cacheConnectToken(payload)
      }

      resolve(payload)
    }

    function onResponse(event: MessageEvent<ConnectTokenPullResponse>) {
      if (event.origin !== origin) {
        return
      }

      if (event.data?.type !== "REVORA_CONNECT_TOKEN_RESPONSE") {
        return
      }

      if (event.data.requestId !== requestId) {
        return
      }

      if (!event.data.token || !event.data.apiUrl || !event.data.shop) {
        finish(null)
        return
      }

      finish({
        token: String(event.data.token),
        apiUrl: String(event.data.apiUrl),
        shop: String(event.data.shop),
        plan: event.data.plan ? String(event.data.plan) : null,
        planName: event.data.planName ? String(event.data.planName) : null,
        reviewLimit: event.data.reviewLimit ?? null,
      })
    }

    window.addEventListener("message", onResponse)

    const timer = window.setTimeout(() => {
      finish(getFreshConnectToken())
    }, 2500)

    iframeWindow.postMessage(
      {
        type: "REVORA_REQUEST_CONNECT_TOKEN",
        requestId,
      } satisfies ConnectTokenRequest,
      origin,
    )
  })
}

function syncOrigin() {
  const origin = findRevoraIframeOrigin()
  if (!origin) {
    return
  }

  chrome.runtime
    .sendMessage({
      type: "REVORA_SET_API_URL",
      apiBaseUrl: origin,
    })
    .catch(() => {})
}

export default defineContentScript({
  matches: ["https://admin.shopify.com/*"],
  runAt: "document_idle",
  main() {
    window.addEventListener(
      "message",
      (event: MessageEvent<ConnectTokenBroadcast>) => {
        if (event.data?.type !== "REVORA_CONNECT_TOKEN") {
          return
        }

        const revoraOrigin = findRevoraIframeOrigin()
        if (!revoraOrigin || event.origin !== revoraOrigin) {
          return
        }

        if (!event.data.token || !event.data.apiUrl || !event.data.shop) {
          return
        }

        persistConnectToken({
          token: String(event.data.token),
          apiUrl: String(event.data.apiUrl).replace(/\/$/, ""),
          shop: String(event.data.shop),
          plan: event.data.plan ? String(event.data.plan) : null,
          planName: event.data.planName ? String(event.data.planName) : null,
          reviewLimit: event.data.reviewLimit ?? null,
        })
      },
    )

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      const request = message as AdminBridgeRequest

      if (request.type === "REVORA_PING") {
        sendResponse({ ok: true })
        return
      }

      if (request.type === "REVORA_ADMIN_PROXY") {
        proxyToRevoraApp({
          path: request.path,
          method: request.method,
          body: request.body,
          headers: request.headers,
        })
          .then((data) => sendResponse({ ok: true, data }))
          .catch((error: unknown) =>
            sendResponse({
              ok: false,
              unavailable: /open revora in shopify admin/i.test(
                error instanceof Error ? error.message : "",
              ),
              error: error instanceof Error ? error.message : "Proxy failed",
            }),
          )
        return true
      }

      if (request.type === "REVORA_GET_API_URL") {
        sendResponse({
          apiBaseUrl:
            findRevoraIframeOrigin() || latestConnectToken?.apiUrl || null,
        })
        return
      }

      if (request.type === "REVORA_GET_CONNECT_TOKEN") {
        requestConnectTokenFromIframe()
          .then((payload) => {
            if (payload?.token) {
              persistConnectToken(payload)
            }

            sendResponse({
              token: payload?.token || null,
              apiUrl: payload?.apiUrl || findRevoraIframeOrigin() || null,
              shop: payload?.shop || null,
              plan: payload?.plan || null,
              planName: payload?.planName || null,
              reviewLimit: payload?.reviewLimit ?? null,
            })
          })
          .catch(() => {
            const cached = getFreshConnectToken()
            sendResponse({
              token: cached?.token || null,
              apiUrl: cached?.apiUrl || findRevoraIframeOrigin() || null,
              shop: cached?.shop || null,
              plan: cached?.plan || null,
              planName: cached?.planName || null,
              reviewLimit: cached?.reviewLimit ?? null,
            })
          })
        return true
      }

      return false
    })

    if (isRevoraAppPage()) {
      syncOrigin()

      const observer = new MutationObserver(() => {
        syncOrigin()
      })

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      })

      window.setInterval(syncOrigin, 3000)
    }
  },
})