"use client";

import type { ConnectTokenResponse } from "@revora/shared/extension-types";
import { useCallback, useEffect, useState } from "react";
import { broadcastConnectToken } from "@/components/extension-bridge";
import { openChromeWebStore } from "@/components/onboarding-shared";
import { adminFetch, readAdminJson } from "@/lib/admin-fetch";
import { queryExtensionClientStatus } from "@/lib/extension/client-status";
import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus";

interface ExtensionConnectBannerProps {
  onConnected?: () => void;
  refreshToken?: number;
}

function showToast(message: string) {
  window.shopify?.toast?.show(message);
}

export function ExtensionConnectBanner({
  onConnected,
  refreshToken = 0,
}: ExtensionConnectBannerProps) {
  const [verified, setVerified] = useState(false);
  const [extensionInstalled, setExtensionInstalled] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const status = await queryExtensionClientStatus();
      setExtensionInstalled(status.installed);
      setVerified(status.verified);
      setError(null);
    } catch {
      setExtensionInstalled(false);
      setVerified(false);
    }
  }, []);

  useEffect(() => {
    void refreshToken;
    void loadStatus();
  }, [loadStatus, refreshToken]);

  useRefreshOnFocus(() => {
    void loadStatus();
  });

  async function connectExtension() {
    setConnecting(true);
    setError(null);

    try {
      const response = await adminFetch("/api/extension/token", {
        method: "POST",
        body: JSON.stringify({ label: "Chrome extension" }),
      });

      const data = await readAdminJson<
        ConnectTokenResponse & { error?: string }
      >(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect extension");
      }

      broadcastConnectToken({
        token: data.token,
        apiUrl: data.apiUrl,
        shop: data.shop,
      });

      showToast("Extension connected");

      await new Promise((resolve) => window.setTimeout(resolve, 500));
      await loadStatus();
      onConnected?.();
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : "Failed to connect extension"
      );
    } finally {
      setConnecting(false);
    }
  }

  if (verified) {
    return null;
  }

  return (
    <s-banner heading="Connect your Chrome extension" tone="warning">
      <s-stack gap="base">
        <s-paragraph>
          {extensionInstalled
            ? "The Revora Chrome extension is installed but not linked to this store yet. Keep this admin tab open and click Connect."
            : "Install the Revora Chrome extension, then return here and click Connect while this admin tab stays open."}
        </s-paragraph>
        <s-stack alignItems="center" direction="inline" gap="small">
          <s-button
            icon="connect"
            loading={connecting}
            onClick={() => void connectExtension()}
            variant="primary"
          >
            Connect extension
          </s-button>
          {extensionInstalled ? null : (
            <s-button
              icon="external"
              onClick={openChromeWebStore}
              variant="secondary"
            >
              Get extension
            </s-button>
          )}
        </s-stack>
        {error ? <s-text tone="critical">{error}</s-text> : null}
      </s-stack>
    </s-banner>
  );
}
