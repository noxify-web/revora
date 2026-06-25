import {
  EXTENSION_STATUS_FAST_TIMEOUT_MS,
  type ExtensionClientStatus,
  isExtensionLinked,
  queryExtensionClientStatus,
} from "./client-status";
import { fetchExtensionTokensFast, newestTokenPaired } from "./pairing-confirm";

const EMPTY_STATUS: ExtensionClientStatus = {
  installed: false,
  paired: false,
  verified: false,
  shop: null,
};

const TOKEN_STATUS_CACHE_MS = 15_000;

let cachedTokenStatus: {
  at: number;
  tokens: Awaited<ReturnType<typeof fetchExtensionTokensFast>>;
} | null = null;

function isExtensionMarkedInstalledInDom() {
  return document.documentElement.dataset.revoraExtensionInstalled === "1";
}

function extensionAppearsInstalled(status: ExtensionClientStatus) {
  return status.installed || isExtensionMarkedInstalledInDom();
}

let inflightFastCheck: Promise<{
  linked: boolean;
  status: ExtensionClientStatus;
}> | null = null;

/** Connected when the newest extension token has been verified (pairedAt set). */
export function isExtensionConnectedOnServer(
  tokens: Awaited<ReturnType<typeof fetchExtensionTokensFast>>
) {
  return newestTokenPaired(tokens);
}

async function readCachedExtensionTokens() {
  if (
    cachedTokenStatus &&
    Date.now() - cachedTokenStatus.at < TOKEN_STATUS_CACHE_MS
  ) {
    return cachedTokenStatus.tokens;
  }

  const tokens = await fetchExtensionTokensFast();
  cachedTokenStatus = { tokens, at: Date.now() };
  return tokens;
}

export function invalidateExtensionLinkStateCache() {
  cachedTokenStatus = null;
  inflightFastCheck = null;
}

async function resolveExtensionLinkStateFast(): Promise<{
  linked: boolean;
  status: ExtensionClientStatus;
}> {
  const tokens = await readCachedExtensionTokens();

  if (isExtensionConnectedOnServer(tokens)) {
    // Server says paired — but the extension may have disconnected without
    // successfully revoking the token (network failure, tunnel down, etc.).
    // Probe the extension: if it responds and says not-paired, the server
    // state is stale. If it doesn't respond (not installed), trust the server.
    const status = await queryExtensionClientStatus({
      timeoutMs: EXTENSION_STATUS_FAST_TIMEOUT_MS,
    });

    if (status.installed && !isExtensionLinked(status)) {
      return { linked: false, status };
    }

    return {
      linked: true,
      status: {
        installed: extensionAppearsInstalled(status),
        paired: true,
        verified: true,
        shop: null,
      },
    };
  }

  const status = await queryExtensionClientStatus({
    timeoutMs: EXTENSION_STATUS_FAST_TIMEOUT_MS,
  });

  if (isExtensionLinked(status)) {
    return { linked: true, status };
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
