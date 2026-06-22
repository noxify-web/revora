import type { CustomExportFieldKey } from "@revora/shared";

export interface ExportProductContext {
  handle: string;
  id: string;
  imageUrl: string | null;
  numericId: string;
  title: string;
  url: string;
}

export interface ExportReviewRecord {
  authorName: string | null;
  comment: string | null;
  pictures: string[];
  reviewTime: number | null;
  score: number | null;
  shopifyProductId: string | null;
  syncStatus: string;
  temuReviewId: string;
  translatedComment: string | null;
}

export interface ExportBuildResult {
  content: Uint8Array;
  contentType: string;
  filename: string;
  reviewCount: number;
}

export interface ExportProductReviewsOptions {
  fields?: CustomExportFieldKey[];
  fileType?: "csv" | "xlsx";
  format: import("@revora/shared").ExportFormatId;
}
