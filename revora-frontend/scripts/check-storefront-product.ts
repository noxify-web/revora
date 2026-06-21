import { getShopify, sessionStorage } from "@/lib/shopify/shopify"

const shop = process.argv[2] || "noxify-dvgwvtrt.myshopify.com"
const handle = process.argv[3] || "selling-plans-ski-wax"

const shopify = getShopify()
const session = await sessionStorage.loadSession(shopify.session.getOfflineId(shop))

if (!session?.accessToken) {
  console.error("No app session")
  process.exit(1)
}

const client = new shopify.clients.Graphql({ session })
const response = await client.request(`#graphql
  query StorefrontReadiness($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      count: metafield(namespace: "$app", key: "revora_review_count") { value }
      avg: metafield(namespace: "$app", key: "revora_average_rating") { value }
      json: metafield(namespace: "$app", key: "revora_reviews_json") { type value }
    }
    onlineStore {
      passwordProtection { enabled }
    }
  }
`, { variables: { handle } })

const product = response.data?.productByHandle
const jsonValue = product?.json?.value
let parsed: { count?: number; averageRating?: number; reviews?: unknown[] } | null =
  null

if (jsonValue) {
  try {
    parsed = JSON.parse(jsonValue)
  } catch {
    parsed = null
  }
}

console.log(
  JSON.stringify(
    {
      shop,
      handle,
      passwordProtected: response.data?.onlineStore?.passwordProtection?.enabled,
      productId: product?.id,
      title: product?.title,
      reviewCount: product?.count?.value,
      averageRating: product?.avg?.value,
      jsonReviewItems: parsed?.reviews?.length ?? 0,
      jsonCount: parsed?.count,
      jsonAverage: parsed?.averageRating,
      firstReviewAuthor:
        parsed?.reviews?.[0] &&
        typeof parsed.reviews[0] === "object" &&
        parsed.reviews[0] !== null &&
        "authorName" in parsed.reviews[0]
          ? (parsed.reviews[0] as { authorName?: string }).authorName
          : null,
      liquidAccess:
        'product.metafields["$app"].revora_reviews_json.value (theme app extension)',
      themeExtensionVersion: "revora-6",
    },
    null,
    2,
  ),
)