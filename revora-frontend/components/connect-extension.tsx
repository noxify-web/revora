"use client"

import { useCallback, useEffect, useState } from "react"

const ROTATE_TOKEN_MODAL_ID = "revora-rotate-token-modal"

import type { ConnectTokenResponse } from "@revora/shared/extension-types"
import { broadcastConnectToken } from "@/components/extension-bridge"
import { adminFetch, readAdminJson } from "@/lib/admin-fetch"

type ExtensionToken = {
  id: string
  label: string
  createdAt: string
  lastUsedAt: string | null
}

function showToast(message: string) {
  window.shopify?.toast?.show(message)
}

type ConnectExtensionProps = {
  onConnected?: () => void
  compact?: boolean
  checkStatusOnMount?: boolean
}

export function ConnectExtension({
  onConnected,
  compact = false,
  checkStatusOnMount = true,
}: ConnectExtensionProps) {
  const [tokens, setTokens] = useState<ExtensionToken[]>([])
  const [connectPayload, setConnectPayload] =
    useState<ConnectTokenResponse | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [loadingTokens, setLoadingTokens] = useState(checkStatusOnMount)
  const [error, setError] = useState<string | null>(null)

  const loadTokens = useCallback(async () => {
    setLoadingTokens(true)
    setError(null)

    try {
      const response = await adminFetch("/api/extension/token")
      const data = await readAdminJson<{ tokens?: ExtensionToken[]; error?: string }>(
        response,
      )

      if (!response.ok) {
        throw new Error(data.error || "Failed to load extension status")
      }
      setTokens(data.tokens ?? [])
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load extension status",
      )
    } finally {
      setLoadingTokens(false)
    }
  }, [])

  useEffect(() => {
    if (!checkStatusOnMount) {
      return
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch token status on mount
    void loadTokens()
  }, [checkStatusOnMount, loadTokens])

  async function connectExtension() {
    setConnecting(true)
    setError(null)
    setConnectPayload(null)

    try {
      const response = await adminFetch("/api/extension/token", {
        method: "POST",
        body: JSON.stringify({ label: "Chrome extension" }),
      })

      const data = await readAdminJson<ConnectTokenResponse & { error?: string }>(
        response,
      )

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect extension")
      }
      setConnectPayload(data)

      broadcastConnectToken({
        token: data.token,
        apiUrl: data.apiUrl,
        shop: data.shop,
      })

      showToast("Extension connected")
      await loadTokens()
      onConnected?.()
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : "Failed to connect extension",
      )
    } finally {
      setConnecting(false)
    }
  }

  const activeToken = tokens[0]
  const isConnected = Boolean(activeToken || connectPayload)

  return (
    <s-stack gap={compact ? "small-200" : "base"}>
      <s-grid
        gridTemplateColumns="1fr auto"
        gap={compact ? "small" : "base"}
        alignItems="center"
      >
        <s-grid-item>
          <s-stack gap="small-200">
            {compact ? null : (
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-icon type="app-extension" size="small" />
                <s-heading>Revora Chrome extension</s-heading>
              </s-stack>
            )}
            <s-stack direction="inline" gap="small" alignItems="center">
              {!loadingTokens ? (
                <s-icon
                  type={isConnected ? "check-circle" : "alert-circle"}
                  tone={isConnected ? "success" : "warning"}
                  size="small"
                />
              ) : null}
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
          {!isConnected ? (
            <s-button
              variant="primary"
              icon="connect"
              onClick={() => void connectExtension()}
              loading={connecting}
            >
              Connect
            </s-button>
          ) : (
            <s-button
              variant="secondary"
              icon="refresh"
              commandFor={ROTATE_TOKEN_MODAL_ID}
              command="--show"
              disabled={connecting}
            >
              Rotate token
            </s-button>
          )}
        </s-grid-item>
      </s-grid>

      {compact ? (
        <s-banner heading="Connect your extension" tone="info">
          <s-paragraph>
            Click Connect below to link the Chrome extension to this store.
            Keep this tab open while importing from Temu.
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

      {!compact && !loadingTokens && activeToken?.lastUsedAt ? (
        <s-text color="subdued">
          Last used {new Date(activeToken.lastUsedAt).toLocaleString()}
        </s-text>
      ) : null}

      {error ? (
        <s-banner heading="Connection error" tone="critical">
          <s-stack gap="small">
            <s-text>{error}</s-text>
            <s-button variant="secondary" onClick={() => void loadTokens()}>
              Try again
            </s-button>
          </s-stack>
        </s-banner>
      ) : null}

      <s-modal id={ROTATE_TOKEN_MODAL_ID} heading="Rotate extension token?">
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
          slot="primary-action"
          variant="primary"
          loading={connecting}
          commandFor={ROTATE_TOKEN_MODAL_ID}
          command="--hide"
          onClick={() => void connectExtension()}
        >
          Rotate token
        </s-button>
        <s-button
          slot="secondary-actions"
          commandFor={ROTATE_TOKEN_MODAL_ID}
          command="--hide"
        >
          Cancel
        </s-button>
      </s-modal>
    </s-stack>
  )
}