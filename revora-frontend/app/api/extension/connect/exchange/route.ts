import { headers } from "next/headers"

import { exchangeConnectCode } from "@/lib/extension/connect"
import {
  enforceRateLimit,
  getRequestClientKey,
} from "@/lib/extension/rate-limit"
import { connectExchangeSchema } from "@/lib/extension/schemas"
import {
  extensionJsonResponse,
  extensionOptionsResponse,
} from "@/lib/extension/cors"
import { resolveShopPlan } from "@/lib/shopify/resolve-plan"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_EXCHANGE_ATTEMPTS = 20

export async function OPTIONS() {
  const headerStore = await headers()
  return extensionOptionsResponse(headerStore.get("origin"))
}

export async function POST(request: Request) {
  const headerStore = await headers()
  const origin = headerStore.get("origin")

  try {
    await enforceRateLimit(
      getRequestClientKey(request, "connect-exchange"),
      MAX_EXCHANGE_ATTEMPTS
    )

    const body = connectExchangeSchema.parse(await request.json())
    const exchanged = await exchangeConnectCode(body.code, request)
    const resolved = await resolveShopPlan(exchanged.shop)

    return extensionJsonResponse(
      {
        ...exchanged,
        plan: resolved.plan,
        planName: resolved.planName,
        reviewLimit: resolved.reviewLimit,
      },
      origin
    )
  } catch (error) {
    return extensionJsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to exchange connect code",
      },
      origin,
      { status: 400 }
    )
  }
}
