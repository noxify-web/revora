import {
  type ConnectTokenDomPayload,
  readConnectTokenDom,
} from "@revora/shared/bridge-dom";
import type {
  BackgroundConnectionStatusResponse,
  ConnectTokenBroadcast,
  ExtensionStatusRequest,
  ExtensionStatusResponse,
} from "@revora/shared/extension-messages";
import {
  isExtensionContextValid,
  sendRuntimeMessageSafe,
} from "./extension-context";

const CONNECT_TOKEN_CACHE_TTL_MS = 10 * 60 * 1000;

export interface ConnectTokenPayload extends ConnectTokenDomPayload {
  plan: string | null;
  planName: string | null;
  reviewLimit: number | null;
}

let latestConnectToken: ConnectTokenPayload | null = null;
let latestConnectTokenCreatedAt = 0;

export function clearConnectTokenCache() {
  latestConnectToken = null;
  latestConnectTokenCreatedAt = 0;
}

export function getFreshConnectToken() {
  if (!latestConnectToken?.token) {
    return null;
  }

  if (Date.now() - latestConnectTokenCreatedAt > CONNECT_TOKEN_CACHE_TTL_MS) {
    clearConnectTokenCache();
    return null;
  }

  return latestConnectToken;
}

export function cacheConnectToken(payload: ConnectTokenPayload) {
  latestConnectToken = payload;
  latestConnectTokenCreatedAt = Date.now();
}

export function persistConnectToken(payload: ConnectTokenPayload) {
  if (!isExtensionContextValid()) {
    return;
  }

  cacheConnectToken(payload);

  void sendRuntimeMessageSafe({
    type: "REVORA_CONNECT_DIRECT",
    token: payload.token,
    apiUrl: payload.apiUrl,
    shop: payload.shop,
    plan: payload.plan || undefined,
    planName: payload.planName || undefined,
    reviewLimit: payload.reviewLimit,
  });

  void sendRuntimeMessageSafe({
    type: "REVORA_SET_API_URL",
    apiBaseUrl: payload.apiUrl,
  });
}

export function markExtensionInstalledOnPage() {
  document.documentElement.dataset.revoraExtensionInstalled = "1";
}

export function readConnectTokenFromDom(): ConnectTokenPayload | null {
  const dom = readConnectTokenDom();
  if (!dom) {
    return null;
  }

  return {
    ...dom,
    plan: null,
    planName: null,
    reviewLimit: null,
  };
}

function parseConnectTokenBroadcast(data: unknown): ConnectTokenPayload | null {
  const payload = data as ConnectTokenBroadcast;

  if (!(payload?.token && payload.apiUrl && payload.shop)) {
    return null;
  }

  return {
    token: String(payload.token),
    apiUrl: String(payload.apiUrl).replace(/\/$/, ""),
    shop: String(payload.shop),
    plan: payload.plan ? String(payload.plan) : null,
    planName: payload.planName ? String(payload.planName) : null,
    reviewLimit: payload.reviewLimit ?? null,
  };
}

export interface BridgeMessageHandlerOptions {
  acceptOrigin: (origin: string) => boolean;
  getStatusReplyOrigin?: () => string;
  getStatusReplyTarget?: () => Window | null;
  requireSameWindowSource?: boolean;
}

export function handleBridgeMessageEvent(
  event: MessageEvent,
  options: BridgeMessageHandlerOptions
) {
  if (!isExtensionContextValid()) {
    return;
  }

  if (options.requireSameWindowSource && event.source !== window) {
    return;
  }

  if (!options.acceptOrigin(event.origin)) {
    return;
  }

  if (event.data?.type === "REVORA_CONNECT_TOKEN") {
    const payload = parseConnectTokenBroadcast(event.data);
    if (payload) {
      persistConnectToken(payload);
    }
    return;
  }

  if (event.data?.type === "REVORA_REQUEST_EXTENSION_STATUS") {
    const request = event.data as ExtensionStatusRequest;

    if (!request.requestId) {
      return;
    }

    const target =
      options.getStatusReplyTarget?.() ??
      (event.source instanceof Window ? event.source : null);

    if (!target) {
      return;
    }

    const origin = options.getStatusReplyOrigin?.() ?? event.origin;
    respondToExtensionStatusRequest(request.requestId, target, origin);
  }
}

export function respondToExtensionStatusRequest(
  requestId: string,
  target: Window,
  targetOrigin: string
) {
  void sendRuntimeMessageSafe({
    type: "REVORA_GET_CONNECTION_STATUS",
  }).then((response) => {
    const result = response as BackgroundConnectionStatusResponse;
    const data = result.ok ? result.data : undefined;

    const status: ExtensionStatusResponse = {
      type: "REVORA_EXTENSION_STATUS_RESPONSE",
      requestId,
      installed: true,
      paired: Boolean(data?.paired),
      verified: Boolean(data?.verified),
      shop: typeof data?.shop === "string" ? data.shop : null,
    };

    target.postMessage(status, targetOrigin);
  });
}
