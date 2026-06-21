"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { BillingCard } from "@/components/billing-card"
import { DisplayWidgetCard } from "@/components/display-widget-card"
import { ImportActivityLog } from "@/components/import-activity-log"
import { ProductCatalogTable } from "@/components/product-catalog-table"
import { SetupGuide } from "@/components/setup-guide"
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
  const [hasConnectedExtension, setHasConnectedExtension] = useState(false)
  const [autoImportEnabled, setAutoImportEnabled] = useState(false)
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

  const loadExtensionStatus = useCallback(async () => {
    try {
      const response = await adminFetch("/api/extension/token")
      if (!response.ok) return
      const data = await response.json()
      setHasConnectedExtension((data.tokens ?? []).length > 0)
    } catch {
      // Connection status is best-effort.
    }
  }, [])

  useEffect(() => {
    setAutoImportEnabled(
      window.localStorage.getItem(AUTO_IMPORT_STORAGE_KEY) === "true",
    )
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount for setup progress
    void loadImports()
    void loadExtensionStatus()
  }, [loadImports, loadExtensionStatus])

  function handleAutoImportChange(event: Event) {
    const target = event.currentTarget as HTMLInputElement
    const nextValue = target.checked
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

  return (
    <s-page heading="Revora" inlineSize="large">
      <SetupGuide
        hasConnectedExtension={hasConnectedExtension}
        hasImportedReviews={hasImportedReviews}
        hasPublishedReviews={hasPublishedReviews}
        onScrollToProducts={scrollToProducts}
        onScrollToDisplay={scrollToDisplay}
        onExtensionStatusChange={() => void loadExtensionStatus()}
      />

      <s-section heading="Auto-import">
        <s-stack gap="base">
          <s-paragraph color="subdued">
            Automatically queue imports when the extension detects new Temu
            reviews. (UI preview — coming soon)
          </s-paragraph>
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-switch
              label="Enable auto-import"
              checked={autoImportEnabled}
              onChange={handleAutoImportChange}
            />
            <s-button variant="secondary" disabled>
              Settings
            </s-button>
          </s-stack>
        </s-stack>
      </s-section>

      <div ref={productTableRef}>
        <ProductCatalogTable
          shop={shop}
          onPublished={() => {
            void loadImports()
            void loadExtensionStatus()
            setRefreshToken((value) => value + 1)
          }}
        />
      </div>

      <s-grid
        gridTemplateColumns="repeat(auto-fit, minmax(320px, 1fr))"
        gap="base"
      >
        <div ref={displayWidgetRef}>
          <DisplayWidgetCard shop={shop} shopifyApiKey={shopifyApiKey} />
        </div>
        <ImportActivityLog refreshToken={refreshToken} />
      </s-grid>

      <s-section heading="Plan & billing">
        <BillingCard />
      </s-section>

      <s-section>
        <s-paragraph color="subdued">
          Learn more about{" "}
          <s-link
            href="https://help.shopify.com/manual/online-store/themes/theme-structure/extend/apps"
            target="_blank"
          >
            enabling app embeds in your theme
          </s-link>
          .
        </s-paragraph>
      </s-section>
    </s-page>
  )
}