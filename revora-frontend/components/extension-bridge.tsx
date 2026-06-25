"use client";

import { ADMIN_SHOPIFY_ORIGIN } from "@revora/shared/constants";
import type {
  ConnectTokenBroadcast,
  ConnectTokenRequest,
  PairingConfirmedMessage,
  RevoraClearConnectTokenMessage,
} from "@revora/shared/extension-messages";
import {
  clearConnectTokenSchema,
  connectTokenRequestSchema,
} from "@revora/shared/extension-schemas";
import {
  normalizeApiUrl,
  type PendingConnectToken,
} from "@revora/shared/extension-types";
import { useEffect } from "react";
import {
  captureIdTokenFromUrl,
  stripStaleIdTokenFromUrl,
} from "@/lib/admin-fetch";
import {
  clearPendingConnectToken,
  persistPendingConnectToken,
  readPendingConnectToken,
} from "@/lib/extension/pending-connect-token";

function isTrustedOrigin(origin: string) {
  return origin === window.location.origin || origin === ADMIN_SHOPIFY_ORIGIN;
}

function broadcastConnectToken(payload: PendingConnectToken) {
  persistPendingConnectToken(payload);

  const message = {
    apiUrl: normalizeApiUrl(payload.apiUrl),
    shop: payload.shop,
    token: payload.token,
    type: "REVORA_CONNECT_TOKEN",
  } satisfies ConnectTokenBroadcast;

  // Same-origin: the app-bridge content script (dev tunnels) listens here.
  window.postMessage(message, window.location.origin);

  // Pinned to the Shopify admin parent frame: the admin-bridge content script
  // (production) listens there. Never use "*" — this payload is a bearer token.
  if (window.parent !== window) {
    window.parent.postMessage(message, ADMIN_SHOPIFY_ORIGIN);
  }
}

export function ExtensionBridge() {
  useEffect(() => {
    captureIdTokenFromUrl();
    stripStaleIdTokenFromUrl();

    // Re-broadcast on reload so a tab refresh mid-pairing still delivers the token.
    const existingToken = readPendingConnectToken();
    if (existingToken) {
      broadcastConnectToken(existingToken);
    }

    function handleMessage(
      event: MessageEvent<
        | ConnectTokenRequest
        | RevoraClearConnectTokenMessage
        | PairingConfirmedMessage
      >
    ) {
      if (!isTrustedOrigin(event.origin)) {
        return;
      }

      const data = event.data;
      if (!data || typeof data.type !== "string") {
        return;
      }

      if (data.type === "REVORA_CLEAR_CONNECT_TOKEN") {
        if (!clearConnectTokenSchema.safeParse(data).success) {
          return;
        }

        clearPendingConnectToken();
        return;
      }

      if (data.type === "REVORA_REQUEST_CONNECT_TOKEN") {
        const parsed = connectTokenRequestSchema.safeParse(data);
        if (!parsed.success) {
          return;
        }

        const payload = readPendingConnectToken();
        const source = event.source as Window | null;

        source?.postMessage(
          {
            apiUrl: payload?.apiUrl || null,
            requestId: parsed.data.requestId,
            shop: payload?.shop || null,
            token: payload?.token || null,
            type: "REVORA_CONNECT_TOKEN_RESPONSE",
          },
          event.origin
        );
        return;
      }

      // REVORA_PAIRING_CONFIRMED is consumed by waitForPairingConfirmedMessage
      // in lib/extension/pairing-confirm.ts (its own transient listener). No
      // action needed here — kept in the union only for type completeness.
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

export { broadcastConnectToken };
