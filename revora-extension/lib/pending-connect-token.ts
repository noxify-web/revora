import type { ConnectTokenDomPayload } from "@revora/shared/bridge-dom";
import { normalizeConnectApiUrl } from "@revora/shared/bridge-dom";

const PENDING_CONNECT_TOKEN_KEY = "revora-pending-connect-token";

export function readPendingConnectToken(): ConnectTokenDomPayload | null {
  const raw = sessionStorage.getItem(PENDING_CONNECT_TOKEN_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ConnectTokenDomPayload;
    if (!(parsed.token && parsed.apiUrl && parsed.shop)) {
      return null;
    }

    return {
      token: parsed.token,
      apiUrl: normalizeConnectApiUrl(parsed.apiUrl),
      shop: parsed.shop,
    };
  } catch {
    return null;
  }
}
