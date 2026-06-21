"use client"

import { useCallback, useEffect, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
    <div className="space-y-4">
      {message ? (
        <Alert className="border-[#FFD8B8] bg-[#FFF4EB]">
          <AlertTitle className="text-[#E56B00]">
            Published to Shopify admin
          </AlertTitle>
          <AlertDescription className="space-y-2 text-sm">
            <p>{message}</p>
            <p className="text-muted-foreground">
              Revora does not use Shopify&apos;s built-in product reviews. Add
              the <strong>Revora Reviews</strong> app block on your product
              template to display them on the live store.
            </p>
            <p className="text-muted-foreground">
              If you see <strong>Revora Reviews</strong> under Variants on the
              product, delete that option — it is metafield data, not a real
              variant. Reviews stay saved on the product.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Publish error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading imports...</p>
      ) : imports.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No imports yet. Use the Chrome extension on a Temu product page.
        </p>
      ) : (
        <div className="space-y-3">
          {imports.map((item) => (
            <Card key={item.id} size="sm">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle>
                      {item.temuProductTitle ||
                        `Temu product ${item.temuGoodsId}`}
                    </CardTitle>
                    <CardDescription>
                      {item.shopifyProductTitle
                        ? `Mapped to ${item.shopifyProductTitle}`
                        : "No Shopify product mapped"}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline">{formatStatus(item.status)}</Badge>
                    <Badge
                      variant={
                        item.publishStatus === "published"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {formatStatus(item.publishStatus)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Imported {item.totalImported}
                  {item.totalExpected ? ` / ${item.totalExpected}` : ""} ·
                  Published {item.totalPublished} ·{" "}
                  {new Date(item.createdAt).toLocaleString()}
                </p>
                <Button
                  size="sm"
                  disabled={
                    publishingId === item.id ||
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
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
