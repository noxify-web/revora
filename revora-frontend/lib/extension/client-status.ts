import { ADMIN_SHOPIFY_ORIGIN } from "@revora/shared/constants";
import type { ExtensionStatusResponse } from "@revora/shared/extension-messages";
import { extensionStatusResponseSchema } from "@revora/shared/extension-schemas";

export const EXTENSION_STATUS_TIMEOUT_MS = 3000;
export const EXTENSION_STATUS_FAST_TIMEOUT_MS = 1500;

export interface QueryExtensionClientStatusOptions {
  timeoutMs?: number;
}

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
  shop: null,
  verified: false,
};

function isAllowedStatusResponseOrigin(origin: string) {
  return origin === window.location.origin || origin === ADMIN_SHOPIFY_ORIGIN;
}

/**
 * Single-probe postMessage to the extension's content scripts and resolves the
 * first `REVORA_EXTENSION_STATUS_RESPONSE`. No retry loop — callers that need a
 * fresh re-check should invoke this again (e.g. on window focus).
 */
export function queryExtensionClientStatus(
  options: QueryExtensionClientStatusOptions = {}
): Promise<ExtensionClientStatus> {
  if (typeof window === "undefined") {
    return Promise.resolve(EMPTY_STATUS);
  }

  const timeoutMs = options.timeoutMs ?? EXTENSION_STATUS_TIMEOUT_MS;
  const targetOrigins = [ADMIN_SHOPIFY_ORIGIN, window.location.origin];

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

      const parsed = extensionStatusResponseSchema.safeParse(event.data);
      if (!parsed.success || parsed.data.requestId !== requestId) {
        return;
      }

      finish({
        installed: parsed.data.installed,
        paired: parsed.data.paired,
        verified: parsed.data.verified,
        shop: parsed.data.shop,
      });
    }

    const timer = window.setTimeout(() => finish(EMPTY_STATUS), timeoutMs);

    window.addEventListener("message", onResponse);

    const request = {
      type: "REVORA_REQUEST_EXTENSION_STATUS",
      requestId,
    } as const;

    window.postMessage(request, window.location.origin);

    if (
      targetOrigins.includes(ADMIN_SHOPIFY_ORIGIN) &&
      window.parent !== window
    ) {
      window.parent.postMessage(request, ADMIN_SHOPIFY_ORIGIN);
    }
  });
}
