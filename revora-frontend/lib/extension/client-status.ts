import type { ExtensionStatusResponse } from "@revora/shared/extension-messages";

const EXTENSION_STATUS_TIMEOUT_MS = 3000;

export interface ExtensionClientStatus {
  installed: boolean;
  paired: boolean;
  shop: string | null;
  verified: boolean;
}

export function queryExtensionClientStatus(): Promise<ExtensionClientStatus> {
  if (typeof window === "undefined") {
    return Promise.resolve({
      installed: false,
      paired: false,
      verified: false,
      shop: null,
    });
  }

  return new Promise((resolve) => {
    const requestId = crypto.randomUUID();

    const finish = (status: ExtensionClientStatus) => {
      window.clearTimeout(timer);
      window.removeEventListener("message", onResponse);
      resolve(status);
    };

    function onResponse(event: MessageEvent<ExtensionStatusResponse>) {
      if (event.origin !== "https://admin.shopify.com") {
        return;
      }

      if (event.data?.type !== "REVORA_EXTENSION_STATUS_RESPONSE") {
        return;
      }

      if (event.data.requestId !== requestId) {
        return;
      }

      finish({
        installed: Boolean(event.data.installed),
        paired: Boolean(event.data.paired),
        verified: Boolean(event.data.verified),
        shop: event.data.shop ?? null,
      });
    }

    const timer = window.setTimeout(() => {
      finish({
        installed: false,
        paired: false,
        verified: false,
        shop: null,
      });
    }, EXTENSION_STATUS_TIMEOUT_MS);

    window.addEventListener("message", onResponse);
    window.parent.postMessage(
      {
        type: "REVORA_REQUEST_EXTENSION_STATUS",
        requestId,
      },
      "https://admin.shopify.com"
    );
  });
}
