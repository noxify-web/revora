"use client";

import { PolarisEmptyState } from "@/components/polaris-empty-state";

export function ReviewsPage() {
  return (
    <s-page heading="Reviews" inlineSize="large">
      <s-section heading="All reviews">
        <PolarisEmptyState
          description="A full review management view is coming soon. For now, import and publish reviews from the Dashboard."
          heading="Reviews page coming soon"
          imageAlt="Reviews coming soon illustration"
        />
      </s-section>
    </s-page>
  );
}
