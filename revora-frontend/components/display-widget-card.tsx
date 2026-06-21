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
    <s-section id={id} accessibilityLabel="Display reviews on storefront">
      <s-grid gridTemplateColumns="1fr auto" gap="small-400" alignItems="start">
        <s-grid
          gridTemplateColumns="@container (inline-size <= 480px) 1fr, auto auto"
          gap="base"
          alignItems="center"
        >
          <s-grid gap="small-200">
            <s-heading>Display your reviews</s-heading>
            <s-paragraph>
              Enable the Revora Reviews widget in your theme editor so shoppers
              can see imported reviews on product pages.
            </s-paragraph>
            <s-stack direction="inline" gap="small-200">
              <s-button
                variant="primary"
                icon="theme-edit"
                href={themeEditorUrl}
                target="_blank"
              >
                Open theme editor
              </s-button>
            </s-stack>
          </s-grid>
          <s-stack alignItems="center">
            <s-box maxInlineSize="200px" borderRadius="base" overflow="hidden">
              <s-image
                src="https://cdn.shopify.com/static/images/polaris/patterns/callout.png"
                alt="Theme editor illustration"
                aspectRatio="1/0.5"
              />
            </s-box>
          </s-stack>
        </s-grid>
      </s-grid>
    </s-section>
  )
}