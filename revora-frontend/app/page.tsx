import { BillingCard } from "@/components/billing-card"
import { ConnectExtension } from "@/components/connect-extension"
import { ImportsManager } from "@/components/imports-manager"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { authenticateAdmin } from "@/lib/shopify/authenticate-admin"
import { ensureShopPlan } from "@/lib/shopify/plan-store"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const gettingStartedSteps = [
  "Install the Revora Chrome extension",
  "Click Connect extension below, or sign in from the extension popup",
  "Open a Temu product page and import reviews into a Shopify product",
  "Return here and click Publish to storefront",
  "Add the Revora Reviews block in your theme editor",
]

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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="rounded-2xl border border-[#FFD8B8] bg-[#FFF4EB] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-[#E56B00]">Revora</p>
            <h1 className="text-2xl font-semibold tracking-tight text-[#1A1A1A]">
              Temu reviews for Shopify dropshippers
            </h1>
            <p className="text-sm text-muted-foreground">
              Import Temu product reviews and publish them to your Shopify
              storefront.
            </p>
          </div>
          <Badge className="bg-[#FB7701] text-white hover:bg-[#E56B00]">
            {shop}
          </Badge>
        </div>
      </div>

      <BillingCard />

      <Card>
        <CardHeader>
          <CardTitle>Connect Chrome extension</CardTitle>
          <CardDescription>
            Link the Revora Chrome extension to this store in one click.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConnectExtension />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Imports</CardTitle>
          <CardDescription>
            Review imports from Temu and publish them to mapped Shopify
            products.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportsManager />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
          <CardDescription>First-time setup for your store.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-muted-foreground">
            {gettingStartedSteps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#FFF4EB] text-xs font-medium text-[#FB7701]">
                  {index + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
