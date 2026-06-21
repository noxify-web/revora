import { getPublishedReviewsForProduct } from "@/lib/reviews/storefront"

const SHOP_DOMAIN = /^[\w-]+\.myshopify\.com$/
const MAX_REVIEW_LIMIT = 30

function normalizeShopDomain(shop: string | null) {
  if (!shop) return null

  const trimmed = shop.trim().toLowerCase()
  if (!trimmed) return null

  if (trimmed.startsWith("https://")) {
    try {
      return new URL(trimmed).hostname
    } catch {
      return null
    }
  }

  return trimmed
}

export async function handleStorefrontReviewsRequest(
  searchParams: URLSearchParams,
) {
  const shop = normalizeShopDomain(searchParams.get("shop"))
  const productId = searchParams.get("product_id")?.trim() || null
  const limitParam = searchParams.get("limit")
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined
  const limit =
    parsedLimit !== undefined
      ? Math.min(MAX_REVIEW_LIMIT, parsedLimit)
      : undefined

  if (!shop || !SHOP_DOMAIN.test(shop)) {
    return {
      status: 400,
      body: { error: "Missing or invalid shop parameter" },
    }
  }

  if (!productId) {
    return {
      status: 400,
      body: { error: "Missing product_id parameter" },
    }
  }

  if (limit !== undefined && (!Number.isFinite(limit) || limit < 1)) {
    return {
      status: 400,
      body: { error: "Invalid limit parameter" },
    }
  }

  const payload = await getPublishedReviewsForProduct(shop, productId, {
    limit,
  })

  return {
    status: 200,
    body: payload,
  }
}