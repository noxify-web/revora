import { randomUUID } from "crypto"
import { and, desc, eq, isNull } from "drizzle-orm"
import { headers } from "next/headers"

import { authenticateAdmin } from "@/lib/shopify/authenticate-admin"
import { getAppBaseUrl } from "@/lib/extension/app-url"
import { generateExtensionToken } from "@/lib/extension/auth"
import {
  extensionCorsHeaders,
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors"
import { db } from "@/src/db"
import { extensionTokens } from "@/src/db/schema"

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

  const body = (await request.json().catch(() => ({}))) as { label?: string }
  const { token, tokenHash } = generateExtensionToken()
  const now = new Date().toISOString()

  await db.insert(extensionTokens).values({
    id: randomUUID(),
    shop,
    tokenHash,
    label: body.label?.trim() || "Chrome extension",
    createdAt: now,
  })

  const apiUrl = await getAppBaseUrl(request)

  return extensionJsonResponse(
    {
      token,
      apiUrl,
      shop,
      label: body.label?.trim() || "Chrome extension",
      createdAt: now,
    },
    origin,
    { status: 201 },
  )
}

export async function GET(request: Request) {
  const headerStore = await headers()
  const origin = headerStore.get("origin")
  const url = new URL(request.url)
  const { shop } = await authenticateAdmin(url.searchParams)

  const tokens = await db.query.extensionTokens.findMany({
    where: and(eq(extensionTokens.shop, shop), isNull(extensionTokens.revokedAt)),
    orderBy: [desc(extensionTokens.createdAt)],
    columns: {
      id: true,
      label: true,
      createdAt: true,
      lastUsedAt: true,
    },
  })

  return extensionJsonResponse({ tokens }, origin)
}

export async function DELETE(request: Request) {
  const headerStore = await headers()
  const origin = headerStore.get("origin")
  const url = new URL(request.url)
  const { shop } = await authenticateAdmin(url.searchParams)
  const tokenId = url.searchParams.get("id")

  if (!tokenId) {
    return extensionJsonResponse({ error: "Missing token id" }, origin, {
      status: 400,
    })
  }

  await db
    .update(extensionTokens)
    .set({ revokedAt: new Date().toISOString() })
    .where(
      and(eq(extensionTokens.id, tokenId), eq(extensionTokens.shop, shop)),
    )

  return extensionJsonResponse({ revoked: true }, origin)
}