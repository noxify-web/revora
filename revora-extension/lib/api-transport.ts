import { STALE_THRESHOLD_MS, STORAGE_KEYS } from "@revora/shared/constants";
import type {
  ConnectionState,
  ConnectTokenResponse,
  EnrichedConnection,
  ExtensionConnectPayload,
} from "@revora/shared/extension-types";
import { normalizeApiUrl } from "@revora/shared/extension-types";
import { clearAdminPairingState } from "./admin-tabs";

interface StoredConnection {
  apiBaseUrl?: string;
  pairingToken?: string;
  shop?: string;
}

function normalizeApiBaseUrl(url: string | undefined | null) {
  return url ? normalizeApiUrl(url) : "";
}

export async function readConnectionState(): Promise<ConnectionState> {
  const stored = (await chrome.storage.sync.get([
    STORAGE_KEYS.PAIRING_TOKEN,
    STORAGE_KEYS.API_BASE_URL,
    STORAGE_KEYS.SHOP,
  ])) as StoredConnection;

  return {
    pairingToken: stored.pairingToken || "",
    apiBaseUrl: normalizeApiBaseUrl(stored.apiBaseUrl),
    shop: stored.shop,
  };
}

export function enrichConnection(
  data: Partial<EnrichedConnection>,
  stored: ConnectionState
): EnrichedConnection {
  return {
    ...stored,
    ...data,
    pairingToken: stored.pairingToken,
    apiBaseUrl: stored.apiBaseUrl,
    shop: data.shop || stored.shop,
    paired: data.paired ?? Boolean(stored.pairingToken),
  };
}

