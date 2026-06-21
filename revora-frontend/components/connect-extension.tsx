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

export function ConnectExtension() {
  const [tokens, setTokens] = useState<ExtensionToken[]>([])
  const [connectPayload, setConnectPayload] =
    useState<ConnectTokenResponse | null>(null)
  const [connecting, setConnecting] = useState(false)
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
        plan: data.plan,
        planName: data.planName,
        reviewLimit: data.reviewLimit,
      })

      await loadTokens()
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

  return (
    <s-stack gap="base">
      <s-paragraph color="subdued">
        Click <s-text type="strong">Connect extension</s-text> while Revora is
        open here. The Chrome extension pairs automatically. Keep this tab open
        while importing from Temu.
      </s-paragraph>

      <s-stack gap="small">
        <s-button
          variant="primary"
          onClick={() => void connectExtension()}
          loading={connecting}
        >
          Connect extension
        </s-button>
        <s-paragraph color="subdued">
          If automatic pairing does not work, open the extension popup and click{" "}
          <s-text type="strong">Sign in with Revora</s-text>.
        </s-paragraph>
      </s-stack>

      {connectPayload ? (
        <s-banner heading="Extension connected" tone="success">
          <s-paragraph>
            Linked to <s-text type="strong">{connectPayload.shop}</s-text> on
            the {connectPayload.planName} plan.
          </s-paragraph>
          <s-paragraph color="subdued">
            Open the extension popup on Temu to confirm the status shows
            connected.
          </s-paragraph>
        </s-banner>
      ) : null}

      {!loadingTokens && activeToken ? (
        <s-paragraph color="subdued">
          Active link: {activeToken.label}
          {activeToken.lastUsedAt
            ? ` · last used ${new Date(activeToken.lastUsedAt).toLocaleString()}`
            : " · not used yet"}
        </s-paragraph>
      ) : null}

      {error ? (
        <s-banner heading="Connection error" tone="critical">
          {error}
        </s-banner>
      ) : null}
    </s-stack>
  )
}