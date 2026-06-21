"use client"

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
    <s-section heading="Step 2. Display your reviews" id={id}>
      <s-stack gap="base">
        <s-paragraph color="subdued">
          Enable the Revora Reviews widget in your theme editor to show imported
          reviews on product pages.
        </s-paragraph>
        <s-paragraph color="subdued">
          Open the theme editor, go to <s-text type="strong">App embeds</s-text>
          , enable <s-text type="strong">Revora Reviews Widget</s-text>, and
          save your theme.
        </s-paragraph>
        <s-button
          variant="primary"
          onClick={() =>
            window.open(themeEditorUrl, "_blank", "noopener,noreferrer")
          }
        >
          Open theme editor
        </s-button>
      </s-stack>
    </s-section>
  )
}