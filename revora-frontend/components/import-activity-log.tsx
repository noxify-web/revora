"use client"

import { useCallback, useEffect, useState } from "react"

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
    <s-section heading="Reviews import log">
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
        <s-stack gap="base" alignItems="center">
          <s-icon type="note" tone="neutral" />
          <s-paragraph color="subdued">
            You don&apos;t have any import logs yet.
          </s-paragraph>
        </s-stack>
      ) : (
        <s-stack gap="small">
          {imports.map((item) => (
            <s-box
              key={item.id}
              padding="base"
              border="base"
              borderRadius="base"
              background="subdued"
            >
              <s-stack gap="small">
                <s-grid
                  gridTemplateColumns="1fr auto"
                  gap="small"
                  alignItems="start"
                >
                  <s-stack gap="small-200">
                    <s-text type="strong">
                      {item.temuProductTitle || `Temu product ${item.temuGoodsId}`}
                    </s-text>
                    <s-paragraph color="subdued">
                      {item.shopifyProductTitle
                        ? `Mapped to ${item.shopifyProductTitle}`
                        : "No Shopify product mapped"}
                    </s-paragraph>
                  </s-stack>
                  <s-stack direction="inline" gap="small">
                    <s-badge tone="info">{formatStatus(item.status)}</s-badge>
                    <s-badge
                      tone={
                        item.publishStatus === "published" ? "success" : "neutral"
                      }
                    >
                      {formatStatus(item.publishStatus)}
                    </s-badge>
                  </s-stack>
                </s-grid>
                <s-paragraph color="subdued">
                  Imported {item.totalImported}
                  {item.totalExpected ? ` / ${item.totalExpected}` : ""} · Published{" "}
                  {item.totalPublished} · {new Date(item.createdAt).toLocaleString()}
                </s-paragraph>
              </s-stack>
            </s-box>
          ))}
        </s-stack>
      )}
    </s-section>
  )
}