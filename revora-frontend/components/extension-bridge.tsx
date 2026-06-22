"use client";

import type {
  ConnectTokenBroadcast,
  ConnectTokenRequest,
  RevoraClearConnectTokenMessage,
} from "@revora/shared/extension-messages";
import { useEffect } from "react";
import { stripStaleIdTokenFromUrl } from "@/lib/admin-fetch";

const ALLOWED_PROXY_PREFIXES = [
  "/api/extension/",
  "/api/products",
  "/api/reviews/import",
];

interface ProxyRequest {
  body?: unknown;
  headers?: Record<string, string>;
  method?: string;
  path: string;
  requestId: string;
  type: "REVORA_ADMIN_PROXY_REQUEST";
}

interface ConnectTokenPayload {
  apiUrl: string;
  shop: string;
  token: string;
}

function isAllowedProxyPath(path: string) {
  return ALLOWED_PROXY_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function readConnectTokenFromDom(): ConnectTokenPayload | null {
  const token = document.documentElement.dataset.revoraConnectToken?.trim();
  const apiUrl = document.documentElement.dataset.revoraApiUrl?.trim();
  const shop = document.documentElement.dataset.revoraShop?.trim();

  if (!(token && apiUrl && shop)) {
    return null;
  }

  return {
    token,
    apiUrl,
    shop,
  };
}

function writeConnectTokenToDom(payload: ConnectTokenPayload) {
  document.documentElement.dataset.revoraConnectToken = payload.token;
  document.documentElement.dataset.revoraApiUrl = payload.apiUrl;
  document.documentElement.dataset.revoraShop = payload.shop;
}

function clearConnectTokenFromDom() {
  delete document.documentElement.dataset.revoraConnectToken;
  delete document.documentElement.dataset.revoraApiUrl;
  delete document.documentElement.dataset.revoraShop;
}

function broadcastConnectToken(payload: ConnectTokenPayload) {
  writeConnectTokenToDom(payload);

  window.parent.postMessage(
    {
      type: "REVORA_CONNECT_TOKEN",
      token: payload.token,
      apiUrl: payload.apiUrl,
      shop: payload.shop,
    } satisfies ConnectTokenBroadcast,
    "https://admin.shopify.com"
  );
}

export function ExtensionBridge() {
  useEffect(() => {
    stripStaleIdTokenFromUrl();

    const existingToken = readConnectTokenFromDom();
    if (existingToken) {
      broadcastConnectToken(existingToken);
    }

    function handleMessage(
      event: MessageEvent<
        ProxyRequest | ConnectTokenRequest | RevoraClearConnectTokenMessage
      >
    ) {
      if (event.source !== window.parent) {
        return;
      }

      if (!event.origin.endsWith("admin.shopify.com")) {
        return;
      }

      if (event.data?.type === "REVORA_CLEAR_CONNECT_TOKEN") {
        clearConnectTokenFromDom();
        return;
      }

      if (event.data?.type === "REVORA_REQUEST_CONNECT_TOKEN") {
        const payload = readConnectTokenFromDom();
        window.parent.postMessage(
          {
            type: "REVORA_CONNECT_TOKEN_RESPONSE",
            requestId: event.data.requestId,
            token: payload?.token || null,
            apiUrl: payload?.apiUrl || null,
            shop: payload?.shop || null,
          },
          event.origin
        );
        return;
      }

      if (event.data?.type !== "REVORA_ADMIN_PROXY_REQUEST") {
        return;
      }

      void handleProxyRequest(event as MessageEvent<ProxyRequest>);
    }

    async function handleProxyRequest(event: MessageEvent<ProxyRequest>) {
      const {
        requestId,
        path,
        method = "GET",
        body,
        headers = {},
      } = event.data;
      const targetOrigin = event.origin || "*";

      if (!isAllowedProxyPath(path)) {
        window.parent.postMessage(
          {
            type: "REVORA_ADMIN_PROXY_RESPONSE",
            requestId,
            ok: false,
            error: "Proxy path is not allowed",
          },
          targetOrigin
        );
        return;
      }

      try {
        const fetchHeaders = new Headers(headers);

        if (body != null && !fetchHeaders.has("Content-Type")) {
          fetchHeaders.set("Content-Type", "application/json");
        }

        const response = await fetch(path, {
          method,
          headers: fetchHeaders,
          body: body == null ? undefined : JSON.stringify(body),
        });

        const data = await response.json().catch(() => ({}));

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
        );
      } catch (error) {
        window.parent.postMessage(
          {
            type: "REVORA_ADMIN_PROXY_RESPONSE",
            requestId,
            ok: false,
            error: error instanceof Error ? error.message : "Request failed",
          },
          targetOrigin
        );
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

export { broadcastConnectToken };
