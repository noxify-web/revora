import { NextRequest, NextResponse } from "next/server"

import {
  EXTENSION_REDIRECT_COOKIE,
  isValidExtensionRedirectUri,
  normalizeShopDomain,
} from "@/lib/extension/browser-connect"
import { getShopify } from "@/lib/shopify/shopify"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const redirectUri = url.searchParams.get("redirect_uri")?.trim() || ""
  const shop = normalizeShopDomain(url.searchParams.get("shop") || "")

  if (!isValidExtensionRedirectUri(redirectUri)) {
    return NextResponse.json(
      { error: "Invalid extension redirect URI" },
      { status: 400 }
    )
  }

  if (!shop) {
    return NextResponse.json({ error: "Missing shop domain" }, { status: 400 })
  }

  const shopify = getShopify()
  const authResponse = await shopify.auth.begin({
    shop,
    callbackPath: "/api/extension/connect/callback",
    isOnline: false,
    rawRequest: request,
  })

  const response = new NextResponse(authResponse.body, {
    status: authResponse.status,
    headers: authResponse.headers,
  })

  response.cookies.set(EXTENSION_REDIRECT_COOKIE, redirectUri, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  })

  return response
}