import { redirect } from "next/navigation"

import { confirmPremiumSubscription } from "@/lib/shopify/billing"
import { authenticateAdmin } from "@/lib/shopify/authenticate-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const { session } = await authenticateAdmin(url.searchParams)

  await confirmPremiumSubscription(session)

  const returnPath = url.searchParams.get("return") || "/"
  const params = new URLSearchParams(url.searchParams)
  params.delete("return")
  params.set("billing", "success")

  const suffix = params.toString() ? `?${params.toString()}` : "?billing=success"
  redirect(`${returnPath}${suffix}`)
}
