import {
  ADMIN_SHOPIFY_ORIGIN,
  PAIRING_CONFIRMED_TIMEOUT_MS,
} from "@revora/shared/constants";
import { pairingConfirmedSchema } from "@revora/shared/extension-schemas";
import type { PendingConnectToken } from "@revora/shared/extension-types";
import {
  adminFetchNoBounce,
  adminFetchUntilSession,
  readAdminJson,
  runWithoutSessionBounce,
} from "@/lib/admin-fetch";

import { clearPendingConnectToken } from "./pending-connect-token";

/**
 * How long to wait for the `REVORA_PAIRING_CONFIRMED` postMessage before
 * falling back to a single `pairedAt` server check. The event normally arrives
 * within ~1s; this leaves headroom while keeping the fallback snappy.
 */
const PAIRING_CONFIRMED_EVENT_TIMEOUT_MS = 3000;

export const EXTENSION_PAIRING_SYNC_FALLBACK_MESSAGE =
  "Could not confirm the extension connected. Make sure the Revora extension is installed, then click Connect again.";

export const EXTENSION_SESSION_NOT_READY_MESSAGE =
  "Shopify session is still loading. Wait a moment, then click Connect again.";

export interface ExtensionTokenRecord {
  createdAt: string;
  expiresAt: string | null;
  extensionId: string | null;
  id: string;
  label: string;
  lastUsedAt: string | null;
  pairedAt: string | null;
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

/**
 * A token is considered paired once the extension has called /verify with it
 * (server sets `pairedAt`). Replaces the former `lastUsedAt` heuristic — this
 * is an explicit signal, not a side-effect.
 */
export function newestTokenPaired(tokens: ExtensionTokenRecord[]): boolean {
  return Boolean(tokens[0]?.pairedAt);
}

/**
 * Wait for a `REVORA_PAIRING_CONFIRMED` window message from the extension's
 * content scripts (app-bridge same-origin, or admin-bridge via the admin
 * parent frame). Zero polling — the extension posts this immediately after its
 * background service worker verifies the freshly-minted token.
 */
export function waitForPairingConfirmedMessage(
  shop: string,
  timeoutMs: number = PAIRING_CONFIRMED_TIMEOUT_MS
): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const finish = (result: boolean) => {
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(result);
    };

    function onMessage(event: MessageEvent) {
      if (
        event.origin !== window.location.origin &&
        event.origin !== ADMIN_SHOPIFY_ORIGIN
      ) {
        return;
      }

      const parsed = pairingConfirmedSchema.safeParse(event.data);
      if (!parsed.success) {
        return;
      }

      if (parsed.data.shop !== shop) {
        return;
      }

      finish(true);
    }

    const timer = window.setTimeout(() => finish(false), timeoutMs);

    window.addEventListener("message", onMessage);
  });
}

export type PairingConfirmVia = "confirmed" | "server" | "none";

/**
 * Confirm pairing. Primary path: the extension posts
 * `REVORA_PAIRING_CONFIRMED` immediately after its background verifies the
 * token (instant, zero server load). Fallback: if that postMessage is delayed
 * or lost (e.g. content script not yet injected), the verify already set
 * `pairedAt` server-side — a single `GET /api/extension/token` check confirms
 * without the old 20×polling loop.
 */
export async function confirmExtensionPairingAfterBroadcast(
  shop: string
): Promise<{ linked: boolean; via: PairingConfirmVia }> {
  const eventArrived = await waitForPairingConfirmedMessage(
    shop,
    PAIRING_CONFIRMED_EVENT_TIMEOUT_MS
  );

  if (eventArrived) {
    clearPendingConnectToken();
    return { linked: true, via: "confirmed" };
  }

  // Event didn't arrive in time — the verify still set pairedAt server-side,
  // so a single token check confirms the link without polling.
  const tokens = await fetchExtensionTokensFast();

  if (newestTokenPaired(tokens)) {
    clearPendingConnectToken();
    return { linked: true, via: "server" };
  }

  return { linked: false, via: "none" };
}

export function mintAndBroadcastConnectToken(
  broadcast: (payload: PendingConnectToken) => void
): Promise<PendingConnectToken> {
  return runWithoutSessionBounce(async () => {
    const response = await adminFetchUntilSession("/api/extension/token", {
      method: "POST",
      body: JSON.stringify({ label: "Chrome extension" }),
    });

    const data = await readAdminJson<PendingConnectToken & { error?: string }>(
      response
    );

    if (!response.ok) {
      throw new Error(data.error || "Failed to connect extension");
    }

    const payload: PendingConnectToken = {
      token: data.token,
      apiUrl: data.apiUrl,
      shop: data.shop,
    };

    broadcast(payload);

    const { linked } = await confirmExtensionPairingAfterBroadcast(data.shop);

    if (!linked) {
      throw new Error(EXTENSION_PAIRING_SYNC_FALLBACK_MESSAGE);
    }

    return payload;
  });
}
