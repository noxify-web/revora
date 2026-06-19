import { headers } from "next/headers"

export function getAppBaseUrlFromEnv() {
  const envUrl = process.env.HOST?.trim() || process.env.SHOPIFY_APP_URL?.trim()

  if (envUrl) {
    return envUrl.replace(/\/$/, "")
  }

  return null
}

export async function getAppBaseUrl(request?: Request) {
  const fromEnv = getAppBaseUrlFromEnv()
  if (fromEnv) {
    return fromEnv
  }

  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host")
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https"

    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "")
    }

    return new URL(request.url).origin
  }

  const headerStore = await headers()
  const forwardedHost = headerStore.get("x-forwarded-host")
  const forwardedProto = headerStore.get("x-forwarded-proto") || "https"

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "")
  }

  const host = headerStore.get("host")
  if (host) {
    const proto = host.includes("localhost") ? "http" : "https"
    return `${proto}://${host}`.replace(/\/$/, "")
  }

  return "http://localhost:3000"
}