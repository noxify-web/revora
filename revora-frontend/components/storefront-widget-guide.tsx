"use client";

import { getThemeEditorProductUrl } from "@revora/shared/shopify-admin";
import { useCallback, useEffect, useState } from "react";

import { adminFetchJson } from "@/lib/admin-fetch";
import type { RevoraStorefrontWidgetStatus } from "@/lib/shopify/theme-app-embed";
import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus";

interface StorefrontWidgetGuideProps {
  refreshToken?: number;
  shop: string;
  shopifyApiKey: string;
}

export function StorefrontWidgetGuide({
  shop,
  shopifyApiKey,
  refreshToken = 0,
}: StorefrontWidgetGuideProps) {
  const [enabled, setEnabled] = useState(false);
  const themeEditorUrl = getThemeEditorProductUrl(shop, shopifyApiKey);

  const loadStatus = useCallback(async () => {
    try {
      const data = await adminFetchJson<RevoraStorefrontWidgetStatus>(
        "/api/admin/theme-embed-status"
      );
      setEnabled(Boolean(data.enabled));
    } catch {
      setEnabled(false);
    }
  }, []);

  useEffect(() => {
    void refreshToken;
    void loadStatus();
  }, [loadStatus, refreshToken]);

  useRefreshOnFocus(() => {
    void loadStatus();
  });

  if (enabled) {
    return null;
  }

  return (
    <s-banner heading="Show reviews on your product pages" tone="info">
      <s-stack gap="base">
        <s-paragraph>
          Turn on the Revora Reviews app embed in your theme so customers can
          see imported reviews.
        </s-paragraph>
        <s-ordered-list>
          <s-list-item>Open the theme editor on a product page</s-list-item>
          <s-list-item>
            Enable <s-text type="strong">Revora Reviews</s-text> under App
            embeds
          </s-list-item>
          <s-list-item>Save your theme</s-list-item>
        </s-ordered-list>
        <s-button
          href={themeEditorUrl}
          icon="theme-edit"
          target="_blank"
          variant="primary"
        >
          Open theme editor
        </s-button>
      </s-stack>
    </s-banner>
  );
}
