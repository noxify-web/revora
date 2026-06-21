"use client"

import { useCallback, useEffect, useState } from "react"

import type { ConnectTokenResponse } from "@revora/shared/extension-types"
import { broadcastConnectToken } from "@/components/extension-bridge"
import { adminFetch } from "@/lib/admin-fetch"

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
}

export function ConnectExtension({ onConnected }: ConnectExtensionProps) {
  const [tokens, setTokens] = useState<ExtensionToken[]>([])
  const [connectPayload, setConnectPayload] =
    useState<ConnectTokenResponse | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [confirmRotate, setConfirmRotate] = useState(false)
  const [loadingTokens, setLoadingTokens] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTokens = useCallback(async () => {
    setLoadingTokens(true)
    setError(null)

    try {
      const response = await adminFetch("/api/extension/token")
      if (!response.ok) {
        throw new Error("Failed to load extension status")
      }

      const data = await response.json()
      setTokens(data.tokens ?? [])
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load extension status"
      )
    } finally {
      setLoadingTokens(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch token status on mount
    void loadTokens()
  }, [loadTokens])

  async function connectExtension() {
    setConnecting(true)
    setError(null)
    setConnectPayload(null)

    try {
      const response = await adminFetch("/api/extension/token", {
        method: "POST",
        body: JSON.stringify({ label: "Chrome extension" }),
      })

      if (!response.ok) {
        throw new Error("Failed to connect extension")
      }

      const data = (await response.json()) as ConnectTokenResponse
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
          : "Failed to connect extension"
      )
    } finally {
      setConnecting(false)
    }
  }

  const activeToken = tokens[0]
  const isConnected = Boolean(activeToken || connectPayload)

  return (
    <s-stack gap="base">
      <s-grid gridTemplateColumns="1fr auto" gap="base" alignItems="center">
        <s-stack>
          <s-heading>Revora Chrome extension</s-heading>
          <s-text color="subdued">
            {loadingTokens
              ? "Checking connection..."
              : isConnected
                ? `Connected${activeToken ? ` · ${activeToken.label}` : ""}`
                : "No account connected"}
          </s-text>
        </s-stack>
        {!isConnected ? (
          <s-button
            variant="primary"
            onClick={() => void connectExtension()}
            loading={connecting}
          >
            Connect
          </s-button>
        ) : (
          <s-button
            variant="secondary"
            onClick={() => setConfirmRotate(true)}
            disabled={connecting}
          >
            Rotate token
          </s-button>
        )}
      </s-grid>

      {confirmRotate ? (
        <s-banner heading="Rotate extension token?" tone="warning">
          <s-stack gap="base">
            <s-paragraph>
              This creates a new token and may disconnect the extension on other
              devices or browsers.
            </s-paragraph>
            <s-stack direction="inline" gap="small">
              <s-button
                variant="primary"
                loading={connecting}
                onClick={() => {
                  setConfirmRotate(false)
                  void connectExtension()
                }}
              >
                Rotate token
              </s-button>
              <s-button
                variant="secondary"
                onClick={() => setConfirmRotate(false)}
              >
                Cancel
              </s-button>
            </s-stack>
          </s-stack>
        </s-banner>
      ) : null}

      <s-text color="subdued">
        Keep this Revora admin tab open while importing from Temu. If automatic
        pairing does not work, open the extension popup and click{" "}
        <s-text type="strong">Sign in with Revora</s-text>.
      </s-text>

      {connectPayload ? (
        <s-banner heading="Extension connected" tone="success">
          <s-paragraph>
            Linked to <s-text type="strong">{connectPayload.shop}</s-text>.
          </s-paragraph>
        </s-banner>
      ) : null}

      {!loadingTokens && activeToken?.lastUsedAt ? (
        <s-text color="subdued">
          Last used {new Date(activeToken.lastUsedAt).toLocaleString()}
        </s-text>
      ) : null}

      {error ? (
        <s-banner heading="Connection error" tone="critical">
          {error}
        </s-banner>
      ) : null}
    </s-stack>
  )
}