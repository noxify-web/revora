"use client";

import { ProductExportTable } from "@/components/product-export-table";

interface ReviewExportPageProps {
  shop: string;
}

export function ReviewExportPage({ shop }: ReviewExportPageProps) {
  return (
    <s-page heading="Export" inlineSize="large">
      <s-section>
        <s-stack gap="small">
          <s-text>
            Export imported reviews in a format compatible with Judge.me, Loox,
            Yotpo, Stamped.io, Okendo, or a custom spreadsheet.
          </s-text>
          <s-text color="subdued">
            Choose a product below, pick your target app format, and download
            the file to upload in that app&apos;s import screen.
          </s-text>
        </s-stack>
      </s-section>

      <ProductExportTable shop={shop} />
    </s-page>
  );
}
