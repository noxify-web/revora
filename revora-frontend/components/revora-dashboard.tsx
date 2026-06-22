"use client"

import { useCallback, useEffect, useState } from "react"

import { ExtensionConnectBanner } from "@/components/extension-connect-banner"
import { ImportActivityLog } from "@/components/import-activity-log"
import { OnboardingFlow } from "@/components/onboarding-flow"
import { ProductCatalogTable } from "@/components/product-catalog-table"
import { StorefrontWidgetGuide } from "@/components/storefront-widget-guide"
import { adminFetchJson } from "@/lib/admin-fetch"
import { queryExtensionClientStatus } from "@/lib/extension/client-status"
import {
  hydrateOnboardingStore,
  resetOnboardingWizardState,
  useOnboardingStore,
} from "@/lib/onboarding/store"

type ImportRecord = {
  totalImported: number
}

type RevoraDashboardProps = {
  shop: string
  shopifyApiKey: string
}

export function RevoraDashboard({ shop, shopifyApiKey }: RevoraDashboardProps) {
  const { hydrated, flowComplete } = useOnboardingStore()
  const [imports, setImports] = useState<ImportRecord[]>([])
  const [hasConnectedExtension, setHasConnectedExtension] = useState(false)
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
      const status = await queryExtensionClientStatus()
      setHasConnectedExtension(status.verified)
    } catch {
      setHasConnectedExtension(false)
    }
  }, [])

  useEffect(() => {
    hydrateOnboardingStore()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load dashboard data on mount
    void loadImports()
    void loadExtensionStatus()
  }, [loadImports, loadExtensionStatus])

  useEffect(() => {
    window.revoraRestartOnboarding = () => {
      resetOnboardingWizardState()
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [])

  const hasImportedReviews = imports.some((item) => item.totalImported > 0)

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
    <s-page heading="Revora" inlineSize="large">
      <ExtensionConnectBanner
        onConnected={() => void loadExtensionStatus()}
        refreshToken={refreshToken}
      />

      <StorefrontWidgetGuide
        shop={shop}
        shopifyApiKey={shopifyApiKey}
        refreshToken={refreshToken}
      />

      <ProductCatalogTable
        shop={shop}
        onPublished={() => {
          void loadImports()
          setRefreshToken((value) => value + 1)
        }}
      />

      {hasImportedReviews ? (
        <ImportActivityLog refreshToken={refreshToken} />
      ) : null}
    </s-page>
  )
}