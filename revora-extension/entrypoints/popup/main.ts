import type {
  BackgroundBrowserConnectResponse,
  BackgroundDirectConnectResponse,
  BackgroundPlanResponse,
} from "@revora/shared/extension-messages"
import type { ConnectTokenResponse } from "@revora/shared/extension-types"
import { readConnectTokenFromAdmin } from "../../lib/admin-tabs"
import { resolveApiBaseUrlForConnect } from "../../lib/api-transport"

const reviewsSelectorInput = document.getElementById(
  "reviews-selector",
) as HTMLInputElement
const syncAdminBtn = document.getElementById(
  "sync-admin-btn",
) as HTMLButtonElement
const signInBtn = document.getElementById("sign-in-btn") as HTMLButtonElement
const saveBtn = document.getElementById("save-btn") as HTMLButtonElement
const planBadge = document.getElementById("plan-badge") as HTMLSpanElement
const statusNode = document.getElementById("status") as HTMLParagraphElement
const serverLabel = document.getElementById("server-label") as HTMLSpanElement

function setStatus(text: string, tone = "") {
  statusNode.textContent = text
  statusNode.className = `status ${tone}`.trim()
}

function setPlanBadge(planName = "Free") {
  planBadge.textContent = planName
}

async function updateServerLabel() {
  const apiBaseUrl = await resolveApiBaseUrlForConnect()
  serverLabel.textContent = apiBaseUrl || "Open Revora in Shopify admin to sync"
  return apiBaseUrl
}

function applyConnection(data: ConnectTokenResponse) {
  setPlanBadge(data.planName || "Free")
  serverLabel.textContent = data.apiUrl.replace(/\/$/, "")
  setStatus(`Connected to ${data.shop}`, "ok")
}

async function connectFromAdminToken() {
  const payload = await readConnectTokenFromAdmin()

  if (!payload?.token || !payload.apiUrl || !payload.shop) {
    return false
  }

  const response = (await chrome.runtime.sendMessage({
    type: "REVORA_CONNECT_DIRECT",
    token: payload.token,
    apiUrl: payload.apiUrl,
    shop: payload.shop,
    plan: payload.plan || undefined,
    planName: payload.planName || undefined,
    reviewLimit: payload.reviewLimit,
  })) as BackgroundDirectConnectResponse

  if (!response?.ok || !response.data) {
    const message =
      response && "error" in response ? response.error : "Connection failed"
    throw new Error(message || "Connection failed")
  }

  applyConnection(response.data)
  return true
}

async function handleSyncFromAdmin() {
  setStatus("Syncing from Shopify admin...")
  await updateServerLabel()

  try {
    const connected = await connectFromAdminToken()

    if (!connected) {
      setStatus(
        "Open Revora in Shopify admin and click Connect extension, then try again.",
        "error",
      )
    }
  } catch (error) {
    setStatus(
      error instanceof Error ? error.message : "Sync failed",
      "error",
    )
  }
}

async function handleSignIn() {
  setStatus("Opening Revora sign-in...")
  await updateServerLabel()

  const apiBaseUrl = await resolveApiBaseUrlForConnect()

  if (!apiBaseUrl) {
    setStatus(
      "Open Revora in Shopify admin first so the extension can find the server URL.",
      "error",
    )
    return
  }

  try {
    const response = (await chrome.runtime.sendMessage({
      type: "REVORA_CONNECT_BROWSER",
      apiBaseUrl,
    })) as BackgroundBrowserConnectResponse

    if (!response?.ok || !response.data) {
      const message =
        response && "error" in response ? response.error : "Sign-in failed"
      throw new Error(message || "Sign-in failed")
    }

    applyConnection(response.data)
  } catch (error) {
    setStatus(
      error instanceof Error ? error.message : "Sign-in failed",
      "error",
    )
  }
}

syncAdminBtn.addEventListener("click", () => {
  void handleSyncFromAdmin()
})

signInBtn.addEventListener("click", () => {
  void handleSignIn()
})

saveBtn.addEventListener("click", async () => {
  await chrome.storage.sync.set({
    temuAllReviewsSelector: reviewsSelectorInput.value.trim(),
  })
  setStatus("Settings saved", "ok")
})

async function loadSettings() {
  await updateServerLabel()

  const stored = await chrome.storage.sync.get([
    "planName",
    "temuAllReviewsSelector",
    "shop",
    "pairingToken",
  ])

  reviewsSelectorInput.value = (stored.temuAllReviewsSelector as string) || ""
  setPlanBadge((stored.planName as string) || "Free")

  if (stored.shop) {
    setStatus(`Connected to ${stored.shop}`, "ok")
  }

  if (!stored.pairingToken) {
    try {
      const connected = await connectFromAdminToken()
      if (connected) {
        return
      }
    } catch {
      // Admin token may be stale or verification may fail until permissions are granted.
    }
  }

  try {
    const planResponse = (await chrome.runtime.sendMessage({
      type: "REVORA_GET_PLAN",
    })) as BackgroundPlanResponse

    if (planResponse?.ok && planResponse.data) {
      setPlanBadge(planResponse.data.planName || "Free")
      if (planResponse.data.shop) {
        setStatus(`Connected to ${planResponse.data.shop}`, "ok")
      }
    }
  } catch {
    // Background may not be ready yet.
  }
}

void loadSettings()