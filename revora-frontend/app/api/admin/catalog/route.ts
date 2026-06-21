import { headers } from "next/headers"

import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors"
import { getProductCatalogWithStats } from "@/lib/reviews/catalog"
import {
  adminAuthFailureResponse,
  authenticateAdminApi,
} from "@/lib/shopify/authenticate-admin"

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
    const { session } = await authenticateAdminApi(url.searchParams)
    const catalog = await getProductCatalogWithStats(session)
    return extensionJsonResponse({ catalog }, origin)
  } catch (error) {
    const authResponse = adminAuthFailureResponse(error, (body, status) =>
      extensionJsonResponse(body, origin, { status }),
    )

    if (authResponse) {
      return authResponse
    }

    return extensionJsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Failed to load catalog",
      },
      origin,
      { status: 500 },
    )
  }
}