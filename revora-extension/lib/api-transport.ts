import type {
  ConnectionState,
  ConnectTokenResponse,
  EnrichedConnection,
  ExtensionConnectPayload,
} from "@revora/shared/extension-types";
import {
  decodePairingCode,
  encodePairingCode,
} from "@revora/shared/pairing-code";
import {
  clearAdminPairingState,
  readApiBaseUrlFromAdmin,
  sendAdminBridgeMessage,
} from "./admin-tabs";

interface StoredConnection {
  apiBaseUrl?: string;
  pairingCode?: string;
  pairingToken?: string;
  shop?: string;
}

function normalizeApiBaseUrl(url: string | undefined | null) {
  return url?.replace(/\/$/, "") || "";
}

export async function readConnectionState(): Promise<ConnectionState> {
  const stored = (await chrome.storage.sync.get([
    "pairingToken",
    "pairingCode",
    "apiBaseUrl",
    "shop",
  ])) as StoredConnection;

  let pairingToken = stored.pairingToken || "";

  if (!pairingToken && stored.pairingCode) {
    pairingToken = decodePairingCode(stored.pairingCode).pairingToken || "";

    if (pairingToken) {
      await chrome.storage.sync.set({ pairingToken });
    }
  }

  const storedUrl = normalizeApiBaseUrl(stored.apiBaseUrl);
  const adminUrl = storedUrl ? null : await readApiBaseUrlFromAdmin();

  return {
    pairingToken,
    pairingCode: stored.pairingCode,
    apiBaseUrl: storedUrl || adminUrl || "",
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

type ProxyResult<T> =
  | { ok: true; data: T }
  | { ok: false; error?: string; unavailable?: boolean };

async function requestViaAdminProxy<T>({
  path,
  method = "GET",
  body,
  headers = {},
}: {
  path: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}): Promise<ProxyResult<T>> {
  const response = await sendAdminBridgeMessage<{
    ok: boolean;
    data?: T;
    error?: string;
    unavailable?: boolean;
  }>({
    type: "REVORA_ADMIN_PROXY",
    path,
    method,
    body,
    headers,
  });

  if (!response) {
    return { ok: false, unavailable: true };
  }

  if (response.ok) {
    return { ok: true, data: response.data as T };
  }

  if (!response.unavailable) {
    return {
      ok: false,
      error: response.error || "Request failed",
    };
  }

  return { ok: false, unavailable: true };
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
  const contentType = response.headers.get("content-type") || "";
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
    apiUrl?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  if (
    !contentType.includes("application/json") &&
    Object.keys(data as object).length === 0
  ) {
    throw new TypeError("Failed to fetch");
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
  const stored = await readConnectionState();
  const updates: StoredConnection & { pairingCode?: string } = {
    apiBaseUrl: normalized,
  };

  if (stored.pairingToken) {
    updates.pairingToken = stored.pairingToken;
    updates.pairingCode = encodePairingCode({
      apiUrl: normalized,
      token: stored.pairingToken,
    });
  }

  await chrome.storage.sync.set(updates);

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

  const verifyHeaders = {
    Authorization: `Bearer ${data.token}`,
  };

  let verified: { shop: string; paired: boolean } | null = null;

  try {
    verified = await directApiRequest<{ shop: string; paired: boolean }>(
      apiBaseUrl,
      "/api/extension/verify",
      {
        headers: verifyHeaders,
      }
    );
  } catch (error) {
    if (!isNetworkError(error)) {
      throw error;
    }
  }

  if (!verified) {
    const proxyResult = await requestViaAdminProxy<{
      shop: string;
      paired: boolean;
    }>({
      path: "/api/extension/verify",
      headers: verifyHeaders,
    });

    if (!proxyResult.ok) {
      throw new Error(
        proxyResult.error || "Extension token verification failed"
      );
    }

    verified = proxyResult.data;
  }

  if (!verified.paired || verified.shop !== data.shop) {
    throw new Error("Extension token verification failed");
  }

  return verified;
}

export async function verifyAndPersistConnection(
  data: ExtensionConnectPayload | ConnectTokenResponse
) {
  await verifyConnectionPayload(data);
  await persistConnection(data);
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
  await chrome.storage.sync.remove(["pairingToken", "pairingCode", "shop"]);
  await chrome.storage.sync.set({ userDisconnected: true });
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
    pairingToken: data.token,
    pairingCode: encodePairingCode({
      apiUrl: apiBaseUrl,
      token: data.token,
    }),
    shop: data.shop,
    userDisconnected: false,
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

  if (apiBaseUrl) {
    try {
      const data = await directApiRequest<T & { apiUrl?: string }>(
        apiBaseUrl,
        path,
        init
      );

      if (data.apiUrl && normalizeApiBaseUrl(data.apiUrl) !== apiBaseUrl) {
        await persistApiBaseUrl(data.apiUrl, { requestPermission: false });
      }

      return data;
    } catch (error) {
      if (!isNetworkError(error)) {
        throw error;
      }
    }
  }

  const proxyResult = await requestViaAdminProxy<T>({
    path,
    method,
    body,
    headers,
  });

  if (proxyResult.ok) {
    return proxyResult.data;
  }

  if (proxyResult.error) {
    throw new Error(proxyResult.error);
  }

  throw new Error(
    apiBaseUrl
      ? `Cannot reach Revora at ${apiBaseUrl}. Check that shopify app dev is running.`
      : "Open Revora in Shopify admin, or connect from the extension popup."
  );
}

export async function resolveApiBaseUrlForConnect(): Promise<string | null> {
  const stored = await readConnectionState();
  if (stored.apiBaseUrl) {
    return stored.apiBaseUrl;
  }

  return readApiBaseUrlFromAdmin();
}
