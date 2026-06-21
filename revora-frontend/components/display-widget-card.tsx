"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type DisplayWidgetCardProps = {
  shop: string
  shopifyApiKey: string
  id?: string
}

function getShopSlug(shop: string) {
  return shop.replace(/\.myshopify\.com$/i, "")
}

function getThemeEditorUrl(shop: string, shopifyApiKey: string) {
  const shopSlug = getShopSlug(shop)
  const params = new URLSearchParams({
    template: "product",
    context: "apps",
    activateAppId: shopifyApiKey,
  })

  return `https://admin.shopify.com/store/${shopSlug}/themes/current/editor?${params.toString()}`
}

export function DisplayWidgetCard({
  shop,
  shopifyApiKey,
  id,
}: DisplayWidgetCardProps) {
  const themeEditorUrl = getThemeEditorUrl(shop, shopifyApiKey)

  return (
    <Card id={id} className="border-border/80 shadow-sm">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="text-base font-semibold">
          Step 2. Display your reviews
        </CardTitle>
        <CardDescription>
          Enable the Revora Reviews widget in your theme editor to show imported
          reviews on product pages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <p className="text-sm text-muted-foreground">
          Open the theme editor, go to <strong>App embeds</strong>, enable{" "}
          <strong>Revora Reviews Widget</strong>, and save your theme.
        </p>
        <Button
          className="bg-[#FB7701] text-white hover:bg-[#E56B00]"
          onClick={() => window.open(themeEditorUrl, "_blank", "noopener,noreferrer")}
        >
          Open theme editor
        </Button>
      </CardContent>
    </Card>
  )
}