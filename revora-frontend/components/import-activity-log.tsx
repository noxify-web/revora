"use client"

import { useCallback, useEffect, useState } from "react"

import { PolarisEmptyState } from "@/components/polaris-empty-state"
import { adminFetch } from "@/lib/admin-fetch"

type ImportRecord = {
  id: string
  temuGoodsId: string
  temuProductTitle: string | null
  shopifyProductTitle: string | null
  status: string
  publishStatus: string
  totalExpected: number | null
  totalImported: number
  totalPublished: number
  createdAt: string
}

function formatStatus(status: string) {
  if (status === "partial") return "Partial"
  return status.charAt(0).toUpperCase() + status.slice(1)
}

type ImportActivityLogProps = {
  refreshToken?: number
}

export function ImportActivityLog({ refreshToken = 0 }: ImportActivityLogProps) {
  const [imports, setImports] = useState<ImportRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)

  const loadImports = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await adminFetch("/api/imports")
      if (!response.ok) {
        throw new Error("Failed to load import history")
      }

      const data = await response.json()
      setImports(data.imports ?? [])
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load import history",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch import history on mount/refresh
    void loadImports()
  }, [loadImports, refreshToken])

  return (
    <s-section
      heading="Import history"
      accessibilityLabel="Import history"
    >
      <s-stack gap="base">
        <s-stack
          direction="inline"
          gap="small"
          alignItems="center"
          justifyContent="space-between"
        >
          <s-paragraph color="subdued">
            Recent Temu imports mapped to Shopify products.
          </s-paragraph>
          <s-button
            variant="tertiary"
            icon={expanded ? "chevron-up" : "chevron-down"}
            accessibilityLabel="Toggle import history"
            onClick={() => setExpanded((value) => !value)}
          />
        </s-stack>

        {expanded ? (
          <s-box>
            {error ? (
              <s-banner heading="Error" tone="critical">
                {error}
              </s-banner>
            ) : loading ? (
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-spinner accessibilityLabel="Loading import history" />
                <s-text color="subdued">Loading...</s-text>
              </s-stack>
            ) : imports.length === 0 ? (
              <PolarisEmptyState
                heading="No imports yet"
                description="Use the Revora Chrome extension on a Temu product page to import reviews."
                imageAlt="No imports illustration"
              />
            ) : (
              <s-section padding="none" accessibilityLabel="Import history table">
                <s-table>
                  <s-table-header-row>
                    <s-table-header listSlot="primary">Temu product</s-table-header>
                    <s-table-header listSlot="labeled">Shopify product</s-table-header>
                    <s-table-header listSlot="inline">Status</s-table-header>
                    <s-table-header format="numeric">Imported</s-table-header>
                    <s-table-header format="numeric">Published</s-table-header>
                    <s-table-header listSlot="secondary">Created</s-table-header>
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
  )
}