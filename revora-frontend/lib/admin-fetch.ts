export async function getSessionToken() {
  if (typeof window !== "undefined" && window.shopify?.idToken) {
    return window.shopify.idToken()
  }

  const params = new URLSearchParams(window.location.search)
  return params.get("id_token")
}

export async function adminFetch(path: string, init?: RequestInit) {
  const token = await getSessionToken()
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

  return fetch(search ? `${url.pathname}?${search}` : url.pathname, {
    ...init,
    headers,
  })
}
