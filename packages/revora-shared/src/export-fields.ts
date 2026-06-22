export const CUSTOM_EXPORT_FIELD_KEYS = [
  "authorName",
  "comment",
  "translatedComment",
  "score",
  "reviewDate",
  "pictures",
  "temuReviewId",
  "shopifyProductId",
  "syncStatus",
  "productHandle",
  "productTitle",
] as const;

export type CustomExportFieldKey = (typeof CUSTOM_EXPORT_FIELD_KEYS)[number];

export interface CustomExportFieldDefinition {
  key: CustomExportFieldKey;
  label: string;
}

export const CUSTOM_EXPORT_FIELDS: CustomExportFieldDefinition[] = [
  { key: "authorName", label: "Author name" },
  { key: "comment", label: "Original comment" },
  { key: "translatedComment", label: "Translated comment" },
  { key: "score", label: "Rating (1–5)" },
  { key: "reviewDate", label: "Review date" },
  { key: "pictures", label: "Picture URLs" },
  { key: "temuReviewId", label: "Temu review ID" },
  { key: "shopifyProductId", label: "Shopify product ID" },
  { key: "syncStatus", label: "Sync status" },
  { key: "productHandle", label: "Product handle" },
  { key: "productTitle", label: "Product title" },
];

export const DEFAULT_CUSTOM_EXPORT_FIELDS: CustomExportFieldKey[] = [
  ...CUSTOM_EXPORT_FIELD_KEYS,
];
