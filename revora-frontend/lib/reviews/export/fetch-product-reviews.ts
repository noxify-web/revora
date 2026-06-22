import type { Session } from "@shopify/shopify-api";
import { and, eq } from "drizzle-orm";

import { parseStoredPictures } from "@/lib/extension/pictures";
import { getShopify } from "@/lib/shopify/shopify";
import { db } from "@/src/db";
import { importedReviews } from "@/src/db/schema";

import type { ExportProductContext, ExportReviewRecord } from "./types";

const PRODUCT_QUERY = `#graphql
  query RevoraExportProduct($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      onlineStoreUrl
      featuredImage {
        url
      }
    }
  }
`;

export function toShopifyProductGid(productId: string): string {
  if (productId.startsWith("gid://")) {
    return productId;
  }
  return `gid://shopify/Product/${productId}`;
}

export function getNumericProductId(productGid: string): string {
  return productGid.split("/").pop() ?? productGid;
}

export async function fetchProductContext(
  session: Session,
  productId: string
): Promise<ExportProductContext | null> {
  const shopify = getShopify();
  const admin = new shopify.clients.Graphql({ session });
  const productGid = toShopifyProductGid(productId);

  const response = await admin.request(PRODUCT_QUERY, {
    variables: { id: productGid },
  });

  const product = (
    response.data as {
      product?: {
        id: string;
        title: string;
        handle: string;
        onlineStoreUrl?: string | null;
        featuredImage?: { url?: string | null } | null;
      } | null;
    }
  )?.product;

  if (!product) {
    return null;
  }

  return {
    id: product.id,
    numericId: getNumericProductId(product.id),
    handle: product.handle,
    title: product.title,
    url: product.onlineStoreUrl ?? "",
    imageUrl: product.featuredImage?.url ?? null,
  };
}

export async function fetchReviewsForProduct(
  shop: string,
  productId: string
): Promise<ExportReviewRecord[]> {
  const productGid = toShopifyProductGid(productId);
  const reviews = await db.query.importedReviews.findMany({
    where: and(
      eq(importedReviews.shop, shop),
      eq(importedReviews.shopifyProductId, productGid)
    ),
  });

  return reviews.map((review) => ({
    temuReviewId: review.temuReviewId,
    comment: review.comment,
    translatedComment: review.translatedComment,
    score: review.score,
    authorName: review.authorName,
    reviewTime: review.reviewTime,
    pictures: parseStoredPictures(review.pictures),
    shopifyProductId: review.shopifyProductId,
    syncStatus: review.syncStatus,
  }));
}
