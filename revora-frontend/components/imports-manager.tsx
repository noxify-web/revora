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

export function ImportsManager() {
  const [imports, setImports] = useState<ImportRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadImports = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await adminFetch("/api/imports")
      if (!response.ok) {
        throw new Error("Failed to load imports")
      }

      const data = await response.json()
      setImports(data.imports ?? [])
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load imports"
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadImports()
  }, [loadImports])

  async function publishImport(importId: string) {
    setPublishingId(importId)
    setError(null)
    setMessage(null)

    try {
      const response = await adminFetch(`/api/imports/${importId}/publish`, {
        method: "POST",
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || "Failed to publish reviews")
      }

      const failed = typeof data.failed === "number" ? data.failed : 0
      const errors = Array.isArray(data.errors) ? data.errors : []

      if (failed > 0) {
        const detail = errors[0] ? ` First error: ${errors[0]}` : ""
        setError(
          `Published ${data.published} reviews, but ${failed} failed.${detail}`
        )
        setMessage(null)
      } else {
        setMessage(
          `Published ${data.published} reviews to Shopify. Refresh the product page (hard refresh) if the Revora Reviews block already exists. Add the block from Online Store → Themes → Customize → Product page if it is missing.`
        )
        setError(null)
      }

      await loadImports()
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Failed to publish reviews"
      )
    } finally {
      setPublishingId(null)
    }
  }

  return (
    <s-stack gap="base">
      {message ? (
        <s-banner heading="Published to Shopify admin" tone="success">
          <s-stack gap="small">
            <s-paragraph>{message}</s-paragraph>
            <s-paragraph color="subdued">
              Revora does not use Shopify&apos;s built-in product reviews. Add
              the <s-text type="strong">Revora Reviews</s-text> app block on
              your product template to display them on the live store.
            </s-paragraph>
            <s-paragraph color="subdued">
              If you see <s-text type="strong">Revora Reviews</s-text> under
              Variants on the product, delete that option — it is metafield data,
              not a real variant. Reviews stay saved on the product.
            </s-paragraph>
          </s-stack>
        </s-banner>
      ) : null}

      {error ? (
        <s-banner heading="Publish error" tone="critical">
          {error}
        </s-banner>
      ) : null}

      {loading ? (
        <s-paragraph color="subdued">Loading imports...</s-paragraph>
      ) : imports.length === 0 ? (
        <s-paragraph color="subdued">
          No imports yet. Use the Chrome extension on a Temu product page.
        </s-paragraph>
      ) : (
        <s-stack gap="small">
          {imports.map((item) => (
            <s-box
              key={item.id}
              padding="base"
              border="base"
              borderRadius="base"
            >
              <s-stack gap="base">
                <s-grid
                  gridTemplateColumns="1fr auto"
                  gap="small"
                  alignItems="start"
                >
                  <s-stack gap="small-200">
                    <s-text type="strong">
                      {item.temuProductTitle ||
                        `Temu product ${item.temuGoodsId}`}
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
                  {item.totalExpected ? ` / ${item.totalExpected}` : ""} ·
                  Published {item.totalPublished} ·{" "}
                  {new Date(item.createdAt).toLocaleString()}
                </s-paragraph>

                <s-button
                  variant="primary"
                  loading={publishingId === item.id}
                  disabled={
                    item.totalImported === 0 ||
                    item.publishStatus === "published"
                  }
                  onClick={() => void publishImport(item.id)}
                >
                  {publishingId === item.id
                    ? "Publishing..."
                    : item.publishStatus === "published"
                      ? "Published"
                      : item.publishStatus === "partial"
                        ? "Retry publish"
                        : "Publish to storefront"}
                </s-button>
              </s-stack>
            </s-box>
          ))}
        </s-stack>
      )}
    </s-stack>
  )
}