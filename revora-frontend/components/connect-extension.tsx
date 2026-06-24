"use client";

import { useCallback, useEffect, useState } from "react";

const ROTATE_TOKEN_MODAL_ID = "revora-rotate-token-modal";

import type { ConnectTokenResponse } from "@revora/shared/extension-types";
import { broadcastConnectToken } from "@/components/extension-bridge";
import { adminFetchNoBounce, readAdminJson } from "@/lib/admin-fetch";
import { mintAndBroadcastConnectToken } from "@/lib/extension/pairing-confirm";

interface ExtensionToken {
  createdAt: string;
  id: string;
  label: string;
  lastUsedAt: string | null;
}

function showToast(message: string) {
  window.shopify?.toast?.show(message);
}

interface ConnectExtensionProps {
  checkStatusOnMount?: boolean;
  compact?: boolean;
  onConnected?: () => void;
}

export function ConnectExtension({
  onConnected,
  compact = false,
  checkStatusOnMount = true,
}: ConnectExtensionProps) {
  const [tokens, setTokens] = useState<ExtensionToken[]>([]);
  const [connectPayload, setConnectPayload] =
    useState<ConnectTokenResponse | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(checkStatusOnMount);
  const [error, setError] = useState<string | null>(null);

  const loadTokens = useCallback(async () => {
    setLoadingTokens(true);
    setError(null);

    try {
      const response = await adminFetchNoBounce("/api/extension/token");

      if (!response) {
        setTokens([]);
        return;
      }

      const data = await readAdminJson<{
        tokens?: ExtensionToken[];
        error?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(data.error || "Failed to load extension status");
      }
      setTokens(data.tokens ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load extension status"
      );
    } finally {
      setLoadingTokens(false);
    }
  }, []);

  useEffect(() => {
    if (!checkStatusOnMount) {
      return;
    }

    void loadTokens();
  }, [checkStatusOnMount, loadTokens]);

  async function connectExtension() {
    setConnecting(true);
    setError(null);
    setConnectPayload(null);

    try {
      const data = await mintAndBroadcastConnectToken(broadcastConnectToken);
      setConnectPayload(data as ConnectTokenResponse);

      showToast("Extension connected");
      await loadTokens();
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

  const activeToken = tokens[0];
  const isConnected = Boolean(activeToken?.lastUsedAt || connectPayload);

  return (
    <s-stack gap={compact ? "small-200" : "base"}>
      <s-grid
        alignItems="center"
        gap={compact ? "small" : "base"}
        gridTemplateColumns="1fr auto"
      >
        <s-grid-item>
          <s-stack gap="small-200">
            {compact ? null : (
              <s-stack alignItems="center" direction="inline" gap="small">
                <s-icon size="small" type="app-extension" />
                <s-heading>Revora Chrome extension</s-heading>
              </s-stack>
            )}
            <s-stack alignItems="center" direction="inline" gap="small">
              {loadingTokens ? null : (
                <s-icon
                  size="small"
                  tone={isConnected ? "success" : "warning"}
                  type={isConnected ? "check-circle" : "alert-circle"}
                />
              )}
              <s-text color="subdued">
                {loadingTokens
                  ? "Checking connection..."
                  : isConnected
                    ? `Connected${activeToken ? ` · ${activeToken.label}` : ""}`
                    : "No account connected"}
              </s-text>
            </s-stack>
          </s-stack>
        </s-grid-item>
        <s-grid-item>
          {isConnected ? (
            <s-button
              command="--show"
              commandFor={ROTATE_TOKEN_MODAL_ID}
              disabled={connecting}
              icon="refresh"
              variant="secondary"
            >
              Rotate token
            </s-button>
          ) : (
            <s-button
              icon="connect"
              loading={connecting}
              onClick={() => void connectExtension()}
              variant="primary"
            >
              Connect
            </s-button>
          )}
        </s-grid-item>
      </s-grid>

      {compact ? (
        <s-banner heading="Connect your extension" tone="info">
          <s-paragraph>
            Click Connect below to link the Chrome extension to this store. Keep
            this tab open while importing from Temu.
          </s-paragraph>
        </s-banner>
      ) : null}

      {compact ? null : (
        <s-text color="subdued">
          Click Connect to link the Chrome extension. The extension syncs
          automatically when this Revora tab stays open.
        </s-text>
      )}

      {!compact && connectPayload ? (
        <s-banner heading="Extension connected" tone="success">
          <s-paragraph>
            Linked to <s-text type="strong">{connectPayload.shop}</s-text>.
          </s-paragraph>
        </s-banner>
      ) : null}

      {!(compact || loadingTokens) && activeToken?.lastUsedAt ? (
        <s-text color="subdued">
          Last used {new Date(activeToken.lastUsedAt).toLocaleString()}
        </s-text>
      ) : null}

      {error ? (
        <s-banner heading="Connection error" tone="critical">
          <s-stack gap="small">
            <s-text>{error}</s-text>
            <s-button onClick={() => void loadTokens()} variant="secondary">
              Try again
            </s-button>
          </s-stack>
        </s-banner>
      ) : null}

      <s-modal heading="Rotate extension token?" id={ROTATE_TOKEN_MODAL_ID}>
        <s-stack gap="base">
          <s-text>
            This creates a new token and may disconnect the extension on other
            devices or browsers.
          </s-text>
          <s-banner tone="warning">
            <s-text>
              Use this only if pairing is broken or you need to revoke access on
              another device.
            </s-text>
          </s-banner>
        </s-stack>
        <s-button
          command="--hide"
          commandFor={ROTATE_TOKEN_MODAL_ID}
          loading={connecting}
          onClick={() => void connectExtension()}
          slot="primary-action"
          variant="primary"
        >
          Rotate token
        </s-button>
        <s-button
          command="--hide"
          commandFor={ROTATE_TOKEN_MODAL_ID}
          slot="secondary-actions"
        >
          Cancel
        </s-button>
      </s-modal>
    </s-stack>
  );
}
