import {
  REVORA_APP_PATH_PATTERN,
  REVORA_CLIENT_ID,
} from "@revora/shared/constants"
import {
  isExtensionContextValid,
  safeSendResponse,
  sendBackgroundMessage,
} from "../lib/runtime-messaging"
import type {
  AdminBridgeRequest,
  AdminProxyResponse,
  ConnectTokenBroadcast,
  ConnectTokenRequest,
  ConnectTokenPullResponse,
} from "@revora/shared/extension-messages"

const PROXY_TIMEOUT_MS = 30_000
const CONNECT_TOKEN_CACHE_TTL_MS = 10 * 60 * 1000
const ORIGIN_SYNC_INTERVAL_MS = 3_000

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
  if (!isExtensionContextValid()) {
    return
  }

  cacheConnectToken(payload)

  sendBackgroundMessage({
    type: "REVORA_CONNECT_DIRECT",
    token: payload.token,
    apiUrl: payload.apiUrl,
    shop: payload.shop,
    plan: payload.plan || undefined,
    planName: payload.planName || undefined,
    reviewLimit: payload.reviewLimit,
  })

  sendBackgroundMessage({
    type: "REVORA_SET_API_URL",
    apiBaseUrl: payload.apiUrl,
  })
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
    if (!isExtensionContextValid()) {
      reject(new Error("Extension context invalidated"))
      return
    }

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
    let settled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      if (timer != null) {
        clearTimeout(timer)
        timer = null
      }
      window.removeEventListener("message", onResponse)
    }

    const finish = (handler: () => void) => {
      if (settled) {
        return
      }

      settled = true
      cleanup()
      handler()
    }

    timer = window.setTimeout(() => {
      finish(() => {
        reject(new Error("Revora admin request timed out. Refresh the app page."))
      })
    }, PROXY_TIMEOUT_MS)

    function onResponse(event: MessageEvent<AdminProxyResponse>) {
      if (!isExtensionContextValid()) {
        finish(() => {
          reject(new Error("Extension context invalidated"))
        })
        return
      }

      if (event.origin !== origin) {
        return
      }

      if (event.data?.type !== "REVORA_ADMIN_PROXY_RESPONSE") {
        return
      }

      if (event.data.requestId !== requestId) {
        return
      }

      if (event.data.ok) {
        finish(() => {
          resolve(event.data.data)
        })
        return
      }

      finish(() => {
        reject(new Error(event.data.error || "Request failed"))
      })
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
    if (!isExtensionContextValid()) {
      resolve(null)
      return
    }

    const match = findRevoraIframe()
    const iframeWindow = match?.iframe.contentWindow

    if (!match || !iframeWindow) {
      resolve(null)
      return
    }

    const { origin } = match
    const requestId = crypto.randomUUID()
    let settled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      if (timer != null) {
        clearTimeout(timer)
        timer = null
      }
      window.removeEventListener("message", onResponse)
    }

    const finish = (payload: ConnectTokenPayload | null) => {
      if (settled) {
        return
      }

      settled = true
      cleanup()

      if (payload?.token) {
        cacheConnectToken(payload)
      }

      resolve(payload)
    }

    function onResponse(event: MessageEvent<ConnectTokenPullResponse>) {
      if (!isExtensionContextValid()) {
        finish(null)
        return
      }

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

    timer = window.setTimeout(() => {
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

export default defineContentScript({
  matches: ["https://admin.shopify.com/*"],
  runAt: "document_idle",
  main(ctx) {
    let disposed = false
    let lastSyncedOrigin: string | null = null
    let originSyncInterval: ReturnType<typeof setInterval> | null = null

    const dispose = () => {
      if (disposed) {
        return
      }

      disposed = true

      if (originSyncInterval != null) {
        clearInterval(originSyncInterval)
        originSyncInterval = null
      }

      window.removeEventListener("message", onWindowMessage)

      try {
        chrome.runtime.onMessage.removeListener(onRuntimeMessage)
      } catch {
        // Context already invalidated.
      }
    }

    const isActive = () => {
      if (disposed) {
        return false
      }

      if (!isExtensionContextValid()) {
        dispose()
        return false
      }

      return true
    }

    const syncOrigin = () => {
      if (!isActive()) {
        return
      }

      const origin = findRevoraIframeOrigin()
      if (!origin || origin === lastSyncedOrigin) {
        return
      }

      lastSyncedOrigin = origin
      sendBackgroundMessage({
        type: "REVORA_SET_API_URL",
        apiBaseUrl: origin,
      })
    }

    const onWindowMessage = (event: MessageEvent<ConnectTokenBroadcast>) => {
      if (!isActive()) {
        return
      }

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

      syncOrigin()
    }

    const onRuntimeMessage: Parameters<
      typeof chrome.runtime.onMessage.addListener
    >[0] = (message, _sender, sendResponse) => {
      if (!isActive()) {
        return false
      }

      const request = message as AdminBridgeRequest

      if (request.type === "REVORA_PING") {
        safeSendResponse(sendResponse, { ok: true })
        return
      }

      if (request.type === "REVORA_ADMIN_PROXY") {
        proxyToRevoraApp({
          path: request.path,
          method: request.method,
          body: request.body,
          headers: request.headers,
        })
          .then((data) => safeSendResponse(sendResponse, { ok: true, data }))
          .catch((error: unknown) =>
            safeSendResponse(sendResponse, {
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
        safeSendResponse(sendResponse, {
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

            safeSendResponse(sendResponse, {
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
            safeSendResponse(sendResponse, {
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
    }

    const swallowInvalidationErrors = (event: ErrorEvent) => {
      const message = event.message || ""
      if (/extension context invalidated|context invalidated/i.test(message)) {
        dispose()
        event.preventDefault()
      }
    }

    const swallowInvalidationRejections = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const message =
        reason instanceof Error ? reason.message : String(reason ?? "")
      if (/extension context invalidated|context invalidated/i.test(message)) {
        dispose()
        event.preventDefault()
      }
    }

    window.addEventListener("error", swallowInvalidationErrors)
    window.addEventListener("unhandledrejection", swallowInvalidationRejections)
    window.addEventListener("message", onWindowMessage)

    try {
      chrome.runtime.onMessage.addListener(onRuntimeMessage)
    } catch {
      return
    }

    ctx.onInvalidated(() => {
      window.removeEventListener("error", swallowInvalidationErrors)
      window.removeEventListener(
        "unhandledrejection",
        swallowInvalidationRejections,
      )
      dispose()
    })

    if (isRevoraAppPage()) {
      syncOrigin()
      originSyncInterval = window.setInterval(() => {
        syncOrigin()
      }, ORIGIN_SYNC_INTERVAL_MS)
    }
  },
})