import type {
  BackgroundBrowserConnectResponse,
  BackgroundDirectConnectResponse,
  BackgroundPlanResponse,
} from "@revora/shared/extension-messages"
import type { ConnectTokenResponse } from "@revora/shared/extension-types"
import { getRevoraAdminAppUrl } from "@revora/shared"
import { resolveConnectPayloadFromAdmin } from "../../lib/admin-tabs"
import { resolveApiBaseUrlForConnect } from "../../lib/api-transport"

const connectBtn = document.getElementById("connect-btn") as HTMLButtonElement
const signInBtn = document.getElementById("sign-in-btn") as HTMLButtonElement
const openAdminBtn = document.getElementById(
  "open-admin-btn",
) as HTMLButtonElement
const statusNode = document.getElementById("status") as HTMLParagraphElement
const statusHint = document.getElementById("status-hint") as HTMLParagraphElement
const statusBadge = document.getElementById("status-badge") as HTMLSpanElement
const statusBadgeLabel = document.getElementById(
  "status-badge-label",
) as HTMLSpanElement
const connectView = document.getElementById("connect-view") as HTMLElement
const connectedView = document.getElementById("connected-view") as HTMLElement
const storeNameNode = document.getElementById("store-name") as HTMLParagraphElement

let connectedShop: string | null = null

function formatShopLabel(shop: string) {
  return shop.replace(/\.myshopify\.com$/i, "")
}

function setDisconnectedStatus(text: string, tone = "") {
  connectView.hidden = false
  connectedView.hidden = true
  statusBadge.hidden = true
  statusNode.textContent = text
  statusNode.className = `lead ${tone}`.trim()
  statusHint.hidden = false
  connectBtn.hidden = false
  signInBtn.hidden = false
}

function setPendingStatus(text: string) {
  connectView.hidden = false
  connectedView.hidden = true
  statusBadge.hidden = false
  statusBadge.className = "status-badge pending"
  statusBadgeLabel.textContent = "Connecting"
  statusNode.textContent = text
  statusNode.className = "lead pending"
  statusHint.hidden = true
}

function setConnected(shop: string) {
  connectedShop = shop
  const label = formatShopLabel(shop)

  connectView.hidden = true
  connectedView.hidden = false
  statusBadge.hidden = false
  statusBadge.className = "status-badge"
  statusBadgeLabel.textContent = "Connected"
  storeNameNode.textContent = label
}

function applyConnection(data: ConnectTokenResponse) {
  setConnected(data.shop)
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
  })) as BackgroundDirectConnectResponse

  if (!response?.ok || !response.data) {
    const message =
      response && "error" in response ? response.error : "Connection failed"
    throw new Error(message || "Connection failed")
  }

  applyConnection(response.data)
  return true
}

function setConnecting(connecting: boolean) {
  connectBtn.disabled = connecting
  signInBtn.disabled = connecting
  connectBtn.textContent = connecting ? "Connecting..." : "Connect store"
}

async function handleConnect() {
  setConnecting(true)
  setPendingStatus("Connecting to your store...")

  try {
    const connected = await connectFromAdminToken()

    if (!connected) {
      setDisconnectedStatus(
        "Couldn't connect",
        "error",
      )
      statusHint.textContent =
        "Open Revora in Shopify admin, then try again."
    }
  } catch (error) {
    setDisconnectedStatus(
      error instanceof Error ? error.message : "Connection failed",
      "error",
    )
    statusHint.textContent =
      "Open Revora in Shopify admin, then try again."
  } finally {
    setConnecting(false)
  }
}

async function handleSignIn() {
  setConnecting(true)
  setPendingStatus("Opening sign-in...")

  const apiBaseUrl = await resolveApiBaseUrlForConnect()

  if (!apiBaseUrl) {
    setDisconnectedStatus("Open Revora in Shopify admin first", "error")
    statusHint.textContent =
      "Keep the Revora admin tab open while signing in."
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
    setDisconnectedStatus(
      error instanceof Error ? error.message : "Sign-in failed",
      "error",
    )
    statusHint.textContent =
      "Keep the Revora admin tab open while signing in."
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

openAdminBtn.addEventListener("click", () => {
  if (!connectedShop) {
    return
  }

  chrome.tabs.create({
    url: getRevoraAdminAppUrl(connectedShop),
  })
})

async function loadSettings() {
  const stored = await chrome.storage.sync.get(["shop", "pairingToken"])

  if (stored.shop) {
    setConnected(stored.shop as string)
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
      setConnected(planResponse.data.shop)
      return
    }
  } catch {
    // Background may not be ready yet.
  }

  setDisconnectedStatus("Not connected")
}

void loadSettings()