import { headers } from "next/headers"

import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors"
import { PLANS } from "@/lib/plans"
import { authenticateAdmin } from "@/lib/shopify/authenticate-admin"
import { resolveShopPlan } from "@/lib/shopify/resolve-plan"

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
  const { shop, session } = await authenticateAdmin(url.searchParams)

  const resolved = await resolveShopPlan(shop, session)

  return extensionJsonResponse(
    {
      shop,
      plan: resolved.plan,
      planName: resolved.planName,
      reviewLimit: resolved.reviewLimit,
      premiumPrice: PLANS.premium.priceMonthly,
      hasActiveSubscription: resolved.hasActiveSubscription,
    },
    origin
  )
}
