"use client"

import { useCallback, useEffect, useState } from "react"

import { DisplayWidgetCard } from "@/components/display-widget-card"
import { ImportActivityLog } from "@/components/import-activity-log"
import { OnboardingFlow } from "@/components/onboarding-flow"
import { OnboardingFooter } from "@/components/onboarding-footer"
import { OnboardingGuide } from "@/components/onboarding-guide"
import { ProductCatalogTable } from "@/components/product-catalog-table"
import {
  clearRevoraClientStorage,
  isOnboardingFlowComplete,
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
  const [imports, setImports] = useState<ImportRecord[]>([])
  const [hasConnectedExtension, setHasConnectedExtension] = useState(false)
  const [autoImportEnabled, setAutoImportEnabled] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)
  const [onboardingDismissed, setOnboardingDismissed] = useState(false)
  const [flowComplete, setFlowComplete] = useState(false)
  const [flowHydrated, setFlowHydrated] = useState(false)

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

  const handleFlowComplete = useCallback(() => {
    setFlowComplete(true)
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
    let nextFlowComplete = isOnboardingFlowComplete()

    if (process.env.NODE_ENV === "development") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("reset") === "1") {
        clearRevoraClientStorage()
        nextOnboardingDismissed = false
        nextFlowComplete = false
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
    setFlowComplete(nextFlowComplete)
    setFlowHydrated(true)
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

    function handleFlowComplete() {
      setFlowComplete(true)
    }

    function handleFlowReset() {
      setFlowComplete(false)
    }

    window.addEventListener("revora:reopen-onboarding", handleOnboardingReopen)
    window.addEventListener(
      "revora:onboarding-dismissed",
      handleOnboardingDismissed,
    )
    window.addEventListener(
      "revora:onboarding-flow-complete",
      handleFlowComplete,
    )
    window.addEventListener("revora:onboarding-flow-reset", handleFlowReset)
    return () => {
      window.removeEventListener(
        "revora:reopen-onboarding",
        handleOnboardingReopen,
      )
      window.removeEventListener(
        "revora:onboarding-dismissed",
        handleOnboardingDismissed,
      )
      window.removeEventListener(
        "revora:onboarding-flow-complete",
        handleFlowComplete,
      )
      window.removeEventListener(
        "revora:onboarding-flow-reset",
        handleFlowReset,
      )
    }
  }, [])

  function handleAutoImportChange(event: Event) {
    const target = event.currentTarget as HTMLInputElement
    const nextValue = target.checked
    setAutoImportEnabled(nextValue)
    window.localStorage.setItem(AUTO_IMPORT_STORAGE_KEY, String(nextValue))
  }

  function scrollToSection(sectionId: string) {
    document
      .getElementById(sectionId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function scrollToProducts() {
    scrollToSection("revora-products")
  }

  function scrollToDisplay() {
    scrollToSection("revora-display")
  }

  const hasImportedReviews = imports.some((item) => item.totalImported > 0)
  const hasPublishedReviews = imports.some(
    (item) =>
      item.publishStatus === "published" ||
      item.publishStatus === "partial" ||
      item.totalPublished > 0,
  )

  const showOnboarding = !onboardingDismissed

  if (!flowHydrated) {
    return (
      <s-page heading="Revora" inlineSize="small">
        <s-section>
          <s-stack direction="inline" gap="small" alignItems="center">
            <s-spinner accessibilityLabel="Loading Revora" />
            <s-text color="subdued">Loading...</s-text>
          </s-stack>
        </s-section>
      </s-page>
    )
  }

  if (!flowComplete) {
    return (
      <OnboardingFlow
        hasConnectedExtension={hasConnectedExtension}
        onComplete={handleFlowComplete}
        onExtensionStatusChange={() => void loadExtensionStatus()}
      />
    )
  }

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

      <ProductCatalogTable
        id="revora-products"
        shop={shop}
        onPublished={() => {
          void loadImports()
          void loadExtensionStatus()
          setRefreshToken((value) => value + 1)
        }}
      />

      <DisplayWidgetCard
        id="revora-display"
        shop={shop}
        shopifyApiKey={shopifyApiKey}
      />

      <ImportActivityLog refreshToken={refreshToken} />

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
              <s-button variant="secondary" icon="settings" disabled>
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