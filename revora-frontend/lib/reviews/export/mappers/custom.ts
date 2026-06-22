import type { CustomExportFieldKey } from "@revora/shared";
import { CUSTOM_EXPORT_FIELDS } from "@revora/shared";

import { buildCsv } from "../csv-builder";
import { formatIsoDate } from "../dates";
import { joinPictures } from "../review-helpers";
import type { ExportProductContext, ExportReviewRecord } from "../types";

function getCustomFieldValue(
  field: CustomExportFieldKey,
  review: ExportReviewRecord,
  product: ExportProductContext
): string {
  switch (field) {
    case "authorName":
      return review.authorName?.trim() || "";
    case "comment":
      return review.comment?.trim() || "";
    case "translatedComment":
      return review.translatedComment?.trim() || "";
    case "score":
      return review.score == null ? "" : String(review.score);
    case "reviewDate":
      return formatIsoDate(review.reviewTime);
    case "pictures":
      return joinPictures(review.pictures);
    case "temuReviewId":
      return review.temuReviewId;
    case "shopifyProductId":
      return review.shopifyProductId ?? product.id;
    case "syncStatus":
      return review.syncStatus;
    case "productHandle":
      return product.handle;
    case "productTitle":
      return product.title;
    default:
      return "";
  }
}

export function mapCustomExport(
  reviews: ExportReviewRecord[],
  product: ExportProductContext,
  fields: CustomExportFieldKey[]
): { headers: string[]; rows: string[][] } {
  const fieldDefinitions = new Map(
    CUSTOM_EXPORT_FIELDS.map((field) => [field.key, field.label])
  );

  const headers = fields.map((field) => fieldDefinitions.get(field) ?? field);

  const rows = reviews.map((review) =>
    fields.map((field) => getCustomFieldValue(field, review, product))
  );

  return { headers, rows };
}

export function buildCustomCsv(
  reviews: ExportReviewRecord[],
  product: ExportProductContext,
  fields: CustomExportFieldKey[]
): string {
  const { headers, rows } = mapCustomExport(reviews, product, fields);
  return buildCsv(headers, rows);
}
