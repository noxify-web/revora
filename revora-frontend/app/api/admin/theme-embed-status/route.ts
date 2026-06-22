import { headers } from "next/headers"

import { extensionJsonResponse, extensionOptionsResponse } from "@/lib/extension/cors"
import { getRevoraStorefrontWidgetStatus } from "@/lib/shopify/theme-app-embed"
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
  const apiKey = process.env.SHOPIFY_API_KEY || ""

  return withAdminApi(
    request,
    async ({ session }) => {
      const status = await getRevoraStorefrontWidgetStatus(session, apiKey)
      return extensionJsonResponse(status, origin)
    },
    { defaultErrorMessage: "Failed to check theme embed status" },
  )
}