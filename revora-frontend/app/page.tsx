import { RevoraDashboard } from "@/components/revora-dashboard"
import { authenticateAdmin } from "@/lib/shopify/authenticate-admin"
import { ensureShopPlan } from "@/lib/shopify/plan-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      query.set(key, value)
    }
  }

  const { shop } = await authenticateAdmin(query)
  await ensureShopPlan(shop)

  const shopifyApiKey = process.env.SHOPIFY_API_KEY || ""

  return <RevoraDashboard shop={shop} shopifyApiKey={shopifyApiKey} />
}