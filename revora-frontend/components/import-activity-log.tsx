"use client";

import { useCallback, useEffect, useState } from "react";

import { PolarisEmptyState } from "@/components/polaris-empty-state";
import { adminFetch } from "@/lib/admin-fetch";

interface ImportRecord {
  createdAt: string;
  id: string;
  publishStatus: string;
  shopifyProductTitle: string | null;
  status: string;
  temuGoodsId: string;
  temuProductTitle: string | null;
  totalExpected: number | null;
  totalImported: number;
  totalPublished: number;
}

function formatStatus(status: string) {
  if (status === "partial") {
    return "Partial";
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}

interface ImportActivityLogProps {
  refreshToken?: number;
}

export function ImportActivityLog({
  refreshToken = 0,
}: ImportActivityLogProps) {
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const loadImports = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adminFetch("/api/imports");
      if (!response.ok) {
        throw new Error("Failed to load import history");
      }

      const data = await response.json();
      setImports(data.imports ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load import history"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshToken;
    void loadImports();
  }, [loadImports, refreshToken]);

  return (
    <s-section accessibilityLabel="Import history" heading="Import history">
      <s-stack gap="base">
        <s-stack
          alignItems="center"
          direction="inline"
          gap="small"
          justifyContent="space-between"
        >
          <s-paragraph color="subdued">
            Recent Temu imports mapped to Shopify products.
          </s-paragraph>
          <s-button
            accessibilityLabel="Toggle import history"
            icon={expanded ? "chevron-up" : "chevron-down"}
            onClick={() => setExpanded((value) => !value)}
            variant="tertiary"
          />
        </s-stack>

        {expanded ? (
          <s-box>
            {error ? (
              <s-banner heading="Error" tone="critical">
                {error}
              </s-banner>
            ) : loading ? (
              <s-stack alignItems="center" direction="inline" gap="small">
                <s-spinner accessibilityLabel="Loading import history" />
                <s-text color="subdued">Loading...</s-text>
              </s-stack>
            ) : imports.length === 0 ? (
              <PolarisEmptyState
                description="Use the Revora Chrome extension on a Temu product page to import reviews."
                heading="No imports yet"
                imageAlt="No imports illustration"
              />
            ) : (
              <s-section
                accessibilityLabel="Import history table"
                padding="none"
              >
                <s-table>
                  <s-table-header-row>
                    <s-table-header listSlot="primary">
                      Temu product
                    </s-table-header>
                    <s-table-header listSlot="labeled">
                      Shopify product
                    </s-table-header>
                    <s-table-header listSlot="inline">Status</s-table-header>
                    <s-table-header format="numeric">Imported</s-table-header>
                    <s-table-header format="numeric">Published</s-table-header>
                    <s-table-header listSlot="secondary">
                      Created
                    </s-table-header>
                  </s-table-header-row>
                  <s-table-body>
                    {imports.map((item) => (
                      <s-table-row key={item.id}>
                        <s-table-cell>
                          {item.temuProductTitle ||
                            `Temu product ${item.temuGoodsId}`}
                        </s-table-cell>
                        <s-table-cell>
                          {item.shopifyProductTitle || "Not mapped"}
                        </s-table-cell>
                        <s-table-cell>
                          <s-stack direction="inline" gap="small">
                            <s-badge tone="info">
                              {formatStatus(item.status)}
                            </s-badge>
                            <s-badge
                              tone={
                                item.publishStatus === "published"
                                  ? "success"
                                  : "neutral"
                              }
                            >
                              {formatStatus(item.publishStatus)}
                            </s-badge>
                          </s-stack>
                        </s-table-cell>
                        <s-table-cell>
                          {item.totalImported}
                          {item.totalExpected ? ` / ${item.totalExpected}` : ""}
                        </s-table-cell>
                        <s-table-cell>{item.totalPublished}</s-table-cell>
                        <s-table-cell>
                          {new Date(item.createdAt).toLocaleString()}
                        </s-table-cell>
                      </s-table-row>
                    ))}
                  </s-table-body>
                </s-table>
              </s-section>
            )}
          </s-box>
        ) : null}
      </s-stack>
    </s-section>
  );
}
