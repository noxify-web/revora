import { getShopify } from "@/lib/shopify/shopify"
import { setShopPlan } from "@/lib/shopify/plan-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type SubscriptionPayload = {
  app_subscription?: {
    admin_graphql_api_id?: string
    status?: string
  }
}

export async function POST(request: Request) {
  const shopify = getShopify()
  const rawBody = await request.text()

  await shopify.webhooks.validate({
    rawBody,
    rawRequest: request,
    rawResponse: new Response(),
  })

  const shop = request.headers.get("x-shopify-shop-domain")

  if (!shop) {
    return new Response("Missing shop header", { status: 400 })
  }

  const payload = JSON.parse(rawBody) as SubscriptionPayload
  const subscription = payload.app_subscription
  const status = subscription?.status

  if (status === "ACTIVE") {
    await setShopPlan(shop, "premium", subscription?.admin_graphql_api_id ?? null)
  } else if (
    status === "CANCELLED" ||
    status === "DECLINED" ||
    status === "EXPIRED" ||
    status === "FROZEN"
  ) {
    await setShopPlan(shop, "free", null)
  }

  return new Response()
}
