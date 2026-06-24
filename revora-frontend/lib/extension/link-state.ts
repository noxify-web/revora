import { adminFetch, readAdminJson } from "@/lib/admin-fetch";

import {
  EXTENSION_STATUS_FAST_TIMEOUT_MS,
  type ExtensionClientStatus,
  isExtensionLinked,
  queryExtensionClientStatus,
} from "./client-status";

const EMPTY_STATUS: ExtensionClientStatus = {
  installed: false,
  paired: false,
  verified: false,
  shop: null,
};

function isExtensionMarkedInstalledInDom() {
  return document.documentElement.dataset.revoraExtensionInstalled === "1";
}

async function hasActiveExtensionToken() {
  try {
    const response = await adminFetch("/api/extension/token");
    const data = await readAdminJson<{ tokens?: unknown[] }>(response);

    return response.ok && (data.tokens?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

function extensionAppearsInstalled(status: ExtensionClientStatus) {
  return status.installed || isExtensionMarkedInstalledInDom();
}

function linkedViaServerToken(
  status: ExtensionClientStatus,
  hasToken: boolean
) {
  return hasToken && extensionAppearsInstalled(status);
}

let inflightFastCheck: Promise<{
  linked: boolean;
  status: ExtensionClientStatus;
}> | null = null;

async function resolveExtensionLinkStateFast(): Promise<{
  linked: boolean;
  status: ExtensionClientStatus;
}> {
  const [status, hasToken] = await Promise.all([
    queryExtensionClientStatus({
      timeoutMs: EXTENSION_STATUS_FAST_TIMEOUT_MS,
    }),
    hasActiveExtensionToken(),
  ]);

  if (isExtensionLinked(status)) {
    return { linked: true, status };
  }

  if (linkedViaServerToken(status, hasToken)) {
    return {
      linked: true,
      status: {
        ...status,
        installed: extensionAppearsInstalled(status),
      },
    };
  }

  return { linked: false, status };
}

export function resolveExtensionLinkState(): Promise<{
  linked: boolean;
  status: ExtensionClientStatus;
}> {
  if (typeof window === "undefined") {
    return Promise.resolve({ linked: false, status: EMPTY_STATUS });
  }

  if (inflightFastCheck) {
    return inflightFastCheck;
  }

  inflightFastCheck = resolveExtensionLinkStateFast().finally(() => {
    inflightFastCheck = null;
  });

  return inflightFastCheck;
}
