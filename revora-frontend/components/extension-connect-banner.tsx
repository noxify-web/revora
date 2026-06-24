"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { broadcastConnectToken } from "@/components/extension-bridge";
import {
  ExtensionConnectedModal,
  openExtensionConnectedModal,
} from "@/components/extension-connected-modal";
import { openChromeWebStore } from "@/components/onboarding-shared";
import {
  invalidateExtensionLinkStateCache,
  resolveExtensionLinkState,
} from "@/lib/extension/link-state";
import { mintAndBroadcastConnectToken } from "@/lib/extension/pairing-confirm";
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
  const connectingRef = useRef(false);
  const [verified, setVerified] = useState(false);
  const [extensionInstalled, setExtensionInstalled] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (connectingRef.current) {
      return;
    }

    try {
      const { linked, status } = await resolveExtensionLinkState();
      setExtensionInstalled(status.installed);
      setVerified(linked);
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
    if (connectingRef.current) {
      return;
    }

    void loadStatus();
  });

  async function connectExtension() {
    connectingRef.current = true;
    setConnecting(true);
    setError(null);

    try {
      await mintAndBroadcastConnectToken(broadcastConnectToken);

      invalidateExtensionLinkStateCache();
      setVerified(true);
      setExtensionInstalled(true);
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
      connectingRef.current = false;
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
