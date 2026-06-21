import {
  RequestedTokenType,
  type Session,
} from "@shopify/shopify-api"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import type { NextResponse } from "next/server"

import { getShopify, sessionStorage } from "./shopify"

export type AuthenticatedAdmin = {
  shop: string
  session: Session
  admin: InstanceType<ReturnType<typeof getShopify>["clients"]["Graphql"]>
}

export class AdminAuthenticationError extends Error {
  readonly status = 401

  constructor(
    message = "Session expired. Reload Revora from Shopify admin.",
  ) {
    super(message)
    this.name = "AdminAuthenticationError"
  }
}

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

async function resolveAuthenticatedAdmin(
  searchParams: URLSearchParams,
): Promise<AuthenticatedAdmin> {
  const headerStore = await headers()
  const sessionToken = getSessionToken(
    headerStore.get("authorization"),
    searchParams.get("id_token"),
  )

  if (!sessionToken) {
    throw new AdminAuthenticationError()
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
    throw new AdminAuthenticationError()
  }
}

export async function authenticateAdmin(searchParams: URLSearchParams) {
  try {
    return await resolveAuthenticatedAdmin(searchParams)
  } catch (error) {
    if (error instanceof AdminAuthenticationError) {
      redirect(buildBounceRedirectUrl("/", searchParams))
    }

    throw error
  }
}

export async function authenticateAdminApi(searchParams: URLSearchParams) {
  return resolveAuthenticatedAdmin(searchParams)
}

export function adminAuthFailureResponse(
  error: unknown,
  respond: (body: unknown, status?: number) => NextResponse,
): NextResponse | null {
  if (error instanceof AdminAuthenticationError) {
    return respond({ error: error.message }, error.status)
  }

  return null
}