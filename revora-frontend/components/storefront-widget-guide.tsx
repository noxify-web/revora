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
  const [status, setStatus] = useState<RevoraStorefrontWidgetStatus | null>(
    null
  );
  const themeEditorUrl = getThemeEditorProductUrl(shop, shopifyApiKey);

  const loadStatus = useCallback(async () => {
    try {
      const data = await adminFetchJson<RevoraStorefrontWidgetStatus>(
        "/api/admin/theme-embed-status"
      );
      setStatus(data);
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    void refreshToken;
    void loadStatus();
  }, [loadStatus, refreshToken]);

  useRefreshOnFocus(() => {
    void loadStatus();
  });

  if (!status || status.enabled) {
    return null;
  }

  if (!status.checked) {
    if (!status.scopeUpgradeRequired) {
      return null;
    }

    return (
      <s-banner
        heading="Refresh app permissions to verify theme setup"
        tone="warning"
      >
        <s-stack gap="base">
          <s-paragraph>
            Revora cannot read your theme configuration yet because this shop is
            missing the <s-text type="strong">read_themes</s-text> app
            permission. Your app embed may already be enabled — close this tab,
            open Revora again from <s-text type="strong">Apps</s-text> in
            Shopify admin, approve the updated permissions if prompted, and this
            page will show the correct status.
          </s-paragraph>
        </s-stack>
      </s-banner>
    );
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
            embeds for the full review section
          </s-list-item>
          <s-list-item>
            Add the <s-text type="strong">Revora rating summary</s-text> block
            under the product title or on collection cards
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
