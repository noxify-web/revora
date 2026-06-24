"use client";

import type { ConnectTokenResponse } from "@revora/shared/extension-types";
import { useCallback, useEffect, useRef, useState } from "react";
import { broadcastConnectToken } from "@/components/extension-bridge";
import {
  ExtensionConnectedModal,
  openExtensionConnectedModal,
} from "@/components/extension-connected-modal";
import { openChromeWebStore } from "@/components/onboarding-shared";
import { adminFetch, readAdminJson } from "@/lib/admin-fetch";
import {
  isExtensionLinked,
  waitForExtensionPairingAfterConnect,
} from "@/lib/extension/client-status";
import { resolveExtensionLinkState } from "@/lib/extension/link-state";
import { EXTENSION_CONNECT_GUIDE } from "@/lib/onboarding/constants";
import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus";

interface ExtensionConnectBannerProps {
  onConnected?: () => void;
  refreshToken?: number;
}

export function ExtensionConnectBanner({
  onConnected,
  refreshToken = 0,
}: ExtensionConnectBannerProps) {
  const optimisticVerifiedRef = useRef(false);
  const [verified, setVerified] = useState(false);
  const [extensionInstalled, setExtensionInstalled] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const { linked, status } = await resolveExtensionLinkState();
      setExtensionInstalled(status.installed);
      setVerified(
        linked || (optimisticVerifiedRef.current && status.installed)
      );
      setError(null);
    } catch {
      setExtensionInstalled(false);
      setVerified(optimisticVerifiedRef.current);
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

      const status = await waitForExtensionPairingAfterConnect();
      setExtensionInstalled(status.installed);

      if (!status.installed) {
        throw new Error(
          "Token created but the Revora extension was not detected. Install the extension, keep this tab open, and click Connect again."
        );
      }

      if (!isExtensionLinked(status)) {
        throw new Error(
          "Token created but the extension did not finish pairing. Keep this tab open and click Connect again."
        );
      }

      optimisticVerifiedRef.current = true;
      setVerified(true);
      openExtensionConnectedModal();
      onConnected?.();
      void loadStatus();
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

  return (
    <>
      {verified ? null : (
        <s-banner heading={EXTENSION_CONNECT_GUIDE.heading} tone="warning">
          <s-stack gap="base">
            <s-paragraph>
              {extensionInstalled
                ? EXTENSION_CONNECT_GUIDE.installed
                : EXTENSION_CONNECT_GUIDE.notInstalled}
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
      )}

      <ExtensionConnectedModal />
    </>
  );
}
