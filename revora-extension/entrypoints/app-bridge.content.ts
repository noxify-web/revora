import { REVORA_DEV_TUNNEL_MATCHES } from "@revora/shared/constants";
import {
  handleBridgeMessageEvent,
  markExtensionInstalledOnPage,
  persistConnectToken,
  readConnectTokenFromDom,
} from "../lib/bridge-connect";
import {
  isExtensionContextValid,
  sendRuntimeMessageSafe,
} from "../lib/extension-context";

function isEmbeddedRevoraApp() {
  const params = new URLSearchParams(window.location.search);
  return params.get("embedded") === "1" && Boolean(params.get("shop")?.trim());
}

function syncConnectTokenFromDom() {
  const payload = readConnectTokenFromDom();
  if (payload) {
    persistConnectToken(payload);
  }
}

export default defineContentScript({
  matches: [...REVORA_DEV_TUNNEL_MATCHES],
  runAt: "document_start",
  main(ctx) {
    if (!isExtensionContextValid()) {
      return;
    }

    markExtensionInstalledOnPage();
    syncConnectTokenFromDom();

    const observer = new MutationObserver(() => {
      if (!isExtensionContextValid()) {
        observer.disconnect();
        return;
      }

      syncConnectTokenFromDom();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        "data-revora-connect-token",
        "data-revora-api-url",
        "data-revora-shop",
      ],
    });

    ctx.onInvalidated(() => {
      observer.disconnect();
    });

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
  },
});
