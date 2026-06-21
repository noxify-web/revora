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

  const loadImports = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await adminFetch("/api/imports")
      if (!response.ok) {
        throw new Error("Failed to load import log")
      }

      const data = await response.json()
      setImports(data.imports ?? [])
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load import log",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch import log on mount/refresh
    void loadImports()
  }, [loadImports, refreshToken])

  return (
    <s-section accessibilityLabel="Import activity log">
      <s-stack direction="inline" gap="small" alignItems="center">
        <s-icon type="data-table" size="small" />
        <s-heading>Reviews import log</s-heading>
      </s-stack>
      <s-box paddingBlockStart="base">
      {error ? (
        <s-banner heading="Error" tone="critical">
          {error}
        </s-banner>
      ) : loading ? (
        <s-stack direction="inline" gap="small" alignItems="center">
          <s-spinner accessibilityLabel="Loading import log" />
          <s-text color="subdued">Loading import log...</s-text>
        </s-stack>
      ) : imports.length === 0 ? (
        <PolarisEmptyState
          heading="No import logs yet"
          description="Use the Revora Chrome extension on a Temu product page to import reviews into your store."
          imageAlt="No import logs illustration"
        />
      ) : (
        <s-section padding="none" accessibilityLabel="Import log table">
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
                    {item.temuProductTitle || `Temu product ${item.temuGoodsId}`}
                  </s-table-cell>
                  <s-table-cell>
                    {item.shopifyProductTitle || "Not mapped"}
                  </s-table-cell>
                  <s-table-cell>
                    <s-stack direction="inline" gap="small">
                      <s-badge tone="info">{formatStatus(item.status)}</s-badge>
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
    </s-section>
  )
}