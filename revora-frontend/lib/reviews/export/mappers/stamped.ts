import { buildCsv } from "../csv-builder";
import { formatStampedDate } from "../dates";
import {
  getPlaceholderEmail,
  getProductUrl,
  getReviewBody,
  getReviewerName,
  getReviewScore,
  joinPictures,
} from "../review-helpers";
import type { ExportProductContext, ExportReviewRecord } from "../types";

export function mapStampedExport(
  reviews: ExportReviewRecord[],
  product: ExportProductContext,
  shop: string
): string {
  const headers = [
    "product_id",
    "product_handle",
    "productUrl",
    "productImageUrl",
    "productTitle",
    "photoFilenames",
    "rating",
    "title",
    "author",
    "email",
    "body",
    "created_at",
    "published",
  ];

  const productUrl = getProductUrl(shop, product);
  const productImageUrl = product.imageUrl ?? "";

  const rows = reviews.map((review) => [
    product.numericId,
    product.handle,
    productUrl,
    productImageUrl,
    product.title,
    joinPictures(review.pictures),
    String(getReviewScore(review)),
    "",
    getReviewerName(review),
    getPlaceholderEmail(review.temuReviewId),
    getReviewBody(review),
    formatStampedDate(review.reviewTime),
    "TRUE",
  ]);

  return buildCsv(headers, rows);
}
