"use client"

import { useCallback, useEffect, useState } from "react"

import { DisplayWidgetCard } from "@/components/display-widget-card"
import { ImportActivityLog } from "@/components/import-activity-log"
import { OnboardingFlow } from "@/components/onboarding-flow"
import { OnboardingFooter } from "@/components/onboarding-footer"
import { OnboardingGuide } from "@/components/onboarding-guide"
import { ProductCatalogTable } from "@/components/product-catalog-table"
import { adminFetchJson } from "@/lib/admin-fetch"
import {
  hydrateOnboardingStore,
  resetOnboardingWizardState,
  useOnboardingStore,
} from "@/lib/onboarding/store"

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
  const { hydrated, flowComplete, dismissed } = useOnboardingStore()
  const [imports, setImports] = useState<ImportRecord[]>([])
  const [hasConnectedExtension, setHasConnectedExtension] = useState(false)
  const [autoImportEnabled, setAutoImportEnabled] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)

  const loadImports = useCallback(async () => {
    try {
      const data = await adminFetchJson<{ imports?: ImportRecord[] }>(
        "/api/imports",
      )
      setImports(data.imports ?? [])
    } catch {
      // Progress indicators are best-effort.
    }
  }, [])

  const loadExtensionStatus = useCallback(async () => {
    try {
      const data = await adminFetchJson<{ tokens?: unknown[] }>(
        "/api/extension/token",
      )
      setHasConnectedExtension((data.tokens ?? []).length > 0)
    } catch {
      // Connection status is best-effort.
    }
  }, [])

  useEffect(() => {
    hydrateOnboardingStore()

    const nextAutoImport =
      window.localStorage.getItem(AUTO_IMPORT_STORAGE_KEY) === "true"

    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate dashboard prefs on mount
    setAutoImportEnabled(nextAutoImport)
    void loadImports()
    void loadExtensionStatus()
  }, [loadImports, loadExtensionStatus])

  useEffect(() => {
    window.revoraRestartOnboarding = () => {
      resetOnboardingWizardState()
      window.scrollTo({ top: 0, behavior: "smooth" })
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

  const showOnboarding = !dismissed

  if (!hydrated) {
    return (
      <s-page inlineSize="small">
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
        onExtensionStatusChange={() => void loadExtensionStatus()}
      />
    )
  }

  return (
    <s-page inlineSize="large">
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

      {dismissed ? (
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