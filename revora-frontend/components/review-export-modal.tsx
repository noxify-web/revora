"use client";

import {
  CUSTOM_EXPORT_FIELDS,
  type CustomExportFieldKey,
  DEFAULT_CUSTOM_EXPORT_FIELDS,
  EXPORT_FORMATS,
  type ExportFileType,
  type ExportFormatId,
} from "@revora/shared";
import { useEffect, useMemo, useState } from "react";

import { adminFetch } from "@/lib/admin-fetch";

export const REVIEW_EXPORT_MODAL_ID = "revora-review-export-modal";

export interface ReviewExportTarget {
  handle: string;
  id: string;
  reviewCount: number;
  title: string;
}

interface ReviewExportModalProps {
  product: ReviewExportTarget | null;
}

function getNumericProductId(productId: string) {
  return productId.split("/").pop() ?? productId;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getFilenameFromDisposition(
  contentDisposition: string | null
): string | null {
  if (!contentDisposition) {
    return null;
  }

  const match = /filename="([^"]+)"/.exec(contentDisposition);
  return match?.[1] ?? null;
}

export function ReviewExportModal({ product }: ReviewExportModalProps) {
  const [format, setFormat] = useState<ExportFormatId>("judge_me");
  const [fileType, setFileType] = useState<ExportFileType>("csv");
  const [selectedFields, setSelectedFields] = useState<CustomExportFieldKey[]>([
    ...DEFAULT_CUSTOM_EXPORT_FIELDS,
  ]);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!product) {
      return;
    }

    setFormat("judge_me");
    setFileType("csv");
    setSelectedFields([...DEFAULT_CUSTOM_EXPORT_FIELDS]);
    setError(null);
  }, [product]);

  const selectedFormat = useMemo(
    () => EXPORT_FORMATS.find((item) => item.id === format),
    [format]
  );

  function toggleField(field: CustomExportFieldKey) {
    setSelectedFields((current) =>
      current.includes(field)
        ? current.filter((item) => item !== field)
        : [...current, field]
    );
  }

  async function handleExport() {
    if (!product) {
      return;
    }

    setExporting(true);
    setError(null);

    try {
      const params = new URLSearchParams({ format });
      if (format === "custom") {
        params.set("fileType", fileType);
        if (selectedFields.length > 0) {
          params.set("fields", selectedFields.join(","));
        }
      }

      const numericProductId = getNumericProductId(product.id);
      const response = await adminFetch(
        `/api/admin/products/${numericProductId}/export?${params.toString()}`
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to export reviews");
      }

      const blob = await response.blob();
      const filename =
        getFilenameFromDisposition(
          response.headers.get("Content-Disposition")
        ) ??
        `revora-${product.handle}-export.${format === "custom" ? fileType : "csv"}`;

      triggerDownload(blob, filename);
      window.shopify?.toast?.show(
        `Exported ${product.reviewCount} reviews for ${product.title}`
      );
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Failed to export reviews"
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <s-modal
      heading={product ? `Export reviews — ${product.title}` : "Export reviews"}
      id={REVIEW_EXPORT_MODAL_ID}
    >
      <s-stack gap="base">
        <s-text color="subdued">
          Download reviews in a format you can upload to another review app.
          Revora does not connect directly to third-party apps — you import the
          file in their admin.
        </s-text>

        <s-banner tone="info">
          <s-text>
            Temu reviews do not include customer emails. Yotpo and some other
            apps require an email, so exports use a placeholder address you can
            replace later if needed.
          </s-text>
        </s-banner>

        <s-stack gap="small">
          <s-text type="strong">Export format</s-text>
          {EXPORT_FORMATS.map((item) => (
            <label key={item.id}>
              <s-stack direction="inline" gap="small">
                <input
                  checked={format === item.id}
                  name="export-format"
                  onChange={() => setFormat(item.id)}
                  type="radio"
                />
                <s-stack gap="small-100">
                  <s-text type="strong">{item.label}</s-text>
                  <s-text color="subdued">{item.description}</s-text>
                </s-stack>
              </s-stack>
            </label>
          ))}
        </s-stack>

        {format === "custom" ? (
          <s-stack gap="small">
            <s-text type="strong">File type</s-text>
            <s-stack direction="inline" gap="small">
              <label>
                <s-stack direction="inline" gap="small">
                  <input
                    checked={fileType === "csv"}
                    name="export-file-type"
                    onChange={() => setFileType("csv")}
                    type="radio"
                  />
                  <s-text>CSV</s-text>
                </s-stack>
              </label>
              <label>
                <s-stack direction="inline" gap="small">
                  <input
                    checked={fileType === "xlsx"}
                    name="export-file-type"
                    onChange={() => setFileType("xlsx")}
                    type="radio"
                  />
                  <s-text>Excel (.xlsx)</s-text>
                </s-stack>
              </label>
            </s-stack>

            <s-text type="strong">Fields to include</s-text>
            <s-grid gap="small" gridTemplateColumns="1fr 1fr">
              {CUSTOM_EXPORT_FIELDS.map((field) => (
                <label key={field.key}>
                  <s-stack direction="inline" gap="small">
                    <input
                      checked={selectedFields.includes(field.key)}
                      onChange={() => toggleField(field.key)}
                      type="checkbox"
                    />
                    <s-text>{field.label}</s-text>
                  </s-stack>
                </label>
              ))}
            </s-grid>
          </s-stack>
        ) : null}

        {product && selectedFormat ? (
          <s-text color="subdued">
            {product.reviewCount} review
            {product.reviewCount === 1 ? "" : "s"} will be exported as{" "}
            {selectedFormat.label} format.
          </s-text>
        ) : null}

        {error ? (
          <s-banner heading="Export failed" tone="critical">
            {error}
          </s-banner>
        ) : null}
      </s-stack>

      <s-button
        loading={exporting}
        onClick={() => void handleExport()}
        slot="primary-action"
        variant="primary"
      >
        Download export
      </s-button>
      <s-button
        command="--hide"
        commandFor={REVIEW_EXPORT_MODAL_ID}
        slot="secondary-actions"
      >
        Cancel
      </s-button>
    </s-modal>
  );
}
