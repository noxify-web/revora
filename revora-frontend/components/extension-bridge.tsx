"use client"

import { useEffect } from "react"

import type {
  ConnectTokenBroadcast,
  ConnectTokenRequest,
} from "@revora/shared/extension-messages"

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

type ConnectTokenPayload = {
  token: string
  apiUrl: string
  shop: string
  plan?: string | null
  planName?: string | null
  reviewLimit?: number | null
}

function isAllowedProxyPath(path: string) {
  return ALLOWED_PROXY_PREFIXES.some((prefix) => path.startsWith(prefix))
}

function readConnectTokenFromDom(): ConnectTokenPayload | null {
  const token = document.documentElement.dataset.revoraConnectToken?.trim()
  const apiUrl = document.documentElement.dataset.revoraApiUrl?.trim()
  const shop = document.documentElement.dataset.revoraShop?.trim()

  if (!token || !apiUrl || !shop) {
    return null
  }

  return {
    token,
    apiUrl,
    shop,
    plan: document.documentElement.dataset.revoraPlan?.trim() || null,
    planName: document.documentElement.dataset.revoraPlanName?.trim() || null,
    reviewLimit: document.documentElement.dataset.revoraReviewLimit
      ? Number(document.documentElement.dataset.revoraReviewLimit)
      : null,
  }
}

function writeConnectTokenToDom(payload: ConnectTokenPayload) {
  document.documentElement.dataset.revoraConnectToken = payload.token
  document.documentElement.dataset.revoraApiUrl = payload.apiUrl
  document.documentElement.dataset.revoraShop = payload.shop

  if (payload.plan) {
    document.documentElement.dataset.revoraPlan = payload.plan
  }

  if (payload.planName) {
    document.documentElement.dataset.revoraPlanName = payload.planName
  }

  if (payload.reviewLimit != null) {
    document.documentElement.dataset.revoraReviewLimit = String(
      payload.reviewLimit
    )
  }
}

function broadcastConnectToken(payload: ConnectTokenPayload) {
  writeConnectTokenToDom(payload)

  window.parent.postMessage(
    {
      type: "REVORA_CONNECT_TOKEN",
      token: payload.token,
      apiUrl: payload.apiUrl,
      shop: payload.shop,
      plan: payload.plan,
      planName: payload.planName,
      reviewLimit: payload.reviewLimit,
    } satisfies ConnectTokenBroadcast,
    "https://admin.shopify.com"
  )
}

export function ExtensionBridge() {
  useEffect(() => {
    const existingToken = readConnectTokenFromDom()
    if (existingToken) {
      broadcastConnectToken(existingToken)
    }

    function handleMessage(
      event: MessageEvent<ProxyRequest | ConnectTokenRequest>
    ) {
      if (event.source !== window.parent) {
        return
      }

      if (!event.origin.endsWith("admin.shopify.com")) {
        return
      }

      if (event.data?.type === "REVORA_REQUEST_CONNECT_TOKEN") {
        const payload = readConnectTokenFromDom()
        window.parent.postMessage(
          {
            type: "REVORA_CONNECT_TOKEN_RESPONSE",
            requestId: event.data.requestId,
            token: payload?.token || null,
            apiUrl: payload?.apiUrl || null,
            shop: payload?.shop || null,
            plan: payload?.plan || null,
            planName: payload?.planName || null,
            reviewLimit: payload?.reviewLimit ?? null,
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

export { broadcastConnectToken }