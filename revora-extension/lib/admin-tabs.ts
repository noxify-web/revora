import type { AdminBridgeRequest } from "@revora/shared/extension-messages";
import { withTimeout } from "./extension-context";

const SHOPIFY_ADMIN_URL = "https://admin.shopify.com/*";
const ADMIN_BRIDGE_SCRIPT = "content-scripts/admin-bridge.js";
const ADMIN_BRIDGE_MESSAGE_TIMEOUT_MS = 12_000;

export interface AdminConnectPayload {
  apiUrl: string | null;
  plan: string | null;
  planName: string | null;
  reviewLimit: number | null;
  shop: string | null;
  token: string | null;
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

  if (message.type === "REVORA_GET_CONNECT_TOKEN") {
    const payload = response as AdminConnectPayload;
    return Boolean(payload.token && payload.apiUrl && payload.shop);
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

/** Read the admin-bridge's cached connect token (set when the app broadcasts). */
export function readConnectTokenFromAdmin(): Promise<AdminConnectPayload | null> {
  return sendAdminBridgeMessage<AdminConnectPayload>({
    type: "REVORA_GET_CONNECT_TOKEN",
  });
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

/**
 * Popup "Sync from admin" fallback: picks up the connect token cached by the
 * admin-bridge content script (which received it from the app's broadcast).
 * Returns null if the admin tab isn't open or the app hasn't minted a token
 * yet — in that case the user should click Connect in the Shopify admin.
 */
export async function resolveConnectPayloadFromAdmin(): Promise<AdminConnectPayload | null> {
  const existing = await readConnectTokenFromAdmin();

  if (existing?.token && existing.apiUrl && existing.shop) {
    return existing;
  }

  return null;
}
