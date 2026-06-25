"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";

import { ExtensionConnectBanner } from "@/components/extension-connect-banner";
import { ImportActivityLog } from "@/components/import-activity-log";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { ProductCatalogTable } from "@/components/product-catalog-table";
import { ScopeUpgradeBanner } from "@/components/scope-upgrade-banner";
import { StorefrontWidgetGuide } from "@/components/storefront-widget-guide";
import { adminFetchJson } from "@/lib/admin-fetch";
import { resolveExtensionLinkState } from "@/lib/extension/link-state";
import {
  hydrateOnboardingStore,
  resetOnboardingWizardState,
  useOnboardingStore,
} from "@/lib/onboarding/store";

interface ImportRecord {
  totalImported: number;
}

interface RevoraDashboardProps {
  shop: string;
  shopifyApiKey: string;
}

export function RevoraDashboard({ shop, shopifyApiKey }: RevoraDashboardProps) {
  const { flowComplete } = useOnboardingStore();
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [hasConnectedExtension, setHasConnectedExtension] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const loadImports = useCallback(async () => {
    try {
      const data = await adminFetchJson<{ imports?: ImportRecord[] }>(
        "/api/imports"
      );
      setImports(data.imports ?? []);
    } catch {
      // Progress indicators are best-effort.
    }
  }, []);

  const loadExtensionStatus = useCallback(async () => {
    try {
      const { linked } = await resolveExtensionLinkState();
      setHasConnectedExtension(linked);
    } catch {
      setHasConnectedExtension(false);
    }
  }, []);

  useLayoutEffect(() => {
    hydrateOnboardingStore();
  }, []);

  useEffect(() => {
    void loadImports();
    void loadExtensionStatus();
  }, [loadImports, loadExtensionStatus]);

  useEffect(() => {
    window.revoraRestartOnboarding = () => {
      resetOnboardingWizardState();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
  }, []);

  const hasImportedReviews = imports.some((item) => item.totalImported > 0);

  if (!flowComplete) {
    return (
      <OnboardingFlow
        hasConnectedExtension={hasConnectedExtension}
        onExtensionStatusChange={() => void loadExtensionStatus()}
      />
    );
  }

  return (
    <s-page heading="Dashboard" inlineSize="large">
      <ExtensionConnectBanner
        onConnected={() => void loadExtensionStatus()}
        refreshToken={refreshToken}
      />

      <ScopeUpgradeBanner shop={shop} shopifyApiKey={shopifyApiKey} />

      <StorefrontWidgetGuide
        refreshToken={refreshToken}
        shop={shop}
        shopifyApiKey={shopifyApiKey}
      />

      <ProductCatalogTable
        onPublished={() => {
          void loadImports();
          setRefreshToken((value) => value + 1);
        }}
        shop={shop}
      />

      {hasImportedReviews ? (
        <ImportActivityLog refreshToken={refreshToken} />
      ) : null}
    </s-page>
  );
}
