import { ExtensionPairing } from "@/components/extension-pairing"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { authenticateAdmin } from "@/lib/shopify/authenticate-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const gettingStartedSteps = [
  "Install the Revora Chrome extension (load unpacked from revora-extension/)",
  "Generate a pairing code below and paste it in the extension popup",
  "Open a Temu product page and click Import reviews",
  "Map reviews to a Shopify product and wait for the import to finish",
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

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">Revora</h1>
        <p className="text-sm text-muted-foreground">
          Import Temu product reviews into your Shopify store.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connected store</CardTitle>
          <CardDescription>
            Reviews imported through the Chrome extension are saved to this
            store.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">{shop}</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chrome extension pairing</CardTitle>
          <CardDescription>
            Link the Revora Chrome extension to this Shopify store.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExtensionPairing />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
          <CardDescription>
            Follow these steps to run your first import.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-muted-foreground">
            {gettingStartedSteps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
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