import { headers } from "next/headers"

import { handleStorefrontReviewsRequest } from "@/lib/reviews/storefront-request"
import {
  storefrontJsonResponse,
  storefrontOptionsResponse,
} from "@/lib/storefront/cors"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function OPTIONS() {
  const headerStore = await headers()
  return storefrontOptionsResponse(headerStore.get("origin"))
}

export async function GET(request: Request) {
  const headerStore = await headers()
  const origin = headerStore.get("origin")
  const url = new URL(request.url)

  try {
    const result = await handleStorefrontReviewsRequest(url.searchParams)
    return storefrontJsonResponse(result.body, origin, { status: result.status })
  } catch (error) {
    return storefrontJsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load storefront reviews",
      },
      origin,
      { status: 500 },
    )
  }
}