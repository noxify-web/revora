import { headers } from "next/headers"

import { createConnectCode } from "@/lib/extension/connect"
import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors"
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
  const { shop } = await authenticateAdmin(url.searchParams)

  try {
    const payload = await createConnectCode(shop, request)
    return extensionJsonResponse(payload, origin, { status: 201 })
  } catch (error) {
    return extensionJsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Failed to create connect code",
      },
      origin,
      { status: 400 },
    )
  }
}
