import { encodePairingCode } from "@revora/shared/pairing-code"
import type {
  BackgroundConnectResponse,
  BackgroundPlanResponse,
} from "@revora/shared/extension-messages"
import type { ConnectExchangeResponse } from "@revora/shared/extension-types"
import { readConnectCodeFromAdmin } from "../../lib/admin-tabs"
import {
  persistApiBaseUrl,
  resolveApiBaseUrlForConnect,
} from "../../lib/api-transport"

const connectCodeInput = document.getElementById(
  "connect-code",
) as HTMLInputElement
const reviewsSelectorInput = document.getElementById(
  "reviews-selector",
) as HTMLInputElement
const connectBtn = document.getElementById("connect-btn") as HTMLButtonElement
const fillAdminBtn = document.getElementById(
  "fill-admin-btn",
) as HTMLButtonElement
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

function normalizeCode(code: string) {
  return code.trim().toUpperCase()
}

async function requestHostPermission(apiBaseUrl: string) {
  const origin = `${new URL(apiBaseUrl).origin}/*`
  const granted = await chrome.permissions.request({ origins: [origin] })

  if (!granted) {
    throw new Error("Chrome blocked access to the Revora server URL")
  }
}

async function updateServerLabel() {
  const apiBaseUrl = await resolveApiBaseUrlForConnect()
  serverLabel.textContent = apiBaseUrl || "Open Revora in Shopify admin to sync"
  return apiBaseUrl
}

async function persistConnection(data: ConnectExchangeResponse) {
  const apiBaseUrl =
    data.apiUrl?.replace(/\/$/, "") ||
    (await resolveApiBaseUrlForConnect()) ||
    ""

  if (!apiBaseUrl) {
    throw new Error(
      "Connect succeeded but no server URL was returned. Open Revora in Shopify admin and try again.",
    )
  }

  await requestHostPermission(apiBaseUrl)
  await persistApiBaseUrl(apiBaseUrl)

  await chrome.storage.sync.set({
    pairingToken: data.token,
    apiBaseUrl,
    pairingCode: encodePairingCode({ apiUrl: apiBaseUrl, token: data.token }),
    shop: data.shop,
    plan: data.plan || "free",
    planName: data.planName || "Free",
    temuAllReviewsSelector: reviewsSelectorInput.value.trim(),
  })

  setPlanBadge(data.planName || "Free")
  serverLabel.textContent = apiBaseUrl
}

async function resolveConnectPayload() {
  const manualCode = normalizeCode(connectCodeInput.value)
  const adminPayload = await readConnectCodeFromAdmin()
  const apiBaseUrl = await resolveApiBaseUrlForConnect()

  return {
    code: manualCode || adminPayload?.code || null,
    apiBaseUrl,
  }
}

async function connectWithCode(code: string) {
  const response = (await chrome.runtime.sendMessage({
    type: "REVORA_CONNECT_EXCHANGE",
    code: normalizeCode(code),
  })) as BackgroundConnectResponse

  if (!response?.ok || !response.data) {
    const message =
      response && "error" in response ? response.error : "Failed to connect"
    throw new Error(message || "Failed to connect")
  }

  await persistConnection(response.data)

  const shop =
    response.data.shop ||
    (await chrome.storage.sync.get(["shop"])).shop ||
    "your store"

  setStatus(`Connected to ${shop}`, "ok")
}

async function handleConnect() {
  setStatus("Connecting...")

  const payload = await resolveConnectPayload()
  await updateServerLabel()

  if (payload.apiBaseUrl) {
    serverLabel.textContent = payload.apiBaseUrl
  }

  if (!payload.code) {
    setStatus("Enter a connect code from Revora admin.", "error")
    return
  }

  connectCodeInput.value = payload.code

  try {
    await connectWithCode(payload.code)
  } catch (error) {
    setStatus(
      error instanceof Error ? error.message : "Connect failed",
      "error",
    )
  }
}

connectBtn.addEventListener("click", () => {
  void handleConnect()
})

fillAdminBtn.addEventListener("click", async () => {
  setStatus("Reading code from Shopify admin...")

  const payload = await readConnectCodeFromAdmin()
  await updateServerLabel()

  if (!payload?.code) {
    setStatus(
      "Open Revora in Shopify admin, generate a connect code, then try again.",
      "error",
    )
    return
  }

  connectCodeInput.value = normalizeCode(payload.code)
  setStatus("Code filled from admin. Click Connect.", "ok")
})

saveBtn.addEventListener("click", async () => {
  await chrome.storage.sync.set({
    temuAllReviewsSelector: reviewsSelectorInput.value.trim(),
  })
  setStatus("Settings saved", "ok")
})

connectCodeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault()
    void handleConnect()
  }
})

async function loadSettings() {
  await updateServerLabel()

  const stored = await chrome.storage.sync.get([
    "planName",
    "temuAllReviewsSelector",
    "shop",
  ])

  reviewsSelectorInput.value = (stored.temuAllReviewsSelector as string) || ""
  setPlanBadge((stored.planName as string) || "Free")

  if (stored.shop) {
    setStatus(`Connected to ${stored.shop}`, "ok")
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