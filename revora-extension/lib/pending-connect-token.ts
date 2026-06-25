import { pendingConnectTokenSchema } from "@revora/shared/extension-schemas";
import type { PendingConnectToken } from "@revora/shared/extension-types";

const PENDING_CONNECT_TOKEN_KEY = "revora-pending-connect-token";

export function readPendingConnectToken(): PendingConnectToken | null {
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

    return {
      token: result.data.token,
      apiUrl: result.data.apiUrl.replace(/\/$/, ""),
      shop: result.data.shop,
    };
  } catch {
    return null;
  }
}
