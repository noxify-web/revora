import type { ConnectTokenDomPayload } from "@revora/shared/bridge-dom";
import {
  adminFetchNoBounce,
  adminFetchUntilSession,
  readAdminJson,
  runWithoutSessionBounce,
} from "@/lib/admin-fetch";

import {
  EXTENSION_STATUS_FAST_TIMEOUT_MS,
  type ExtensionClientStatus,
  isExtensionLinked,
  queryExtensionClientStatus,
} from "./client-status";
import { clearPendingConnectToken } from "./pending-connect-token";

export const EXTENSION_TOKEN_USAGE_POLL_ATTEMPTS = 20;
export const EXTENSION_TOKEN_USAGE_POLL_DELAY_MS = 250;

export const EXTENSION_PAIRING_SYNC_FALLBACK_MESSAGE =
  "Could not confirm the extension connected. Keep this Revora tab open and click Connect again.";

export const EXTENSION_SESSION_NOT_READY_MESSAGE =
  "Shopify session is still loading. Wait a moment, then click Connect again.";

export interface ExtensionTokenRecord {
  createdAt: string;
  id: string;
  label: string;
  lastUsedAt: string | null;
}

/** Fast status read for dashboard/banner checks (no session retry loop). */
export async function fetchExtensionTokensFast(): Promise<
  ExtensionTokenRecord[]
> {
  try {
    const response = await adminFetchNoBounce("/api/extension/token");

    if (!response?.ok) {
      return [];
    }

    const data = await readAdminJson<{ tokens?: ExtensionTokenRecord[] }>(
      response
    );

    return data.tokens ?? [];
  } catch {
    return [];
  }
}

export async function fetchExtensionTokens(
  sessionToken?: string | null
): Promise<ExtensionTokenRecord[]> {
  try {
    const response = sessionToken
      ? await adminFetchNoBounce(
          "/api/extension/token",
          undefined,
          sessionToken
        )
      : await adminFetchUntilSession("/api/extension/token", undefined, {
          attempts: 8,
          delayMs: 250,
        });

    if (!response?.ok) {
      return [];
    }

    const data = await readAdminJson<{ tokens?: ExtensionTokenRecord[] }>(
      response
    );

    return data.tokens ?? [];
  } catch {
    return [];
  }
}

export function newestTokenHasBeenUsed(
  tokens: ExtensionTokenRecord[]
): boolean {
  return Boolean(tokens[0]?.lastUsedAt);
}

export async function waitForExtensionTokenUsage(
  options: {
    attempts?: number;
    delayMs?: number;
    sessionToken?: string | null;
  } = {}
): Promise<boolean> {
  const {
    attempts = EXTENSION_TOKEN_USAGE_POLL_ATTEMPTS,
    delayMs = EXTENSION_TOKEN_USAGE_POLL_DELAY_MS,
    sessionToken,
  } = options;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const tokens = await fetchExtensionTokens(sessionToken);

    if (newestTokenHasBeenUsed(tokens)) {
      return true;
    }

    if (attempt < attempts - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }
  }

  return false;
}

export type PairingConfirmVia = "bridge" | "none" | "server";

export async function confirmExtensionPairingAfterBroadcast(
  sessionToken?: string | null
): Promise<{
  linked: boolean;
  status: ExtensionClientStatus;
  via: PairingConfirmVia;
}> {
  const bridgeStatus = await queryExtensionClientStatus({
    timeoutMs: EXTENSION_STATUS_FAST_TIMEOUT_MS,
  });

  if (isExtensionLinked(bridgeStatus)) {
    clearPendingConnectToken();
    return { linked: true, via: "bridge", status: bridgeStatus };
  }

  const used = await waitForExtensionTokenUsage({ sessionToken });

  if (used) {
    clearPendingConnectToken();
    return {
      linked: true,
      via: "server",
      status: {
        installed: true,
        paired: true,
        verified: true,
        shop: bridgeStatus.shop,
      },
    };
  }

  return { linked: false, via: "none", status: bridgeStatus };
}

export function mintAndBroadcastConnectToken(
  broadcast: (payload: ConnectTokenDomPayload) => void
): Promise<ConnectTokenDomPayload> {
  return runWithoutSessionBounce(async () => {
    const response = await adminFetchUntilSession("/api/extension/token", {
      method: "POST",
      body: JSON.stringify({ label: "Chrome extension" }),
    });

    const data = await readAdminJson<
      ConnectTokenDomPayload & { error?: string }
    >(response);

    if (!response.ok) {
      throw new Error(data.error || "Failed to connect extension");
    }

    const payload = {
      token: data.token,
      apiUrl: data.apiUrl,
      shop: data.shop,
    };

    broadcast(payload);

    const { linked } = await confirmExtensionPairingAfterBroadcast();

    if (!linked) {
      throw new Error(EXTENSION_PAIRING_SYNC_FALLBACK_MESSAGE);
    }

    return payload;
  });
}
