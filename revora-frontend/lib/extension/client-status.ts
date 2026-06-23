import type { ExtensionStatusResponse } from "@revora/shared/extension-messages";

const EXTENSION_STATUS_TIMEOUT_MS = 3000;
const ADMIN_ORIGIN = "https://admin.shopify.com";

export interface ExtensionClientStatus {
  installed: boolean;
  paired: boolean;
  shop: string | null;
  verified: boolean;
}

const EMPTY_STATUS: ExtensionClientStatus = {
  installed: false,
  paired: false,
  verified: false,
  shop: null,
};

function isExtensionMarkedInstalledInDom() {
  return document.documentElement.dataset.revoraExtensionInstalled === "1";
}

function isAllowedStatusResponseOrigin(origin: string) {
  return origin === window.location.origin || origin === ADMIN_ORIGIN;
}

export function queryExtensionClientStatus(): Promise<ExtensionClientStatus> {
  if (typeof window === "undefined") {
    return Promise.resolve(EMPTY_STATUS);
  }

  if (isExtensionMarkedInstalledInDom()) {
    return queryExtensionClientStatusViaMessage([window.location.origin]);
  }

  return queryExtensionClientStatusViaMessage([
    ADMIN_ORIGIN,
    window.location.origin,
  ]);
}

function queryExtensionClientStatusViaMessage(
  targetOrigins: string[]
): Promise<ExtensionClientStatus> {
  return new Promise((resolve) => {
    const requestId = crypto.randomUUID();

    const finish = (status: ExtensionClientStatus) => {
      window.clearTimeout(timer);
      window.removeEventListener("message", onResponse);
      resolve(status);
    };

    function onResponse(event: MessageEvent<ExtensionStatusResponse>) {
      if (!isAllowedStatusResponseOrigin(event.origin)) {
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
      finish(EMPTY_STATUS);
    }, EXTENSION_STATUS_TIMEOUT_MS);

    window.addEventListener("message", onResponse);

    const request = {
      type: "REVORA_REQUEST_EXTENSION_STATUS",
      requestId,
    } as const;

    window.postMessage(request, window.location.origin);

    if (targetOrigins.includes(ADMIN_ORIGIN)) {
      window.parent.postMessage(request, ADMIN_ORIGIN);
    }
  });
}

export async function waitForExtensionClientStatus(
  options: { attempts?: number; delayMs?: number; requirePaired?: boolean } = {}
): Promise<ExtensionClientStatus> {
  const { attempts = 6, delayMs = 400, requirePaired = false } = options;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const status = await queryExtensionClientStatus();

    if (status.installed && (!requirePaired || status.paired)) {
      return status;
    }

    if (attempt < attempts - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }
  }

  return queryExtensionClientStatus();
}
