"use client"

import { useEffect } from "react"

const ALLOWED_PROXY_PREFIXES = [
  "/api/extension/",
  "/api/products",
  "/api/reviews/import",
]

type ProxyRequest = {
  type: "REVORA_ADMIN_PROXY_REQUEST"
  requestId: string
  path: string
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

type ConnectCodeRequest = {
  type: "REVORA_REQUEST_CONNECT_CODE"
  requestId: string
}

function isAllowedProxyPath(path: string) {
  return ALLOWED_PROXY_PREFIXES.some((prefix) => path.startsWith(prefix))
}

function readConnectCodeFromDom() {
  const code = document.documentElement.dataset.revoraConnectCode?.trim()
  const apiUrl = document.documentElement.dataset.revoraApiUrl?.trim()
  const expiresAt =
    document.documentElement.dataset.revoraConnectExpires?.trim()

  if (!code) {
    return null
  }

  return {
    code,
    apiUrl: apiUrl || null,
    expiresAt: expiresAt || null,
  }
}

function broadcastConnectCode(payload: {
  code: string
  apiUrl?: string | null
  expiresAt?: string | null
}) {
  document.documentElement.dataset.revoraConnectCode = payload.code
  if (payload.apiUrl) {
    document.documentElement.dataset.revoraApiUrl = payload.apiUrl
  }
  if (payload.expiresAt) {
    document.documentElement.dataset.revoraConnectExpires = payload.expiresAt
  }

  window.parent.postMessage(
    {
      type: "REVORA_CONNECT_CODE",
      code: payload.code,
      apiUrl: payload.apiUrl,
      expiresAt: payload.expiresAt,
    },
    "https://admin.shopify.com"
  )
}

export function ExtensionBridge() {
  useEffect(() => {
    const existing = readConnectCodeFromDom()
    if (existing) {
      broadcastConnectCode(existing)
    }

    function handleMessage(
      event: MessageEvent<ProxyRequest | ConnectCodeRequest>
    ) {
      if (event.source !== window.parent) {
        return
      }

      if (!event.origin.endsWith("admin.shopify.com")) {
        return
      }

      if (event.data?.type === "REVORA_REQUEST_CONNECT_CODE") {
        const payload = readConnectCodeFromDom()
        window.parent.postMessage(
          {
            type: "REVORA_CONNECT_CODE_RESPONSE",
            requestId: event.data.requestId,
            code: payload?.code || null,
            apiUrl: payload?.apiUrl || null,
            expiresAt: payload?.expiresAt || null,
          },
          event.origin
        )
        return
      }

      if (event.data?.type !== "REVORA_ADMIN_PROXY_REQUEST") {
        return
      }

      void handleProxyRequest(event as MessageEvent<ProxyRequest>)
    }

    async function handleProxyRequest(event: MessageEvent<ProxyRequest>) {
      const { requestId, path, method = "GET", body, headers = {} } = event.data
      const targetOrigin = event.origin || "*"

      if (!isAllowedProxyPath(path)) {
        window.parent.postMessage(
          {
            type: "REVORA_ADMIN_PROXY_RESPONSE",
            requestId,
            ok: false,
            error: "Proxy path is not allowed",
          },
          targetOrigin
        )
        return
      }

      try {
        const fetchHeaders = new Headers(headers)

        if (body != null && !fetchHeaders.has("Content-Type")) {
          fetchHeaders.set("Content-Type", "application/json")
        }

        const response = await fetch(path, {
          method,
          headers: fetchHeaders,
          body: body == null ? undefined : JSON.stringify(body),
        })

        const data = await response.json().catch(() => ({}))

        window.parent.postMessage(
          {
            type: "REVORA_ADMIN_PROXY_RESPONSE",
            requestId,
            ok: response.ok,
            status: response.status,
            data: response.ok ? data : undefined,
            error: response.ok
              ? undefined
              : typeof data.error === "string"
                ? data.error
                : `Request failed (${response.status})`,
          },
          targetOrigin
        )
      } catch (error) {
        window.parent.postMessage(
          {
            type: "REVORA_ADMIN_PROXY_RESPONSE",
            requestId,
            ok: false,
            error: error instanceof Error ? error.message : "Request failed",
          },
          targetOrigin
        )
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  return null
}

export { broadcastConnectCode }
