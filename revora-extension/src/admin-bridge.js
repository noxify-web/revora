const REVORA_CLIENT_ID = "8306c32501330f9312ff84788895ca36"

function isRevoraAppPage() {
  return window.location.pathname.includes(`/apps/${REVORA_CLIENT_ID}`)
}

function findRevoraIframeOrigin() {
  for (const iframe of document.querySelectorAll("iframe[src]")) {
    try {
      const url = new URL(iframe.src)
      const isTunnel =
        url.hostname.endsWith(".trycloudflare.com") ||
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1"

      if (!isTunnel) {
        continue
      }

      if (url.searchParams.get("embedded") === "1" || isRevoraAppPage()) {
        return url.origin
      }
    } catch {
      // Ignore malformed iframe URLs.
    }
  }

  return null
}

function syncOrigin() {
  const origin = findRevoraIframeOrigin()
  if (!origin) {
    return
  }

  chrome.runtime
    .sendMessage({
      type: "REVORA_SET_API_URL",
      apiBaseUrl: origin,
    })
    .catch(() => {})
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "REVORA_GET_API_URL") {
    sendResponse({ apiBaseUrl: findRevoraIframeOrigin() })
    return
  }

  return false
})

if (isRevoraAppPage()) {
  syncOrigin()

  const observer = new MutationObserver(() => {
    syncOrigin()
  })

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })

  window.setInterval(syncOrigin, 3000)
}