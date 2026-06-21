import type {
  BackgroundBrowserConnectResponse,
  BackgroundDirectConnectResponse,
  BackgroundPlanResponse,
} from "@revora/shared/extension-messages"
import type { ConnectTokenResponse } from "@revora/shared/extension-types"
import { resolveConnectPayloadFromAdmin } from "../../lib/admin-tabs"
import { resolveApiBaseUrlForConnect } from "../../lib/api-transport"

const reviewsSelectorInput = document.getElementById(
  "reviews-selector",
) as HTMLInputElement
const connectBtn = document.getElementById("connect-btn") as HTMLButtonElement
const signInBtn = document.getElementById("sign-in-btn") as HTMLButtonElement
const saveBtn = document.getElementById("save-btn") as HTMLButtonElement
const planBadge = document.getElementById("plan-badge") as HTMLSpanElement
const statusNode = document.getElementById("status") as HTMLParagraphElement
const statusDot = document.getElementById("status-dot") as HTMLSpanElement

function setStatus(text: string, tone = "") {
  statusNode.textContent = text
  statusDot.className = `status-dot ${tone}`.trim()
}

function setPlanBadge(planName = "Free") {
  planBadge.textContent = planName
}

function setConnecting(connecting: boolean) {
  connectBtn.disabled = connecting
  connectBtn.textContent = connecting ? "Connecting..." : "Connect store"
}

function setConnected(shop: string, planName = "Free") {
  setPlanBadge(planName)
  setStatus(shop, "ok")
  connectBtn.hidden = true
  signInBtn.hidden = true
}

function applyConnection(data: ConnectTokenResponse) {
  setConnected(data.shop, data.planName || "Free")
}

async function connectFromAdminToken() {
  const payload = await resolveConnectPayloadFromAdmin()

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

async function handleConnect() {
  setConnecting(true)
  setStatus("Connecting...", "pending")

  try {
    const connected = await connectFromAdminToken()

    if (!connected) {
      setStatus(
        "Open Revora in Shopify admin, then click Connect store again",
        "error",
      )
    }
  } catch (error) {
    setStatus(
      error instanceof Error ? error.message : "Connection failed",
      "error",
    )
  } finally {
    setConnecting(false)
  }
}

async function handleSignIn() {
  setConnecting(true)
  setStatus("Opening sign-in...", "pending")

  const apiBaseUrl = await resolveApiBaseUrlForConnect()

  if (!apiBaseUrl) {
    setStatus("Open Revora in Shopify admin first", "error")
    setConnecting(false)
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
  } finally {
    setConnecting(false)
  }
}

connectBtn.addEventListener("click", () => {
  void handleConnect()
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
  const stored = await chrome.storage.sync.get([
    "planName",
    "temuAllReviewsSelector",
    "shop",
    "pairingToken",
  ])

  reviewsSelectorInput.value = (stored.temuAllReviewsSelector as string) || ""
  setPlanBadge((stored.planName as string) || "Free")

  if (stored.shop) {
    setConnected(stored.shop as string, (stored.planName as string) || "Free")
    return
  }

  if (!stored.pairingToken) {
    try {
      const connected = await connectFromAdminToken()
      if (connected) {
        return
      }
    } catch {
      // Admin token may be stale until permissions are granted.
    }
  }

  try {
    const planResponse = (await chrome.runtime.sendMessage({
      type: "REVORA_GET_PLAN",
    })) as BackgroundPlanResponse

    if (planResponse?.ok && planResponse.data?.shop) {
      setConnected(
        planResponse.data.shop,
        planResponse.data.planName || "Free",
      )
      return
    }

    if (planResponse?.ok && planResponse.data) {
      setPlanBadge(planResponse.data.planName || "Free")
    }
  } catch {
    // Background may not be ready yet.
  }

  setStatus("Not connected")
}

void loadSettings()