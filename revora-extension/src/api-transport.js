import { DEFAULT_DEV_URL } from "./config.js";
import { decodePairingCode, encodePairingCode } from "./pairing.js";

export async function readConnectionState() {
  const stored = await chrome.storage.sync.get([
    "pairingToken",
    "pairingCode",
    "apiBaseUrl",
    "stableDevUrl",
    "shop",
    "plan",
    "planName",
  ]);

  let pairingToken = stored.pairingToken || "";

  if (!pairingToken && stored.pairingCode) {
    pairingToken = decodePairingCode(stored.pairingCode).pairingToken || "";

    if (pairingToken) {
      await chrome.storage.sync.set({ pairingToken });
    }
  }

  return {
    ...stored,
    pairingToken,
    apiBaseUrl: (
      stored.stableDevUrl ||
      stored.apiBaseUrl ||
      DEFAULT_DEV_URL
    ).replace(/\/$/, ""),
  };
}

export function enrichConnection(data, stored) {
  return {
    ...data,
    shop: data.shop || stored.shop,
    plan: data.plan || stored.plan,
    planName: data.planName || stored.planName,
    paired: data.paired ?? Boolean(stored.pairingToken),
  };
}

function ngrokHeaders(apiBaseUrl) {
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

function isNetworkError(error) {
  return (
    error instanceof TypeError ||
    (error instanceof Error && /failed to fetch/i.test(error.message))
  );
}

async function requireHostPermission(apiBaseUrl) {
  const origin = `${new URL(apiBaseUrl).origin}/*`;
  const hasPermission = await chrome.permissions.contains({
    origins: [origin],
  });

  if (hasPermission) {
    return;
  }

  const granted = await chrome.permissions.request({ origins: [origin] });

  if (!granted) {
    throw new Error(
      `Allow Chrome access to ${new URL(apiBaseUrl).origin} when prompted.`,
    );
  }
}

async function ensureAdminBridgeOnTab(tabId) {
  try {
    const pong = await chrome.tabs.sendMessage(tabId, { type: "REVORA_PING" });
    if (pong?.ok) {
      return true;
    }
  } catch {
    // Content script not ready yet.
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["src/admin-bridge.js"],
    });
    await new Promise((resolve) => setTimeout(resolve, 150));
    return true;
  } catch {
    return false;
  }
}

async function requestViaAdminProxy({ path, method = "GET", body, headers = {} }) {
  const tabs = await chrome.tabs.query({
    url: "https://admin.shopify.com/*",
  });

  for (const tab of tabs) {
    if (!tab.id) {
      continue;
    }

    await ensureAdminBridgeOnTab(tab.id);

    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "REVORA_ADMIN_PROXY",
        path,
        method,
        body,
        headers,
      });

      if (response?.ok) {
        return { ok: true, data: response.data };
      }

      if (response && response.ok === false && !response.unavailable) {
        return {
          ok: false,
          error: response.error || "Request failed",
        };
      }
    } catch {
      // Content script not available on this tab yet.
    }
  }

  return { ok: false, unavailable: true };
}

async function directApiRequest(apiBaseUrl, path, init = {}) {
  await requireHostPermission(apiBaseUrl);

  const headers = {
    ...ngrokHeaders(apiBaseUrl),
    ...(init.headers || {}),
  };

  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers });
  const contentType = response.headers.get("content-type") || "";
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  if (
    !contentType.includes("application/json") &&
    Object.keys(data).length === 0
  ) {
    throw new TypeError("Failed to fetch");
  }

  return data;
}

export async function persistApiBaseUrl(apiBaseUrl) {
  if (!apiBaseUrl) {
    return "";
  }

  const normalized = apiBaseUrl.replace(/\/$/, "");
  const stored = await readConnectionState();
  const updates = { apiBaseUrl: normalized, stableDevUrl: normalized };

  if (stored.pairingToken) {
    updates.pairingToken = stored.pairingToken;
    updates.pairingCode = encodePairingCode({
      apiUrl: normalized,
      token: stored.pairingToken,
    });
  }

  await chrome.storage.sync.set(updates);
  await requireHostPermission(normalized);

  return normalized;
}

export async function persistConnection(data) {
  const apiBaseUrl = data.apiUrl || (await readConnectionState()).apiBaseUrl;

  await persistApiBaseUrl(apiBaseUrl);

  await chrome.storage.sync.set({
    pairingToken: data.token,
    pairingCode: encodePairingCode({
      apiUrl: apiBaseUrl,
      token: data.token,
    }),
    shop: data.shop,
    plan: data.plan,
    planName: data.planName,
  });
}

export async function fetchRevora(path, { method = "GET", body, auth = true } = {}) {
  const stored = await readConnectionState();
  const headers = {};

  if (auth) {
    if (!stored.pairingToken) {
      throw new Error("Connect the extension from the popup first.");
    }

    headers.Authorization = `Bearer ${stored.pairingToken}`;
  }

  if (body != null) {
    headers["Content-Type"] = "application/json";
  }

  const init = {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  };

  const apiBaseUrl = stored.apiBaseUrl || DEFAULT_DEV_URL;

  if (apiBaseUrl) {
    try {
      const data = await directApiRequest(apiBaseUrl, path, init);

      if (data.apiUrl && data.apiUrl.replace(/\/$/, "") !== apiBaseUrl) {
        await persistApiBaseUrl(data.apiUrl);
      }

      return data;
    } catch (error) {
      if (!isNetworkError(error)) {
        throw error;
      }
    }
  }

  const proxyResult = await requestViaAdminProxy({
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
      : "Open Revora in Shopify admin, or connect from the extension popup.",
  );
}
