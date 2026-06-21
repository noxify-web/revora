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

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border/70 bg-card">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-6 py-5">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-semibold tracking-tight text-[#1A1A1A]">
              Revora
            </span>
            <span className="text-xs font-semibold tracking-[0.2em] text-[#0d7a6f]">
              IMPORTER
            </span>
          </div>
          <div className="ml-auto hidden text-xs text-muted-foreground sm:block">
            {shop}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <RevoraDashboard shop={shop} shopifyApiKey={shopifyApiKey} />
      </main>
    </div>
  )
}