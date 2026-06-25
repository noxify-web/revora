"use client";

import { useCallback, useEffect, useState } from "react";

import { adminFetchJson } from "@/lib/admin-fetch";

interface ScopeStatus {
  grantedScopes: string[];
  missingScopes: string[];
  scopeUpgradeRequired: boolean;
}

interface ScopeUpgradeBannerProps {
  shop: string;
  shopifyApiKey: string;
}

function getShopSlug(shop: string) {
  return shop.replace(/\.myshopify\.com$/i, "");
}

function getScopeUpgradeUrl(shop: string, shopifyApiKey: string) {
  const shopSlug = getShopSlug(shop);
  const params = new URLSearchParams({
    client_id: shopifyApiKey,
  });

  return `https://admin.shopify.com/store/${shopSlug}/oauth/install?${params.toString()}`;
}

export function ScopeUpgradeBanner({
  shop,
  shopifyApiKey,
}: ScopeUpgradeBannerProps) {
  const [status, setStatus] = useState<ScopeStatus | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const data = await adminFetchJson<ScopeStatus>("/api/admin/scope-status");
      setStatus(data);
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  if (!status?.scopeUpgradeRequired) {
    return null;
  }

  const upgradeUrl = getScopeUpgradeUrl(shop, shopifyApiKey);
  const missing = status.missingScopes.join(", ");

  return (
    <s-banner heading="Approve updated app permissions" tone="warning">
      <s-stack gap="base">
        <s-paragraph>
          Revora needs Shopify to grant:{" "}
          <s-text type="strong">{missing}</s-text>. This is required to verify
          your theme embed and keep reviews in sync. Click below — Shopify will
          open an approval screen.
        </s-paragraph>
        <s-button href={upgradeUrl} target="_top" variant="primary">
          Approve permissions in Shopify
        </s-button>
      </s-stack>
    </s-banner>
  );
}
