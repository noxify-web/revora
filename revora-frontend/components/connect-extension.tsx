"use client"

import { useCallback, useEffect, useState } from "react"

import type { ConnectTokenResponse } from "@revora/shared/extension-types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Click <strong>Connect extension</strong> while Revora is open here.
        The Chrome extension pairs automatically. Keep this tab open while
        importing from Temu.
      </p>

      <div className="flex flex-col items-start gap-2">
        <Button
          className="bg-[#FB7701] text-white hover:bg-[#E56B00]"
          onClick={() => void connectExtension()}
          disabled={connecting}
        >
          {connecting ? "Connecting..." : "Connect extension"}
        </Button>

        <p className="text-sm text-muted-foreground">
          If automatic pairing does not work, open the extension popup and click{" "}
          <strong>Sign in with Revora</strong>.
        </p>
      </div>

      {connectPayload ? (
        <Alert className="border-[#FFD8B8] bg-[#FFF4EB]">
          <AlertTitle className="text-[#E56B00]">Extension connected</AlertTitle>
          <AlertDescription className="space-y-1 text-sm">
            <p>
              Linked to <strong>{connectPayload.shop}</strong> on the{" "}
              {connectPayload.planName} plan.
            </p>
            <p className="text-muted-foreground">
              Open the extension popup on Temu to confirm the status shows
              connected.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}

      {!loadingTokens && activeToken ? (
        <p className="text-sm text-muted-foreground">
          Active link: {activeToken.label}
          {activeToken.lastUsedAt
            ? ` · last used ${new Date(activeToken.lastUsedAt).toLocaleString()}`
            : " · not used yet"}
        </p>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Connection error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}