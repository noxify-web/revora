import { getPublishedReviewsForProduct } from "@/lib/reviews/storefront";
import { parseStorefrontQueryOptions } from "@/lib/reviews/storefront-core";

const SHOP_DOMAIN = /^[\w-]+\.myshopify\.com$/;

function normalizeShopDomain(shop: string | null) {
  if (!shop) {
    return null;
  }

  const trimmed = shop.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("https://")) {
    try {
      return new URL(trimmed).hostname;
    } catch {
      return null;
    }
  }

  return trimmed;
}

export async function handleStorefrontReviewsRequest(
  searchParams: URLSearchParams
) {
  const shop = normalizeShopDomain(searchParams.get("shop"));
  const productId = searchParams.get("product_id")?.trim() || null;
  const queryOptions = parseStorefrontQueryOptions(searchParams);

  if (!(shop && SHOP_DOMAIN.test(shop))) {
    return {
      status: 400,
      body: { error: "Missing or invalid shop parameter" },
    };
  }

  if (!productId) {
    return {
      status: 400,
      body: { error: "Missing product_id parameter" },
    };
  }

  if (queryOptions.invalidLimit) {
    return {
      status: 400,
      body: { error: "Invalid limit parameter" },
    };
  }

  if (queryOptions.invalidSort) {
    return {
      status: 400,
      body: { error: "Invalid sort parameter" },
    };
  }

  const payload = await getPublishedReviewsForProduct(shop, productId, {
    limit: queryOptions.limit,
    sort: queryOptions.sort,
    photosOnly: queryOptions.photosOnly,
    summaryOnly: queryOptions.summaryOnly,
  });

  return {
    status: 200,
    body: payload,
  };
}
