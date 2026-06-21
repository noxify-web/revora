"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { DisplayWidgetCard } from "@/components/display-widget-card"
import { ImportActivityLog } from "@/components/import-activity-log"
import { OnboardingFooter } from "@/components/onboarding-footer"
import { OnboardingGuide } from "@/components/onboarding-guide"
import { ProductCatalogTable } from "@/components/product-catalog-table"
import {
  clearRevoraClientStorage,
  ONBOARDING_STORAGE_KEYS,
} from "@/lib/onboarding"
import { adminFetch } from "@/lib/admin-fetch"

const AUTO_IMPORT_STORAGE_KEY = "revora-auto-import"

type ImportRecord = {
  totalImported: number
  totalPublished: number
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
  const [onboardingDismissed, setOnboardingDismissed] = useState(false)

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
    let nextAutoImport =
      window.localStorage.getItem(AUTO_IMPORT_STORAGE_KEY) === "true"
    let nextOnboardingDismissed =
      window.localStorage.getItem(ONBOARDING_STORAGE_KEYS.dismissed) === "true"

    if (process.env.NODE_ENV === "development") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("reset") === "1") {
        clearRevoraClientStorage()
        nextOnboardingDismissed = false
        nextAutoImport = false
        params.delete("reset")
        const nextQuery = params.toString()
        const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}`
        window.history.replaceState({}, "", nextUrl)
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate dashboard prefs on mount
    setAutoImportEnabled(nextAutoImport)
    setOnboardingDismissed(nextOnboardingDismissed)
    void loadImports()
    void loadExtensionStatus()
  }, [loadImports, loadExtensionStatus])

  useEffect(() => {
    function handleOnboardingReopen() {
      setOnboardingDismissed(false)
    }

    function handleOnboardingDismissed() {
      setOnboardingDismissed(true)
    }

    window.addEventListener("revora:reopen-onboarding", handleOnboardingReopen)
    window.addEventListener(
      "revora:onboarding-dismissed",
      handleOnboardingDismissed,
    )
    return () => {
      window.removeEventListener(
        "revora:reopen-onboarding",
        handleOnboardingReopen,
      )
      window.removeEventListener(
        "revora:onboarding-dismissed",
        handleOnboardingDismissed,
      )
    }
  }, [])

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
    (item) =>
      item.publishStatus === "published" ||
      item.publishStatus === "partial" ||
      item.totalPublished > 0,
  )

  const showOnboarding = !onboardingDismissed

  return (
    <s-page heading="Revora" inlineSize="large">
      <OnboardingGuide
        hasConnectedExtension={hasConnectedExtension}
        hasImportedReviews={hasImportedReviews}
        hasPublishedReviews={hasPublishedReviews}
        onScrollToProducts={scrollToProducts}
        onScrollToDisplay={scrollToDisplay}
        onExtensionStatusChange={() => void loadExtensionStatus()}
      />

      {!showOnboarding && !hasImportedReviews ? (
        <s-banner heading="Ready to import?" tone="info">
          <s-paragraph>
            Install the Revora Chrome extension, open a Temu product page, and
            import reviews to a Shopify product. Use the footer link to reopen
            the setup guide anytime.
          </s-paragraph>
        </s-banner>
      ) : null}

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

      {onboardingDismissed ? (
        <s-section heading="Auto-import">
          <s-stack gap="base">
            <s-paragraph color="subdued">
              Automatically queue imports when the extension detects new Temu
              reviews. (Coming soon)
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
      ) : null}

      <OnboardingFooter />
    </s-page>
  )
}