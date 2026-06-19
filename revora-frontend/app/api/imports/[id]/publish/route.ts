import { headers } from "next/headers"

import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors"
import { authenticateAdmin } from "@/lib/shopify/authenticate-admin"
import { publishImportToShopify } from "@/lib/shopify/sync-reviews"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function OPTIONS() {
  const headerStore = await headers()
  return extensionOptionsResponse(headerStore.get("origin"))
}

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, context: RouteContext) {
  const headerStore = await headers()
  const origin = headerStore.get("origin")
  const url = new URL(request.url)
  const { session } = await authenticateAdmin(url.searchParams)
  const { id } = await context.params

  try {
    const result = await publishImportToShopify(session, id)
    return extensionJsonResponse(result, origin)
  } catch (error) {
    return extensionJsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Failed to publish reviews",
      },
      origin,
      { status: 400 },
    )
  }
}
