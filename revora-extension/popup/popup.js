import { decodePairingCode, encodePairingCode } from "../src/pairing.js"

const pairingCodeInput = document.getElementById("pairing-code")
const serverUrlInput = document.getElementById("server-url")
const reviewsSelectorInput = document.getElementById("reviews-selector")
const saveBtn = document.getElementById("save-btn")
const verifyBtn = document.getElementById("verify-btn")
const syncUrlBtn = document.getElementById("sync-url-btn")
const statusNode = document.getElementById("status")

function setStatus(text, tone = "") {
  statusNode.textContent = text
  statusNode.className = `status ${tone}`.trim()
}

async function loadSettings() {
  const { pairingCode, pairingToken, apiBaseUrl, temuAllReviewsSelector } =
    await chrome.storage.sync.get([
      "pairingCode",
      "pairingToken",
      "apiBaseUrl",
      "temuAllReviewsSelector",
    ])

  pairingCodeInput.value = pairingCode || pairingToken || ""
  serverUrlInput.value = apiBaseUrl || ""
  reviewsSelectorInput.value = temuAllReviewsSelector || ""
}

async function requestHostPermission(apiBaseUrl) {
  const origin = `${new URL(apiBaseUrl).origin}/*`
  const granted = await chrome.permissions.request({ origins: [origin] })

  if (!granted) {
    throw new Error("Chrome blocked access to the Revora server URL")
  }
}

async function syncUrlFromAdmin() {
  const tabs = await chrome.tabs.query({ url: "https://admin.shopify.com/*" })

  for (const tab of tabs) {
    if (!tab.id) continue

    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "REVORA_GET_API_URL",
      })

      if (response?.apiBaseUrl) {
        const apiBaseUrl = response.apiBaseUrl.replace(/\/$/, "")
        serverUrlInput.value = apiBaseUrl

        const stored = await chrome.storage.sync.get(["pairingToken", "pairingCode"])
        const pairingToken =
          stored.pairingToken ||
          (stored.pairingCode
            ? decodePairingCode(stored.pairingCode).pairingToken
            : "")

        if (pairingToken) {
          await chrome.storage.sync.set({
            apiBaseUrl,
            pairingToken,
            pairingCode: encodePairingCode({
              apiUrl: apiBaseUrl,
              token: pairingToken,
            }),
          })
        } else {
          await chrome.storage.sync.set({ apiBaseUrl })
        }

        setStatus(`Synced server URL: ${apiBaseUrl}`, "ok")
        return apiBaseUrl
      }
    } catch {
      // Tab may not have the content script yet.
    }
  }

  setStatus(
    "Open the Revora app in Shopify admin, then click Sync URL again.",
    "error",
  )
  return null
}

async function saveSettings() {
  const pairingCode = pairingCodeInput.value.trim()
  let apiBaseUrl = serverUrlInput.value.trim().replace(/\/$/, "")

  let pairingToken = ""

  try {
    const decoded = decodePairingCode(pairingCode)
    pairingToken = decoded.pairingToken
    if (!apiBaseUrl && decoded.apiBaseUrl) {
      apiBaseUrl = decoded.apiBaseUrl
    }
  } catch (error) {
    setStatus(
      error instanceof Error ? error.message : "Invalid pairing code",
      "error",
    )
    return false
  }

  if (!apiBaseUrl) {
    apiBaseUrl = serverUrlInput.value.trim().replace(/\/$/, "")
  }

  if (!apiBaseUrl) {
    const synced = await syncUrlFromAdmin()
    apiBaseUrl = synced?.replace(/\/$/, "") || ""
  }

  if (!apiBaseUrl) {
    setStatus(
      "Server URL required. Open Revora in Shopify admin and click Sync URL.",
      "error",
    )
    return false
  }

  try {
    await requestHostPermission(apiBaseUrl)
  } catch (error) {
    setStatus(
      error instanceof Error ? error.message : "Permission request failed",
      "error",
    )
    return false
  }

  await chrome.storage.sync.set({
    pairingToken,
    apiBaseUrl,
    pairingCode: encodePairingCode({
      apiUrl: apiBaseUrl,
      token: pairingToken,
    }),
    temuAllReviewsSelector: reviewsSelectorInput.value.trim(),
  })

  serverUrlInput.value = apiBaseUrl
  setStatus("Settings saved", "ok")
  return true
}

async function verifySettings() {
  const saved = await saveSettings()
  if (!saved) return

  let response

  try {
    response = await chrome.runtime.sendMessage({ type: "REVORA_VERIFY" })
  } catch (error) {
    setStatus(
      "Extension background failed. Reload the extension at chrome://extensions.",
      "error",
    )
    return
  }

  if (!response?.ok) {
    setStatus(response?.error || "Verification failed", "error")
    return
  }

  if (response.data.apiUrl) {
    serverUrlInput.value = response.data.apiUrl
  }

  const apiHint = response.data.apiUrl ? ` via ${response.data.apiUrl}` : ""
  setStatus(`Paired with ${response.data.shop}${apiHint}`, "ok")
}

saveBtn.addEventListener("click", () => void saveSettings())
verifyBtn.addEventListener("click", () => void verifySettings())
syncUrlBtn.addEventListener("click", () => void syncUrlFromAdmin())

void loadSettings()