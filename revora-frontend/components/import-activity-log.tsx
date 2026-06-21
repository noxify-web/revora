"use client"

import { useCallback, useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
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

function EmptyStateIllustration() {
  return (
    <div
      aria-hidden
      className="mx-auto flex size-28 items-end justify-center"
    >
      <svg viewBox="0 0 120 100" className="h-full w-full text-muted-foreground/35">
        <rect x="18" y="58" width="84" height="8" rx="2" fill="currentColor" />
        <path
          d="M34 58V42c0-8 6-14 14-14h8c8 0 14 6 14 14v16"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M30 42c0-10 8-18 18-18h4c10 0 18 8 18 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="60" cy="24" r="6" fill="currentColor" opacity="0.5" />
      </svg>
    </div>
  )
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
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="border-b border-border/60">
        <CardTitle className="text-base font-semibold">
          Reviews import log
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : loading ? (
          <p className="text-sm text-muted-foreground">Loading import log...</p>
        ) : imports.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <EmptyStateIllustration />
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any import logs yet.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {imports.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium">
                      {item.temuProductTitle || `Temu product ${item.temuGoodsId}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.shopifyProductTitle
                        ? `Mapped to ${item.shopifyProductTitle}`
                        : "No Shopify product mapped"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{formatStatus(item.status)}</Badge>
                    <Badge
                      variant={
                        item.publishStatus === "published" ? "default" : "secondary"
                      }
                    >
                      {formatStatus(item.publishStatus)}
                    </Badge>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Imported {item.totalImported}
                  {item.totalExpected ? ` / ${item.totalExpected}` : ""} · Published{" "}
                  {item.totalPublished} · {new Date(item.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}