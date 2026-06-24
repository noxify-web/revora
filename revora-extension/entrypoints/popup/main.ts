import type {
  BackgroundDirectConnectResponse,
  BackgroundPlanResponse,
  BackgroundResponse,
} from "@revora/shared/extension-messages";
import type { ConnectTokenResponse } from "@revora/shared/extension-types";
import { resolveConnectPayloadFromAdmin } from "../../lib/admin-tabs";
import { revoraBrandLogoMarkup } from "../../lib/brand";
import { statusIconForTone } from "../../lib/icons";
import { injectRevoraRootTheme } from "../../lib/inject-theme";

injectRevoraRootTheme();

const popupBrandMark = document.querySelector(".popup-brand-mark");
if (popupBrandMark) {
  popupBrandMark.innerHTML = revoraBrandLogoMarkup("popup-brand-mark-img", 32);
}

const syncBtn = document.getElementById("sync-btn") as HTMLButtonElement;
const syncBtnLabel = document.getElementById(
  "sync-btn-label"
) as HTMLSpanElement;
const disconnectBtn = document.getElementById(
  "disconnect-btn"
) as HTMLButtonElement;
const disconnectBtnLabel = document.getElementById(
  "disconnect-btn-label"
) as HTMLSpanElement;
const statusNode = document.getElementById("status") as HTMLParagraphElement;
const statusIcon = document.getElementById("status-icon") as HTMLSpanElement;
const statusHint = document.getElementById("status-hint") as HTMLDivElement;
const syncActions = document.getElementById("sync-actions") as HTMLDivElement;
const connectedActions = document.getElementById(
  "connected-actions"
) as HTMLDivElement;
type StatusTone = "" | "ok" | "error" | "pending";

function setStatus(text: string, tone: StatusTone = "") {
  statusNode.textContent = text;
  statusIcon.innerHTML = statusIconForTone(tone);
}

function setSyncing(syncing: boolean) {
  syncBtn.disabled = syncing;
  syncBtnLabel.textContent = syncing ? "Syncing..." : "Sync from admin";
}

function setDisconnecting(disconnecting: boolean) {
  disconnectBtn.disabled = disconnecting;
  disconnectBtnLabel.textContent = disconnecting
    ? "Disconnecting..."
    : "Disconnect";
}

function formatShopLabel(shop: string) {
  return shop.replace(/\.myshopify\.com$/i, "");
}

function setConnected(shop: string) {
  setStatus(`Connected · ${formatShopLabel(shop)}`, "ok");
  statusHint.hidden = true;
  syncActions.hidden = true;
  connectedActions.hidden = false;
}

function setDisconnected() {
  setStatus("Not connected", "");
  statusHint.hidden = false;
  syncActions.hidden = false;
  connectedActions.hidden = true;
}

function applyConnection(data: ConnectTokenResponse) {
  setConnected(data.shop);
}

const SYNC_FROM_ADMIN_TIMEOUT_MS = 15_000;

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

async function syncFromAdmin() {
  const payload = await withTimeout(
    resolveConnectPayloadFromAdmin(),
    SYNC_FROM_ADMIN_TIMEOUT_MS,
    "Sync timed out. Hard-refresh Revora in Shopify admin, then try again."
  );

  if (!(payload?.token && payload.apiUrl && payload.shop)) {
    return false;
  }

  const response = (await chrome.runtime.sendMessage({
    type: "REVORA_CONNECT_DIRECT",
    token: payload.token,
    apiUrl: payload.apiUrl,
    shop: payload.shop,
  })) as BackgroundDirectConnectResponse;

  if (!(response?.ok && response.data)) {
    const message =
      response && "error" in response ? response.error : "Sync failed";
    throw new Error(message || "Sync failed");
  }

  applyConnection(response.data);
  return true;
}

async function handleSync() {
  setSyncing(true);
  setStatus("Syncing with Revora admin...", "pending");

  try {
    const synced = await syncFromAdmin();

    if (!synced) {
      setStatus(
        "Open Revora in Shopify admin and click Connect, then try again.",
        "error"
      );
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Sync failed", "error");
  } finally {
    setSyncing(false);
  }
}

async function handleDisconnect() {
  setDisconnecting(true);

  try {
    const response = (await chrome.runtime.sendMessage({
      type: "REVORA_DISCONNECT",
    })) as BackgroundResponse;

    if (!response?.ok) {
      const message =
        response && "error" in response ? response.error : "Disconnect failed";
      throw new Error(message || "Disconnect failed");
    }

    setDisconnected();
  } catch (error) {
    setStatus(
      error instanceof Error ? error.message : "Disconnect failed",
      "error"
    );
  } finally {
    setDisconnecting(false);
  }
}

syncBtn.addEventListener("click", () => {
  void handleSync();
});

disconnectBtn.addEventListener("click", () => {
  void handleDisconnect();
});

async function loadSettings() {
  const stored = await chrome.storage.sync.get(["shop", "pairingToken"]);

  if (stored.shop) {
    setConnected(stored.shop as string);
    return;
  }

  if (stored.pairingToken) {
    try {
      const planResponse = (await chrome.runtime.sendMessage({
        type: "REVORA_GET_PLAN",
      })) as BackgroundPlanResponse;

      if (planResponse?.ok && planResponse.data?.shop) {
        setConnected(planResponse.data.shop);
        return;
      }
    } catch {
      // Background may not be ready yet.
    }
  }

  setDisconnected();
}

void loadSettings();
