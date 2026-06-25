import type { Session } from "@shopify/shopify-api";

import { getPublishedReviewsForProduct } from "@/lib/reviews/storefront";
import { getShopify } from "@/lib/shopify/shopify";

interface GraphqlAdmin {
  request: (
    query: string,
    options?: { variables?: Record<string, unknown> }
  ) => Promise<{ data?: unknown }>;
}

export async function syncProductStorefrontMetafields(
  session: Session,
  shopifyProductId: string
) {
  const payload = await getPublishedReviewsForProduct(
    session.shop,
    shopifyProductId,
    { limit: 30, sort: "recent" }
  );

  const shopify = getShopify();
  const admin = new shopify.clients.Graphql({ session }) as GraphqlAdmin;

  const response = await admin.request(
    `#graphql
    mutation RevoraSyncStorefrontMetafields($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id namespace key }
        userErrors { field message }
      }
    }
  `,
    {
      variables: {
        metafields: [
          {
            ownerId: shopifyProductId,
            namespace: "$app",
            key: "revora_review_count",
            type: "number_integer",
            value: String(payload.count),
          },
          {
            ownerId: shopifyProductId,
            namespace: "$app",
            key: "revora_average_rating",
            type: "number_decimal",
            value: payload.averageRating.toFixed(1),
          },
          {
            ownerId: shopifyProductId,
            namespace: "$app",
            key: "revora_reviews_json",
            type: "json",
            value: JSON.stringify(payload),
          },
        ],
      },
    }
  );

  const error = (
    response.data as {
      metafieldsSet?: { userErrors?: { message: string }[] };
    }
  )?.metafieldsSet?.userErrors?.[0]?.message;

  if (error) {
    throw new Error(error);
  }

  return payload;
}
