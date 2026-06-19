const REVORA_CLIENT_ID = "8306c32501330f9312ff84788895ca36"
const PROXY_TIMEOUT_MS = 30000

let latestConnectPayload = null

function isRevoraAppPage() {
  return window.location.pathname.includes(`/apps/${REVORA_CLIENT_ID}`)
}

function isRevoraEmbeddedIframe(url) {
  if (url.hostname.endsWith("admin.shopify.com")) {
    return false
  }

  if (url.searchParams.get("embedded") === "1" && url.searchParams.get("shop")) {
    return true
  }

  return url.pathname.includes(`/apps/${REVORA_CLIENT_ID}`)
}

function findRevoraIframe() {
  for (const iframe of document.querySelectorAll("iframe[src]")) {
    try {
      const url = new URL(iframe.src)

      if (!isRevoraEmbeddedIframe(url)) {
        continue
      }

      return {
        iframe,
        origin: url.origin,
      }
    } catch {
      // Ignore malformed iframe URLs.
    }
  }

  return null
}

function findRevoraIframeOrigin() {
  return findRevoraIframe()?.origin ?? null
}

function proxyToRevoraApp({ path, method = "GET", body, headers = {} }) {
  return new Promise((resolve, reject) => {
    const match = findRevoraIframe()

    if (!match?.iframe?.contentWindow) {
      reject(
        new Error(
          "Open Revora in Shopify admin first, then try again from the extension.",
        ),
      )
      return
    }

    const requestId = crypto.randomUUID()

    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onResponse)
      reject(new Error("Revora admin request timed out. Refresh the app page."))
    }, PROXY_TIMEOUT_MS)

    function onResponse(event) {
      if (event.origin !== match.origin) {
        return
      }

      if (event.data?.type !== "REVORA_ADMIN_PROXY_RESPONSE") {
        return
      }

      if (event.data.requestId !== requestId) {
        return
      }

      window.clearTimeout(timer)
      window.removeEventListener("message", onResponse)

      if (event.data.ok) {
        resolve(event.data.data)
        return
      }

      reject(new Error(event.data.error || "Request failed"))
    }

    window.addEventListener("message", onResponse)

    match.iframe.contentWindow.postMessage(
      {
        type: "REVORA_ADMIN_PROXY_REQUEST",
        requestId,
        path,
        method,
        body,
        headers,
      },
      match.origin,
    )
  })
}

function requestConnectCodeFromIframe() {
  return new Promise((resolve) => {
    if (latestConnectPayload?.code) {
      resolve(latestConnectPayload)
      return
    }

    const match = findRevoraIframe()

    if (!match?.iframe?.contentWindow) {
      resolve(null)
      return
    }

    const requestId = crypto.randomUUID()
    let settled = false

    const finish = (payload) => {
      if (settled) return
      settled = true
      window.removeEventListener("message", onResponse)
      clearTimeout(timer)

      if (payload?.code) {
        latestConnectPayload = payload
      }

      resolve(payload)
    }

    function onResponse(event) {
      if (event.origin !== match.origin) {
        return
      }

      if (event.data?.type !== "REVORA_CONNECT_CODE_RESPONSE") {
        return
      }

      if (event.data.requestId !== requestId) {
        return
      }

      finish({
        code: event.data.code ? String(event.data.code) : null,
        apiUrl: event.data.apiUrl ? String(event.data.apiUrl) : null,
        expiresAt: event.data.expiresAt || null,
      })
    }

    window.addEventListener("message", onResponse)

    const timer = window.setTimeout(() => {
      finish(latestConnectPayload)
    }, 2500)

    match.iframe.contentWindow.postMessage(
      {
        type: "REVORA_REQUEST_CONNECT_CODE",
        requestId,
      },
      match.origin,
    )
  })
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

window.addEventListener("message", (event) => {
  if (event.data?.type !== "REVORA_CONNECT_CODE") {
    return
  }

  if (!event.data.code) {
    return
  }

  latestConnectPayload = {
    code: String(event.data.code),
    apiUrl: event.data.apiUrl ? String(event.data.apiUrl) : null,
    expiresAt: event.data.expiresAt || null,
  }

  if (latestConnectPayload.apiUrl) {
    chrome.runtime
      .sendMessage({
        type: "REVORA_SET_API_URL",
        apiBaseUrl: latestConnectPayload.apiUrl,
      })
      .catch(() => {})
  }
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "REVORA_PING") {
    sendResponse({ ok: true })
    return
  }

  if (message?.type === "REVORA_ADMIN_PROXY") {
    proxyToRevoraApp({
      path: message.path,
      method: message.method,
      body: message.body,
      headers: message.headers,
    })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) =>
        sendResponse({
          ok: false,
          unavailable: /open revora in shopify admin/i.test(
            error instanceof Error ? error.message : "",
          ),
          error: error instanceof Error ? error.message : "Proxy failed",
        }),
      )
    return true
  }

  if (message?.type === "REVORA_GET_API_URL") {
    sendResponse({
      apiBaseUrl: findRevoraIframeOrigin() || latestConnectPayload?.apiUrl || null,
    })
    return
  }

  if (message?.type === "REVORA_GET_CONNECT_CODE") {
    requestConnectCodeFromIframe()
      .then((payload) =>
        sendResponse({
          code: payload?.code || null,
          apiUrl:
            payload?.apiUrl || findRevoraIframeOrigin() || null,
          expiresAt: payload?.expiresAt || null,
        }),
      )
      .catch(() =>
        sendResponse({
          code: latestConnectPayload?.code || null,
          apiUrl:
            latestConnectPayload?.apiUrl || findRevoraIframeOrigin() || null,
          expiresAt: latestConnectPayload?.expiresAt || null,
        }),
      )
    return true
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
