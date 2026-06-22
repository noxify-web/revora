export function isExtensionContextValid() {
  try {
    return typeof chrome.runtime?.id === "string" && chrome.runtime.id.length > 0
  } catch {
    return false
  }
}

/** Fire-and-forget background message without surfacing runtime errors in DevTools. */
export function sendBackgroundMessage(message: unknown) {
  if (!isExtensionContextValid()) {
    return
  }

  try {
    const result = chrome.runtime.sendMessage(message)

    if (result && typeof (result as Promise<unknown>).catch === "function") {
      void (result as Promise<unknown>).catch(() => {})
    }
  } catch {
    // Extension context invalidated or background unavailable.
  }
}

export function safeSendResponse(
  sendResponse: (response: unknown) => void,
  payload: unknown,
) {
  if (!isExtensionContextValid()) {
    return
  }

  try {
    sendResponse(payload)
  } catch {
    // Extension context invalidated before response could be sent.
  }
}