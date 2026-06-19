import { headers } from "next/headers"

import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors"
import { createPremiumSubscription } from "@/lib/shopify/billing"
import { authenticateAdmin } from "@/lib/shopify/authenticate-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function OPTIONS() {
  const headerStore = await headers()
  return extensionOptionsResponse(headerStore.get("origin"))
}

export async function POST(request: Request) {
  const headerStore = await headers()
  const origin = headerStore.get("origin")
  const url = new URL(request.url)
  const { session } = await authenticateAdmin(url.searchParams)

  try {
    const result = await createPremiumSubscription(session, "/")
    return extensionJsonResponse(result, origin)
  } catch (error) {
    return extensionJsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Failed to start billing",
      },
      origin,
      { status: 400 },
    )
  }
}
