import { headers } from "next/headers"

import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors"
import {
  adminAuthFailureResponse,
  authenticateAdminApi,
} from "@/lib/shopify/authenticate-admin"
import { publishImportToStorefront } from "@/lib/reviews/publish"

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

  try {
    const { session } = await authenticateAdminApi(url.searchParams)
    const { id } = await context.params
    const result = await publishImportToStorefront(session, id)
    return extensionJsonResponse(result, origin)
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
          error instanceof Error ? error.message : "Failed to publish reviews",
      },
      origin,
      { status: 400 },
    )
  }
}
