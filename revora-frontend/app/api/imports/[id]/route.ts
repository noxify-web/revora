import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"

import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors"
import { authenticateAdmin } from "@/lib/shopify/authenticate-admin"
import { db } from "@/src/db"
import { importedReviews, reviewImports } from "@/src/db/schema"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function OPTIONS() {
  const headerStore = await headers()
  return extensionOptionsResponse(headerStore.get("origin"))
}

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const headerStore = await headers()
  const origin = headerStore.get("origin")
  const url = new URL(request.url)
  const { shop } = await authenticateAdmin(url.searchParams)
  const { id } = await context.params

  const importRecord = await db.query.reviewImports.findFirst({
    where: and(eq(reviewImports.id, id), eq(reviewImports.shop, shop)),
  })

  if (!importRecord) {
    return extensionJsonResponse({ error: "Import not found" }, origin, {
      status: 404,
    })
  }

  const reviews = await db.query.importedReviews.findMany({
    where: and(
      eq(importedReviews.importId, id),
      eq(importedReviews.shop, shop),
    ),
    limit: 200,
  })

  return extensionJsonResponse({ import: importRecord, reviews }, origin)
}
