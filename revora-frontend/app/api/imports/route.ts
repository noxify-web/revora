import { headers } from "next/headers"

import { listRecentImports } from "@/lib/extension/import"
import { extensionJsonResponse, extensionOptionsResponse } from "@/lib/extension/cors"
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
    async ({ shop }) =>
      extensionJsonResponse(
        { imports: await listRecentImports(shop) },
        origin,
      ),
    {
      logPrefix: "Revora imports GET failed",
      defaultErrorMessage: "Failed to load imports",
    },
  )
}