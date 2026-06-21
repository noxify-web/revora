import { headers } from "next/headers"

import { listRecentImports } from "@/lib/extension/import"
import {
  adminAuthFailureResponse,
  authenticateAdminApi,
} from "@/lib/shopify/authenticate-admin"
import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function OPTIONS() {
  const headerStore = await headers()
  return extensionOptionsResponse(headerStore.get("origin"))
}

export async function GET(request: Request) {
  const headerStore = await headers()
  const origin = headerStore.get("origin")
  const url = new URL(request.url)

  try {
    const { shop } = await authenticateAdminApi(url.searchParams)
    const imports = await listRecentImports(shop)

    return extensionJsonResponse({ imports }, origin)
  } catch (error) {
    const authResponse = adminAuthFailureResponse(error, (body, status) =>
      extensionJsonResponse(body, origin, { status }),
    )

    if (authResponse) {
      return authResponse
    }

    console.error("Revora imports GET failed", error)

    return extensionJsonResponse(
      { error: "Failed to load imports" },
      origin,
      { status: 500 },
    )
  }
}