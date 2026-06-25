import { pendingConnectTokenSchema } from "@revora/shared/extension-schemas";
import type { PendingConnectToken } from "@revora/shared/extension-types";

const PENDING_CONNECT_TOKEN_KEY = "revora-pending-connect-token";

export function persistPendingConnectToken(payload: PendingConnectToken) {
  if (typeof sessionStorage === "undefined") {
    return;
  }

  sessionStorage.setItem(PENDING_CONNECT_TOKEN_KEY, JSON.stringify(payload));
}

export function readPendingConnectToken(): PendingConnectToken | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }

  const raw = sessionStorage.getItem(PENDING_CONNECT_TOKEN_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    const result = pendingConnectTokenSchema.safeParse(parsed);
    if (!result.success) {
      return null;
    }

    return result.data;
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
