import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

import { applyEmbeddedAppHeaders } from "@/lib/shopify/headers"
import { getShopify, sessionStorage } from "@/lib/shopify/shopify"

export async function GET(request: NextRequest) {
  const shopify = getShopify()
  const callbackResponse = await shopify.auth.callback({
    rawRequest: request,
  })

  await sessionStorage.storeSession(callbackResponse.session)

  const appUrl =
    process.env.HOST?.trim() ||
    process.env.SHOPIFY_APP_URL?.trim() ||
    "http://localhost:3000"
  const response = NextResponse.redirect(appUrl)

  if (callbackResponse.headers) {
    for (const [key, value] of Object.entries(callbackResponse.headers)) {
      if (typeof value === "string") {
        response.headers.set(key, value)
      }
    }
  }

  return applyEmbeddedAppHeaders(response)
}