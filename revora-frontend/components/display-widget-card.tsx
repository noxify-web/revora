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
    <s-section id={id} heading="Display your reviews">
      <s-grid
        gridTemplateColumns="@container (inline-size <= 480px) 1fr, 1fr auto"
        gap="large"
        alignItems="center"
      >
        <s-stack gap="small-200">
          <s-paragraph>
            Enable the Revora Reviews widget in your theme editor so shoppers
            can see imported reviews on product pages.
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
        <s-box maxInlineSize="200px" borderRadius="base" overflow="hidden">
          <s-image
            src="https://cdn.shopify.com/static/images/polaris/patterns/callout.png"
            alt="Theme editor illustration"
            aspectRatio="1/0.5"
          />
        </s-box>
      </s-grid>
    </s-section>
  )
}