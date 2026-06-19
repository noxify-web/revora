import { NextResponse } from "next/server"

export function applyEmbeddedAppHeaders(response: NextResponse) {
  response.headers.set(
    "Content-Security-Policy",
    "frame-ancestors https://admin.shopify.com https://*.myshopify.com;",
  )
  response.headers.set("X-Frame-Options", "ALLOWALL")

  return response
}