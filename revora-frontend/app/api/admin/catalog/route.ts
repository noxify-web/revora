import { headers } from "next/headers"

import { extensionJsonResponse, extensionOptionsResponse } from "@/lib/extension/cors"
import { getProductCatalogWithStats } from "@/lib/reviews/catalog"
import { withAdminApi } from "@/lib/shopify/authenticate-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function OPTIONS() {
  const headerStore = await headers()
  return extensionOptionsResponse(headerStore.get("origin"))
}

export async function GET(request: Request) {
  const headerStore = await headers()
  const origin = headerStore.get("origin")

  return withAdminApi(
    request,
    async ({ session }) =>
      extensionJsonResponse(
        { catalog: await getProductCatalogWithStats(session) },
        origin,
      ),
    { defaultErrorMessage: "Failed to load catalog" },
  )
}