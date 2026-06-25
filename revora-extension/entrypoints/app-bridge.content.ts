import { REVORA_DEV_TUNNEL_MATCHES } from "@revora/shared/constants";
import type {
  BackgroundBroadcast,
  BackgroundConnectionStatusResponse,
} from "@revora/shared/extension-messages";
import {
  handleBridgeMessageEvent,
  markExtensionInstalledOnPage,
  persistConnectToken,
  postPairingConfirmed,
} from "../lib/bridge-connect";
import {
  isExtensionContextValid,
  sendRuntimeMessageSafe,
} from "../lib/extension-context";
import { readPendingConnectToken } from "../lib/pending-connect-token";

function isEmbeddedRevoraApp() {
  const params = new URLSearchParams(window.location.search);
  return params.get("embedded") === "1" && Boolean(params.get("shop")?.trim());
}

async function extensionReportsPaired() {
  const response = (await sendRuntimeMessageSafe({
    type: "REVORA_GET_CONNECTION_STATUS",
  })) as BackgroundConnectionStatusResponse | undefined;

  return Boolean(response?.ok && response.data?.paired);
}

/**
 * If the background lost the connection (e.g. extension reinstalled) but a
 * pending token is still in sessionStorage (mid-pairing reload), re-relay it.
 * If the background is already paired, there's nothing to do — no redundant
 * /verify.
 */
async function restorePendingConnectTokenIfNeeded() {
  if (await extensionReportsPaired()) {
    return;
  }

  const pending = readPendingConnectToken();
  if (!pending) {
    return;
  }

  persistConnectToken({
    ...pending,
    plan: null,
    planName: null,
    reviewLimit: null,
  });
}

export default defineContentScript({
  matches: [...REVORA_DEV_TUNNEL_MATCHES],
  runAt: "document_start",
  main(ctx) {
    if (!isExtensionContextValid()) {
      return;
    }

    markExtensionInstalledOnPage();
    void restorePendingConnectTokenIfNeeded();

    if (isEmbeddedRevoraApp()) {
      void sendRuntimeMessageSafe({
        type: "REVORA_SET_API_URL",
        apiBaseUrl: window.location.origin,
      });
    }

    ctx.addEventListener(window, "message", (event: MessageEvent) => {
      handleBridgeMessageEvent(event, {
        acceptOrigin: (origin) => origin === window.location.origin,
        getStatusReplyOrigin: () => window.location.origin,
        getStatusReplyTarget: () => window,
      });
    });

    // Forward the background's pairing-confirmed broadcast to the app
    // (same-origin) so the admin app resolves its confirmation promise.
    chrome.runtime.onMessage.addListener((message) => {
      if (!isExtensionContextValid()) {
        return false;
      }

      if (
        (message as BackgroundBroadcast)?.type === "REVORA_PAIRING_CONFIRMED"
      ) {
        const shop = (message as { shop?: string }).shop;

        if (shop) {
          postPairingConfirmed(window, window.location.origin, shop);
        }
      }

      return false;
    });
  },
});
