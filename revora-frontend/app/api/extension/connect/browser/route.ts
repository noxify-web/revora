import { NextRequest, NextResponse } from "next/server"

import {
  isValidExtensionRedirectUri,
  normalizeShopDomain,
  renderShopPromptHtml,
} from "@/lib/extension/browser-connect"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const redirectUri = url.searchParams.get("redirect_uri")?.trim() || ""
  const shopInput = url.searchParams.get("shop")

  if (!isValidExtensionRedirectUri(redirectUri)) {
    return NextResponse.json(
      { error: "Invalid extension redirect URI" },
      { status: 400 }
    )
  }

  const shop = shopInput ? normalizeShopDomain(shopInput) : null

  if (!shop) {
    return new NextResponse(
      renderShopPromptHtml({
        redirectUri,
        error: shopInput ? "Enter a valid Shopify store domain." : null,
      }),
      {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    )
  }

  const authUrl = new URL("/api/extension/connect/auth", url.origin)
  authUrl.searchParams.set("shop", shop)
  authUrl.searchParams.set("redirect_uri", redirectUri)

  return NextResponse.redirect(authUrl)
}