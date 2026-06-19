import { headers } from "next/headers"

import { listRecentImports } from "@/lib/extension/import"
import { authenticateAdmin } from "@/lib/shopify/authenticate-admin"
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
  const { shop } = await authenticateAdmin(url.searchParams)
  const imports = await listRecentImports(shop)

  return extensionJsonResponse({ imports }, origin)
}