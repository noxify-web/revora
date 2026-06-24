import type { ExtensionStatusResponse } from "@revora/shared/extension-messages";

export const EXTENSION_STATUS_TIMEOUT_MS = 3000;
export const EXTENSION_STATUS_FAST_TIMEOUT_MS = 800;
export const EXTENSION_PAIRING_WAIT_ATTEMPTS = 20;
export const EXTENSION_PAIRING_WAIT_DELAY_MS = 500;

export interface QueryExtensionClientStatusOptions {
  timeoutMs?: number;
}

const ADMIN_ORIGIN = "https://admin.shopify.com";

export interface ExtensionClientStatus {
  installed: boolean;
  paired: boolean;
  shop: string | null;
  verified: boolean;
}

/** True when the extension is installed and linked to this store. */
export function isExtensionLinked(status: ExtensionClientStatus): boolean {
  return status.verified || (status.installed && status.paired);
}

const EMPTY_STATUS: ExtensionClientStatus = {
  installed: false,
  paired: false,
  verified: false,
  shop: null,
};

function isAllowedStatusResponseOrigin(origin: string) {
  return origin === window.location.origin || origin === ADMIN_ORIGIN;
}

export function queryExtensionClientStatus(
  options: QueryExtensionClientStatusOptions = {}
): Promise<ExtensionClientStatus> {
  if (typeof window === "undefined") {
    return Promise.resolve(EMPTY_STATUS);
  }

  const timeoutMs = options.timeoutMs ?? EXTENSION_STATUS_TIMEOUT_MS;

  return queryExtensionClientStatusViaMessage(
    [ADMIN_ORIGIN, window.location.origin],
    { timeoutMs }
  );
}

function queryExtensionClientStatusViaMessage(
  targetOrigins: string[],
  options: { timeoutMs: number }
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
    }, options.timeoutMs);

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

/** Poll longer after broadcasting a connect token in the embedded admin. */
export function waitForExtensionPairingAfterConnect() {
  return waitForExtensionClientStatus({
    attempts: EXTENSION_PAIRING_WAIT_ATTEMPTS,
    delayMs: EXTENSION_PAIRING_WAIT_DELAY_MS,
    requirePaired: true,
  });
}
