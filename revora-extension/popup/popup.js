import { DEFAULT_DEV_URL } from "../src/config.js";
import { encodePairingCode } from "../src/pairing.js";

const connectCodeInput = document.getElementById("connect-code");
const reviewsSelectorInput = document.getElementById("reviews-selector");
const connectBtn = document.getElementById("connect-btn");
const fillAdminBtn = document.getElementById("fill-admin-btn");
const saveBtn = document.getElementById("save-btn");
const planBadge = document.getElementById("plan-badge");
const statusNode = document.getElementById("status");
const serverLabel = document.getElementById("server-label");

function setStatus(text, tone = "") {
  statusNode.textContent = text;
  statusNode.className = `status ${tone}`.trim();
}

function setPlanBadge(planName = "Free") {
  planBadge.textContent = planName;
}

function normalizeCode(code) {
  return code.trim().toUpperCase();
}

function getDevUrl() {
  return DEFAULT_DEV_URL.replace(/\/$/, "");
}

async function requestHostPermission(apiBaseUrl) {
  const origin = `${new URL(apiBaseUrl).origin}/*`;
  const granted = await chrome.permissions.request({ origins: [origin] });

  if (!granted) {
    throw new Error("Chrome blocked access to the Revora server URL");
  }
}

async function ensureDevUrlStored() {
  const devUrl = getDevUrl();

  await chrome.storage.sync.set({
    stableDevUrl: devUrl,
    apiBaseUrl: devUrl,
  });

  try {
    await requestHostPermission(devUrl);
  } catch {
    // Permission may already be granted via manifest host_permissions.
  }

  return devUrl;
}

async function persistConnection({ token, apiBaseUrl, shop, plan, planName }) {
  const devUrl = apiBaseUrl || getDevUrl();

  await requestHostPermission(devUrl);

  await chrome.storage.sync.set({
    pairingToken: token,
    apiBaseUrl: devUrl,
    stableDevUrl: devUrl,
    pairingCode: encodePairingCode({ apiUrl: devUrl, token }),
    shop,
    plan: plan || "free",
    planName: planName || "Free",
    temuAllReviewsSelector: reviewsSelectorInput.value.trim(),
  });

  setPlanBadge(planName || "Free");
}

async function readFromAdmin() {
  const tabs = await chrome.tabs.query({ url: "https://admin.shopify.com/*" });

  for (const tab of tabs) {
    if (!tab.id) continue;

    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "REVORA_GET_CONNECT_CODE",
      });

      if (response?.code) {
        return {
          code: normalizeCode(response.code),
        };
      }
    } catch {
      // Tab may not have the content script yet.
    }
  }

  return null;
}

async function resolveConnectPayload() {
  const manualCode = normalizeCode(connectCodeInput.value);
  const adminPayload = await readFromAdmin();

  return {
    code: manualCode || adminPayload?.code || null,
    apiUrl: getDevUrl(),
  };
}

async function connectWithCode(code, apiUrl) {
  const response = await chrome.runtime.sendMessage({
    type: "REVORA_CONNECT_EXCHANGE",
    code: normalizeCode(code),
    apiUrl,
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Failed to connect");
  }

  await persistConnection(response.data);
  const shop =
    response.data?.shop ||
    (await chrome.storage.sync.get(["shop"])).shop ||
    "your store";
  setStatus(`Connected to ${shop}`, "ok");
}

async function handleConnect() {
  setStatus("Connecting...");

  await ensureDevUrlStored();

  const payload = await resolveConnectPayload();

  if (!payload.code) {
    setStatus("Enter a connect code from Revora admin.", "error");
    return;
  }

  connectCodeInput.value = payload.code;

  try {
    await connectWithCode(payload.code, payload.apiUrl);
  } catch (error) {
    setStatus(
      error instanceof Error ? error.message : "Connect failed",
      "error",
    );
  }
}

connectBtn.addEventListener("click", () => {
  void handleConnect();
});

fillAdminBtn.addEventListener("click", async () => {
  setStatus("Reading code from Shopify admin...");

  const payload = await readFromAdmin();

  if (!payload?.code) {
    setStatus(
      "Open Revora in Shopify admin, generate a connect code, then try again.",
      "error",
    );
    return;
  }

  connectCodeInput.value = payload.code;
  setStatus("Code filled from admin. Click Connect.", "ok");
});

saveBtn.addEventListener("click", async () => {
  await chrome.storage.sync.set({
    temuAllReviewsSelector: reviewsSelectorInput.value.trim(),
  });
  setStatus("Settings saved", "ok");
});

connectCodeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void handleConnect();
  }
});

async function loadSettings() {
  serverLabel.textContent = getDevUrl();

  await ensureDevUrlStored();

  const stored = await chrome.storage.sync.get([
    "planName",
    "temuAllReviewsSelector",
    "shop",
  ]);

  reviewsSelectorInput.value = stored.temuAllReviewsSelector || "";
  setPlanBadge(stored.planName || "Free");

  if (stored.shop) {
    setStatus(`Connected to ${stored.shop}`, "ok");
  }

  try {
    const planResponse = await chrome.runtime.sendMessage({
      type: "REVORA_GET_PLAN",
    });

    if (planResponse?.ok) {
      setPlanBadge(planResponse.data.planName || "Free");
      if (planResponse.data.shop) {
        setStatus(`Connected to ${planResponse.data.shop}`, "ok");
      }
    }
  } catch {
    // Background may not be ready yet.
  }
}

void loadSettings();
