import {
  RequestedTokenType,
  type Session,
} from "@shopify/shopify-api"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { getShopify, sessionStorage } from "./shopify"

function getSessionToken(
  authorizationHeader: string | null,
  idToken: string | null,
): string | null {
  if (authorizationHeader?.startsWith("Bearer ")) {
    return authorizationHeader.replace("Bearer ", "")
  }

  return idToken
}

function buildBounceRedirectUrl(pathname: string, searchParams: URLSearchParams) {
  const params = new URLSearchParams(searchParams)
  params.delete("id_token")

  const reloadPath = params.toString()
    ? `${pathname}?${params.toString()}`
    : pathname

  params.set("shopify-reload", reloadPath)

  return `/session-token-bounce?${params.toString()}`
}

export async function authenticateAdmin(searchParams: URLSearchParams) {
  const headerStore = await headers()
  const sessionToken = getSessionToken(
    headerStore.get("authorization"),
    searchParams.get("id_token"),
  )

  if (!sessionToken) {
    redirect(
      buildBounceRedirectUrl(
        "/",
        searchParams,
      ),
    )
  }

  try {
    const shopify = getShopify()
    const decoded = await shopify.session.decodeSessionToken(sessionToken)
    const dest = new URL(decoded.dest)
    const shop = dest.hostname
    const offlineId = shopify.session.getOfflineId(shop)
    let session = await sessionStorage.loadSession(offlineId)

    if (!session?.accessToken) {
      const { session: exchangedSession } = await shopify.auth.tokenExchange({
        shop,
        sessionToken,
        requestedTokenType: RequestedTokenType.OfflineAccessToken,
      })

      await sessionStorage.storeSession(exchangedSession)
      session = exchangedSession
    }

    return {
      shop,
      session: session as Session,
      admin: new shopify.clients.Graphql({ session }),
    }
  } catch (error) {
    console.error("Revora authenticateAdmin failed", error)

    redirect(
      buildBounceRedirectUrl(
        "/",
        searchParams,
      ),
    )
  }
}