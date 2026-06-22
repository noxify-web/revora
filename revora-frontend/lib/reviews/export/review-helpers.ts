import type { ExportProductContext, ExportReviewRecord } from "./types";

export function getReviewBody(review: ExportReviewRecord): string {
  const body = review.translatedComment?.trim() || review.comment?.trim() || "";
  return body || "Great product!";
}

export function getReviewerName(review: ExportReviewRecord): string {
  return review.authorName?.trim() || "Anonymous";
}

export function getReviewScore(review: ExportReviewRecord): number {
  if (
    typeof review.score === "number" &&
    review.score >= 1 &&
    review.score <= 5
  ) {
    return review.score;
  }
  return 5;
}

export function getPlaceholderEmail(temuReviewId: string): string {
  return `revora+${temuReviewId}@import.placeholder`;
}

export function joinPictures(
  pictures: string[],
  separator: "," | ";" = ","
): string {
  return pictures.join(separator);
}

export function buildExportFilename(
  handle: string,
  format: string,
  extension: string
): string {
  const safeHandle = handle
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `revora-${safeHandle || "product"}-${format}.${extension}`;
}

export function getProductUrl(
  shop: string,
  product: ExportProductContext
): string {
  if (product.url) {
    return product.url;
  }
  return `https://${shop}/products/${product.handle}`;
}
