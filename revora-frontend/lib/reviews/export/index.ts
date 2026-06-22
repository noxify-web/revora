import {
  DEFAULT_CUSTOM_EXPORT_FIELDS,
  type ExportFormatId,
} from "@revora/shared";
import type { Session } from "@shopify/shopify-api";

import { encodeCsvUtf8 } from "./csv-builder";
import {
  fetchProductContext,
  fetchReviewsForProduct,
} from "./fetch-product-reviews";
import { buildCustomCsv, mapCustomExport } from "./mappers/custom";
import { mapJudgeMeExport } from "./mappers/judge-me";
import { mapLooxExport } from "./mappers/loox";
import { mapOkendoExport } from "./mappers/okendo";
import { mapStampedExport } from "./mappers/stamped";
import { mapYotpoExport } from "./mappers/yotpo";
import { buildExportFilename } from "./review-helpers";
import type { ExportBuildResult, ExportProductReviewsOptions } from "./types";
import { buildXlsx } from "./xlsx-builder";

export class ExportError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ExportError";
    this.status = status;
  }
}

function buildCsvExport(
  format: ExportFormatId,
  session: Session,
  product: NonNullable<Awaited<ReturnType<typeof fetchProductContext>>>,
  reviews: Awaited<ReturnType<typeof fetchReviewsForProduct>>
): { csv: string; extension: string } {
  switch (format) {
    case "judge_me":
      return {
        csv: mapJudgeMeExport(reviews, product, session.shop),
        extension: "csv",
      };
    case "loox":
      return { csv: mapLooxExport(reviews, product), extension: "csv" };
    case "yotpo":
      return { csv: mapYotpoExport(reviews, product), extension: "csv" };
    case "stamped":
      return {
        csv: mapStampedExport(reviews, product, session.shop),
        extension: "csv",
      };
    case "okendo":
      return { csv: mapOkendoExport(reviews, product), extension: "csv" };
    default:
      throw new ExportError("Unsupported CSV export format");
  }
}

export async function exportProductReviews(
  session: Session,
  productId: string,
  options: ExportProductReviewsOptions
): Promise<ExportBuildResult> {
  const [product, reviews] = await Promise.all([
    fetchProductContext(session, productId),
    fetchReviewsForProduct(session.shop, productId),
  ]);

  if (!product) {
    throw new ExportError("Product not found", 404);
  }

  if (reviews.length === 0) {
    throw new ExportError("No reviews found for this product", 404);
  }

  if (options.format === "stamped" && !product.imageUrl) {
    throw new ExportError(
      "Stamped.io export requires a product image. Add a featured image to this product and try again."
    );
  }

  if (options.format === "custom") {
    const fields = options.fields ?? DEFAULT_CUSTOM_EXPORT_FIELDS;
    const fileType = options.fileType ?? "csv";
    const { headers, rows } = mapCustomExport(reviews, product, fields);

    if (fileType === "xlsx") {
      return {
        content: buildXlsx(headers, rows),
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename: buildExportFilename(product.handle, "custom", "xlsx"),
        reviewCount: reviews.length,
      };
    }

    const csv = buildCustomCsv(reviews, product, fields);
    return {
      content: encodeCsvUtf8(csv),
      contentType: "text/csv; charset=utf-8",
      filename: buildExportFilename(product.handle, "custom", "csv"),
      reviewCount: reviews.length,
    };
  }

  const { csv, extension } = buildCsvExport(
    options.format,
    session,
    product,
    reviews
  );

  return {
    content: encodeCsvUtf8(csv),
    contentType: "text/csv; charset=utf-8",
    filename: buildExportFilename(product.handle, options.format, extension),
    reviewCount: reviews.length,
  };
}