/** Unix-ms timestamp of the last successful /verify, or 0 if never. */
export async function readLastVerifiedAt(): Promise<number> {
  const result = await chrome.storage.sync.get([STORAGE_KEYS.LAST_VERIFIED_AT]);
  const raw = result[STORAGE_KEYS.LAST_VERIFIED_AT];
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/** Stamp that the connection was just verified server-side. */
export async function markVerified(): Promise<void> {
  await chrome.storage.sync.set({
    [STORAGE_KEYS.LAST_VERIFIED_AT]: Date.now(),
  });
}

/** True when the local verify state is stale enough to warrant a network check. */
export async function isLocalVerifyStale(): Promise<boolean> {
  const last = await readLastVerifiedAt();
  return last === 0 || Date.now() - last > STALE_THRESHOLD_MS;
}

function ngrokHeaders(apiBaseUrl: string): Record<string, string> {
  try {
    const host = new URL(apiBaseUrl).hostname;

    if (
      host.endsWith(".ngrok-free.dev") ||
      host.endsWith(".ngrok-free.app") ||
      host.endsWith(".ngrok.io") ||
      host.endsWith(".ngrok.app")
    ) {
      return { "ngrok-skip-browser-warning": "1" };
    }
  } catch {
    // Ignore malformed URLs.
  }

  return {};
}

function isNetworkError(error: unknown) {
  return (
    error instanceof TypeError ||
    (error instanceof Error && /failed to fetch/i.test(error.message))
  );
}

async function ensureHostPermission(
  apiBaseUrl: string,
  { requestPermission = true }: { requestPermission?: boolean } = {}
) {
  const origin = `${new URL(apiBaseUrl).origin}/*`;
  const hasPermission = await chrome.permissions.contains({
    origins: [origin],
  });

  if (hasPermission) {
    return;
  }

  if (!requestPermission) {
    throw new TypeError("Failed to fetch");
  }

  const granted = await chrome.permissions.request({ origins: [origin] });

  if (!granted) {
    throw new Error(
      `Allow Chrome access to ${new URL(apiBaseUrl).origin} when prompted.`
    );
  }
}

async function directApiRequest<T>(
  apiBaseUrl: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  await ensureHostPermission(apiBaseUrl, { requestPermission: false });

  const headers = {
    ...ngrokHeaders(apiBaseUrl),
    ...(init.headers as Record<string, string> | undefined),
  };

  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  const data = (await response.json().catch(() => ({}))) as T & {
    apiUrl?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

export async function persistApiBaseUrl(
  apiBaseUrl: string,
  { requestPermission = true }: { requestPermission?: boolean } = {}
) {
  if (!apiBaseUrl) {
    return "";
  }

  const normalized = normalizeApiBaseUrl(apiBaseUrl);

  await chrome.storage.sync.set({
    [STORAGE_KEYS.API_BASE_URL]: normalized,
  });

  try {
    await ensureHostPermission(normalized, { requestPermission });
  } catch (error) {
    if (requestPermission) {
      throw error;
    }
  }

  return normalized;
}

export async function verifyConnectionPayload(
  data: Pick<ConnectTokenResponse, "token" | "apiUrl" | "shop">
) {
  const apiBaseUrl = normalizeApiBaseUrl(data.apiUrl);

  if (!apiBaseUrl) {
    throw new Error("Missing Revora server URL");
  }

  const verified = await directApiRequest<{
    expiresAt?: string | null;
    paired: boolean;
    shop: string;
  }>(apiBaseUrl, "/api/extension/verify", {
    headers: { Authorization: `Bearer ${data.token}` },
  });

  if (!verified.paired || verified.shop !== data.shop) {
    throw new Error("Extension token verification failed");
  }

  return verified;
}

export async function verifyAndPersistConnection(
  data: ExtensionConnectPayload | ConnectTokenResponse
) {
  await verifyConnectionPayload(data);
  await markVerified();
  await persistConnection(data);

  // Notify the admin app that pairing succeeded so it can resolve its
  // confirmation promise without polling. Awaited (not fire-and-forget) so the
  // MV3 service worker stays alive long enough to dispatch the cross-process
  // message to the content scripts — otherwise the SW can terminate before
  // delivery and the app falls back to the (slower) server check.
  await broadcastPairingConfirmed(data.shop);
}

export async function clearConnection() {
  try {
    const stored = await readConnectionState();

    if (stored.pairingToken && stored.apiBaseUrl) {
      await fetchRevora("/api/extension/disconnect", { method: "POST" });
    }
  } catch {
    // Best-effort server revoke.
  }

  await clearAdminPairingState();
  await chrome.storage.sync.remove([
    STORAGE_KEYS.PAIRING_TOKEN,
    STORAGE_KEYS.SHOP,
    STORAGE_KEYS.LAST_VERIFIED_AT,
  ]);
  await chrome.storage.sync.set({ [STORAGE_KEYS.USER_DISCONNECTED]: true });
}

export async function persistConnection(
  data: ExtensionConnectPayload | ConnectTokenResponse
) {
  const apiBaseUrl =
    normalizeApiBaseUrl(data.apiUrl) ||
    (await readConnectionState()).apiBaseUrl;

  if (apiBaseUrl) {
    await persistApiBaseUrl(apiBaseUrl, { requestPermission: false });
  }

  await chrome.storage.sync.set({
    [STORAGE_KEYS.PAIRING_TOKEN]: data.token,
    [STORAGE_KEYS.SHOP]: data.shop,
    [STORAGE_KEYS.USER_DISCONNECTED]: false,
  });
}

export async function fetchRevora<T>(
  path: string,
  {
    method = "GET",
    body,
    auth = true,
  }: {
    method?: string;
    body?: unknown;
    auth?: boolean;
  } = {}
): Promise<T> {
  const stored = await readConnectionState();
  const headers: Record<string, string> = {};

  if (auth) {
    if (!stored.pairingToken) {
      throw new Error("Connect the extension from the popup first.");
    }

    headers.Authorization = `Bearer ${stored.pairingToken}`;
  }

  if (body != null) {
    headers["Content-Type"] = "application/json";
  }

  const init: RequestInit = {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  };

  const apiBaseUrl = stored.apiBaseUrl;

  if (!apiBaseUrl) {
    throw new Error(
      "Open Revora in Shopify admin, or connect from the extension popup."
    );
  }

  try {
    const data = await directApiRequest<T & { apiUrl?: string }>(
      apiBaseUrl,
      path,
      init
    );

    // Self-heal: if the server advertises a different canonical URL, adopt it.
    if (data.apiUrl && normalizeApiBaseUrl(data.apiUrl) !== apiBaseUrl) {
      await persistApiBaseUrl(data.apiUrl, { requestPermission: false });
    }

    return data;
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error(
        `Cannot reach Revora at ${apiBaseUrl}. Re-connect from the Shopify admin.`
      );
    }

    throw error;
  }
}

/**
 * Broadcast `REVORA_PAIRING_CONFIRMED` to all extension content scripts (via
 * runtime message). Content scripts forward it to the embedded app via
 * `window.postMessage` with a pinned origin so the app resolves its pairing
 * promise immediately — zero polling. Returns a promise that resolves once
 * dispatch is complete (the SW must stay alive to deliver the IPC).
 */
function broadcastPairingConfirmed(shop: string): Promise<void> {
  const message = { type: "REVORA_PAIRING_CONFIRMED" as const, shop };

  // Listeners return false (no response) — the promise resolves with undefined
  // or rejects with "no receiver"; either is fine, we only care that the
  // message was dispatched.
  return chrome.runtime
    .sendMessage(message)
    .then(() => undefined)
    .catch(() => undefined);
}
