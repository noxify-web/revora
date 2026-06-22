async function buildAdminRequest(
  path: string,
  init: RequestInit | undefined,
  token: string | null,
) {
  const url = new URL(path, window.location.origin)
  const pageParams = new URLSearchParams(window.location.search)

  pageParams.forEach((value, key) => {
    if (!url.searchParams.has(key)) {
      url.searchParams.set(key, value)
    }
  })

  const headers = new Headers(init?.headers)

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  if (init?.body) {
    headers.set("Content-Type", "application/json")
  }

  const search = url.searchParams.toString()

  return {
    url: search ? `${url.pathname}?${search}` : url.pathname,
    init: {
      ...init,
      headers,
    },
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function readShopifyIdToken(waitAttempts: number) {
  for (let attempt = 0; attempt < waitAttempts; attempt += 1) {
    if (typeof window !== "undefined" && window.shopify?.idToken) {
      try {
        const token = await window.shopify.idToken()
        if (token) {
          return token
        }
      } catch {
        // App Bridge may not be ready yet.
      }
    }

    if (attempt < waitAttempts - 1) {
      await sleep(200)
    }
  }

  return null
}

export async function getSessionToken(retryAttempt = 0) {
  const waitAttempts = retryAttempt > 0 ? 12 : 4
  const fromBridge = await readShopifyIdToken(waitAttempts)

  if (fromBridge) {
    return fromBridge
  }

  const params = new URLSearchParams(window.location.search)
  return params.get("id_token")
}

export async function adminFetch(
  path: string,
  init?: RequestInit,
  attempt = 0,
): Promise<Response> {
  const token = await getSessionToken(attempt)
  const request = await buildAdminRequest(path, init, token)
  const response = await fetch(request.url, request.init)

  if (response.status === 401 && attempt < 2) {
    return adminFetch(path, init, attempt + 1)
  }

  return response
}

export async function readAdminJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? ""

  if (!contentType.includes("application/json")) {
    throw new Error(
      response.status === 401
        ? "Session expired. Reload Revora from Shopify admin."
        : "Unexpected server response. Try again.",
    )
  }

  try {
    return (await response.json()) as T
  } catch {
    throw new Error("Unexpected server response. Try again.")
  }
}

export async function adminFetchJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await adminFetch(path, init)
  const data = await readAdminJson<T & { error?: string }>(response)

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed")
  }

  return data
}