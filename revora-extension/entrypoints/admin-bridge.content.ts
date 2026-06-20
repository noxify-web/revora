import { REVORA_CLIENT_ID } from "@revora/shared/constants"
import type {
  AdminBridgeRequest,
  AdminProxyResponse,
  ConnectCodeBroadcast,
  ConnectCodeRequest,
  ConnectCodeResponse,
} from "@revora/shared/extension-messages"

const PROXY_TIMEOUT_MS = 30_000

type ConnectPayload = {
  code: string
  apiUrl: string | null
  expiresAt: string | null
}

let latestConnectPayload: ConnectPayload | null = null

function isConnectPayloadExpired(payload: ConnectPayload | null) {
  if (!payload?.expiresAt) {
    return false
  }

  const expiresAt = Date.parse(payload.expiresAt)
  return Number.isFinite(expiresAt) && expiresAt <= Date.now()
}

function getFreshConnectPayload() {
  if (!latestConnectPayload?.code) {
    return null
  }

  if (isConnectPayloadExpired(latestConnectPayload)) {
    latestConnectPayload = null
    return null
  }

  return latestConnectPayload
}

function isRevoraAppPage() {
  return window.location.pathname.includes(`/apps/${REVORA_CLIENT_ID}`)
}

function isRevoraEmbeddedIframe(url: URL) {
  if (url.hostname.endsWith("admin.shopify.com")) {
    return false
  }

  if (url.searchParams.get("embedded") === "1" && url.searchParams.get("shop")) {
    return true
  }

  return url.pathname.includes(`/apps/${REVORA_CLIENT_ID}`)
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

function requestConnectCodeFromIframe() {
  return new Promise<ConnectPayload | null>((resolve) => {
    const cached = getFreshConnectPayload()
    if (cached) {
      resolve(cached)
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

    const finish = (payload: ConnectPayload | null) => {
      if (settled) return
      settled = true
      window.removeEventListener("message", onResponse)
      clearTimeout(timer)

      if (payload?.code) {
        latestConnectPayload = payload
      }

      resolve(payload)
    }

    function onResponse(event: MessageEvent<ConnectCodeResponse>) {
      if (event.origin !== origin) {
        return
      }

      if (event.data?.type !== "REVORA_CONNECT_CODE_RESPONSE") {
        return
      }

      if (event.data.requestId !== requestId) {
        return
      }

      finish({
        code: event.data.code ? String(event.data.code) : "",
        apiUrl: event.data.apiUrl ? String(event.data.apiUrl) : null,
        expiresAt: event.data.expiresAt || null,
      })
    }

    window.addEventListener("message", onResponse)

    const timer = window.setTimeout(() => {
      finish(getFreshConnectPayload())
    }, 2500)

    iframeWindow.postMessage(
      {
        type: "REVORA_REQUEST_CONNECT_CODE",
        requestId,
      } satisfies ConnectCodeRequest,
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
    window.addEventListener("message", (event: MessageEvent<ConnectCodeBroadcast>) => {
      if (event.data?.type !== "REVORA_CONNECT_CODE") {
        return
      }

      if (!event.data.code) {
        return
      }

      latestConnectPayload = {
        code: String(event.data.code),
        apiUrl: event.data.apiUrl ? String(event.data.apiUrl) : null,
        expiresAt: event.data.expiresAt || null,
      }

      if (latestConnectPayload.apiUrl) {
        chrome.runtime
          .sendMessage({
            type: "REVORA_SET_API_URL",
            apiBaseUrl: latestConnectPayload.apiUrl,
          })
          .catch(() => {})
      }
    })

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
            findRevoraIframeOrigin() || latestConnectPayload?.apiUrl || null,
        })
        return
      }

      if (request.type === "REVORA_GET_CONNECT_CODE") {
        requestConnectCodeFromIframe()
          .then((payload) =>
            sendResponse({
              code: payload?.code || null,
              apiUrl: payload?.apiUrl || findRevoraIframeOrigin() || null,
              expiresAt: payload?.expiresAt || null,
            }),
          )
          .catch(() => {
            const cached = getFreshConnectPayload()
            sendResponse({
              code: cached?.code || null,
              apiUrl: cached?.apiUrl || findRevoraIframeOrigin() || null,
              expiresAt: cached?.expiresAt || null,
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