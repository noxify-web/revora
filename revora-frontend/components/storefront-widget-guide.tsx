"use client";

import { getThemeEditorProductUrl } from "@revora/shared/shopify-admin";
import { useCallback, useEffect, useState } from "react";

import { adminFetch, adminFetchJson } from "@/lib/admin-fetch";
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
  const [refreshingScopes, setRefreshingScopes] = useState(false);
  const themeEditorUrl = getThemeEditorProductUrl(shop, shopifyApiKey);

  const loadStatus = useCallback(async () => {
    try {
      const data = await adminFetchJson<RevoraStorefrontWidgetStatus>(
        "/api/admin/theme-embed-status"
      );
      setStatus(data);
      return data;
    } catch {
      setStatus(null);
      return null;
    }
  }, []);

  const refreshScopes = useCallback(async () => {
    setRefreshingScopes(true);

    try {
      const response = await adminFetch("/api/admin/refresh-session", {
        method: "POST",
      });
      const data = (await response.json().catch(() => ({}))) as {
        scopeUpgradeRequired?: boolean;
      };

      if (!data.scopeUpgradeRequired) {
        await loadStatus();
        return true;
      }

      return false;
    } catch {
      return false;
    } finally {
      setRefreshingScopes(false);
    }
  }, [loadStatus]);

  useEffect(() => {
    void refreshToken;
    void (async () => {
      const data = await loadStatus();
      if (data?.scopeUpgradeRequired) {
        await refreshScopes();
      }
    })();
  }, [loadStatus, refreshScopes, refreshToken]);

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
      <s-banner heading="Approve updated app permissions" tone="warning">
        <s-stack gap="base">
          <s-paragraph>
            Revora needs Shopify to refresh its permissions (including{" "}
            <s-text type="strong">read_themes</s-text>) before it can verify
            your theme embed. Your embed may already be enabled.
          </s-paragraph>
          <s-button
            loading={refreshingScopes}
            onClick={() => {
              void (async () => {
                const granted = await refreshScopes();
                if (!granted) {
                  window.open(window.location.href, "_top");
                }
              })();
            }}
            variant="primary"
          >
            Grant permissions
          </s-button>
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
