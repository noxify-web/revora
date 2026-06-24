import type { AdminBridgeRequest } from "@revora/shared/extension-messages";
import type { ConnectTokenResponse } from "@revora/shared/extension-types";

const SHOPIFY_ADMIN_URL = "https://admin.shopify.com/*";
const ADMIN_BRIDGE_SCRIPT = "content-scripts/admin-bridge.js";
const ADMIN_BRIDGE_MESSAGE_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => {
      reject(
        new Error("Revora admin request timed out. Refresh the app page.")
      );
    }, timeoutMs);

    promise
      .then((value) => {
        globalThis.clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        globalThis.clearTimeout(timer);
        reject(error);
      });
  });
}

export interface AdminConnectPayload {
  apiUrl: string | null;
  plan: string | null;
  planName: string | null;
  reviewLimit: number | null;
  shop: string | null;
  token: string | null;
}

interface AdminProxyBridgeResponse {
  data?: ConnectTokenResponse;
  error?: string;
  ok?: boolean;
  unavailable?: boolean;
}

export function queryShopifyAdminTabs() {
  return chrome.tabs.query({ url: SHOPIFY_ADMIN_URL });
}

async function ensureAdminBridgeOnTab(tabId: number) {
  try {
    const pong = await chrome.tabs.sendMessage(tabId, {
      type: "REVORA_PING",
    } satisfies AdminBridgeRequest);

    if (pong?.ok) {
      return true;
    }
  } catch {
    // Content script not ready yet.
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [ADMIN_BRIDGE_SCRIPT],
    });
    await new Promise((resolve) => setTimeout(resolve, 150));

    const pong = await chrome.tabs.sendMessage(tabId, {
      type: "REVORA_PING",
    } satisfies AdminBridgeRequest);

    return Boolean(pong?.ok);
  } catch {
    return false;
  }
}

function isRevoraTabResponse(message: AdminBridgeRequest, response: unknown) {
  if (!response || typeof response !== "object") {
    return false;
  }

  if (message.type === "REVORA_GET_API_URL") {
    return Boolean(
      (response as { apiBaseUrl?: string | null }).apiBaseUrl?.trim()
    );
  }

  if (message.type === "REVORA_GET_CONNECT_TOKEN") {
    const payload = response as AdminConnectPayload;
    return Boolean(payload.token && payload.apiUrl && payload.shop);
  }

  if (message.type === "REVORA_ADMIN_PROXY") {
    const payload = response as AdminProxyBridgeResponse;
    if (payload.unavailable) {
      return false;
    }

    return payload.ok === true;
  }

  return true;
}

export async function sendAdminBridgeMessage<T>(
  message: AdminBridgeRequest
): Promise<T | null> {
  const tabs = await queryShopifyAdminTabs();

  for (const tab of tabs) {
    if (!tab.id) {
      continue;
    }

    const ready = await ensureAdminBridgeOnTab(tab.id);
    if (!ready) {
      continue;
    }

    try {
      const response = await withTimeout(
        chrome.tabs.sendMessage(tab.id, message),
        ADMIN_BRIDGE_MESSAGE_TIMEOUT_MS
      );

      if (response != null && isRevoraTabResponse(message, response)) {
        return response as T;
      }
    } catch {
      // Content script not available on this tab yet.
    }
  }

  return null;
}

export async function readApiBaseUrlFromAdmin(): Promise<string | null> {
  const response = await sendAdminBridgeMessage<{ apiBaseUrl: string | null }>({
    type: "REVORA_GET_API_URL",
  });

  return response?.apiBaseUrl?.replace(/\/$/, "") || null;
}

export function readConnectTokenFromAdmin(): Promise<AdminConnectPayload | null> {
  return sendAdminBridgeMessage<AdminConnectPayload>({
    type: "REVORA_GET_CONNECT_TOKEN",
  });
}

export async function createConnectTokenFromAdmin(): Promise<ConnectTokenResponse | null> {
  const response = await sendAdminBridgeMessage<AdminProxyBridgeResponse>({
    type: "REVORA_ADMIN_PROXY",
    path: "/api/extension/token",
    method: "POST",
    body: { label: "Chrome extension" },
  });

  if (!(response?.ok && response.data?.token)) {
    return null;
  }

  return response.data;
}

export async function clearAdminPairingState() {
  const tabs = await queryShopifyAdminTabs();

  for (const tab of tabs) {
    if (!tab.id) {
      continue;
    }

    const ready = await ensureAdminBridgeOnTab(tab.id);
    if (!ready) {
      continue;
    }

    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "REVORA_CLEAR_PAIRING",
      } satisfies AdminBridgeRequest);
    } catch {
      // Admin tab may not have the bridge ready.
    }
  }
}

export async function resolveConnectPayloadFromAdmin(): Promise<AdminConnectPayload | null> {
  const existing = await readConnectTokenFromAdmin();

  if (existing?.token && existing.apiUrl && existing.shop) {
    return existing;
  }

  const created = await createConnectTokenFromAdmin();
  if (!(created?.token && created.apiUrl && created.shop)) {
    return null;
  }

  return {
    token: created.token,
    apiUrl: created.apiUrl,
    shop: created.shop,
    plan: created.plan ?? null,
    planName: created.planName ?? null,
    reviewLimit: created.reviewLimit ?? null,
  };
}
