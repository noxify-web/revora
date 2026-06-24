import type { ConnectTokenDomPayload } from "@revora/shared/bridge-dom";

const PENDING_CONNECT_TOKEN_KEY = "revora-pending-connect-token";

export function persistPendingConnectToken(payload: ConnectTokenDomPayload) {
  if (typeof sessionStorage === "undefined") {
    return;
  }

  sessionStorage.setItem(PENDING_CONNECT_TOKEN_KEY, JSON.stringify(payload));
}

export function readPendingConnectToken(): ConnectTokenDomPayload | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }

  const raw = sessionStorage.getItem(PENDING_CONNECT_TOKEN_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ConnectTokenDomPayload;
    if (!(parsed.token && parsed.apiUrl && parsed.shop)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingConnectToken() {
  if (typeof sessionStorage === "undefined") {
    return;
  }

  sessionStorage.removeItem(PENDING_CONNECT_TOKEN_KEY);
}
