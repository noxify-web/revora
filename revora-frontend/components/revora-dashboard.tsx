"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { BillingCard } from "@/components/billing-card"
import { DisplayWidgetCard } from "@/components/display-widget-card"
import { ImportActivityLog } from "@/components/import-activity-log"
import { ProductCatalogTable } from "@/components/product-catalog-table"
import { SetupGuide } from "@/components/setup-guide"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { adminFetch } from "@/lib/admin-fetch"

const AUTO_IMPORT_STORAGE_KEY = "revora-auto-import"

type ImportRecord = {
  totalImported: number
  publishStatus: string
}

type RevoraDashboardProps = {
  shop: string
  shopifyApiKey: string
}

export function RevoraDashboard({ shop, shopifyApiKey }: RevoraDashboardProps) {
  const productTableRef = useRef<HTMLDivElement>(null)
  const displayWidgetRef = useRef<HTMLDivElement>(null)
  const [imports, setImports] = useState<ImportRecord[]>([])
  const [autoImportEnabled, setAutoImportEnabled] = useState(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(AUTO_IMPORT_STORAGE_KEY) === "true"
  })
  const [refreshToken, setRefreshToken] = useState(0)

  const loadImports = useCallback(async () => {
    try {
      const response = await adminFetch("/api/imports")
      if (!response.ok) return
      const data = await response.json()
      setImports(data.imports ?? [])
    } catch {
      // Progress indicators are best-effort.
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount for setup progress
    void loadImports()
  }, [loadImports])

  function toggleAutoImport() {
    const nextValue = !autoImportEnabled
    setAutoImportEnabled(nextValue)
    window.localStorage.setItem(AUTO_IMPORT_STORAGE_KEY, String(nextValue))
  }

  function scrollToProducts() {
    productTableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function scrollToDisplay() {
    displayWidgetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const hasImportedReviews = imports.some((item) => item.totalImported > 0)
  const hasPublishedReviews = imports.some(
    (item) => item.publishStatus === "published",
  )
  const completedTasks =
    1 + Number(hasImportedReviews) + Number(hasPublishedReviews)

  return (
    <div className="flex flex-col gap-6">
      <SetupGuide
        completedTasks={completedTasks}
        hasImportedReviews={hasImportedReviews}
        hasPublishedReviews={hasPublishedReviews}
        onScrollToProducts={scrollToProducts}
        onScrollToDisplay={scrollToDisplay}
      />

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border/60">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Auto-import</CardTitle>
            <CardDescription>
              Automatically queue imports when the extension detects new Temu
              reviews. (UI preview — coming soon)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={autoImportEnabled}
              aria-label="Toggle auto-import"
              onClick={toggleAutoImport}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                autoImportEnabled ? "bg-[#FB7701]" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${
                  autoImportEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <Button size="sm" variant="outline" disabled>
              Settings
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div ref={productTableRef}>
        <ProductCatalogTable
          shop={shop}
          onPublished={() => {
            void loadImports()
            setRefreshToken((value) => value + 1)
          }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div ref={displayWidgetRef}>
          <DisplayWidgetCard shop={shop} shopifyApiKey={shopifyApiKey} />
        </div>
        <ImportActivityLog refreshToken={refreshToken} />
      </div>

      <details className="group rounded-lg border border-border/80 bg-card shadow-sm">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium marker:content-none [&::-webkit-details-marker]:hidden">
          <div className="flex items-center justify-between gap-3">
            <span>Plan & billing</span>
            <span className="text-xs text-muted-foreground group-open:hidden">
              Expand
            </span>
          </div>
        </summary>
        <div className="border-t border-border/60 px-2 pb-2">
          <BillingCard />
        </div>
      </details>
    </div>
  )
}