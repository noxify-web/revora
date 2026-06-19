"use client"

import { useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { broadcastConnectCode } from "@/components/extension-bridge"
import { adminFetch } from "@/lib/admin-fetch"

type ConnectPayload = {
  code: string
  expiresAt: string
  apiUrl: string
}

export function ConnectExtension() {
  const [payload, setPayload] = useState<ConnectPayload | null>(null)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createCode() {
    setCreating(true)
    setError(null)
    setCopied(false)

    try {
      const response = await adminFetch("/api/extension/connect", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to create connect code")
      }

      const data = await response.json()
      setPayload(data)

      broadcastConnectCode({
        code: data.code,
        apiUrl: data.apiUrl,
        expiresAt: data.expiresAt,
      })
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create connect code"
      )
    } finally {
      setCreating(false)
    }
  }

  async function copyCode() {
    if (!payload?.code) return
    await navigator.clipboard.writeText(payload.code)
    setCopied(true)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Generate a code, paste it in the Chrome extension popup (or click{" "}
        <strong>Fill from admin</strong>), then click <strong>Connect</strong>.
        Keep this Revora tab open while using the extension.
      </p>

      <Button onClick={() => void createCode()} disabled={creating}>
        {creating ? "Generating..." : "Generate connect code"}
      </Button>

      {payload ? (
        <Alert className="border-[#FFD8B8] bg-[#FFF4EB]">
          <AlertTitle className="text-[#E56B00]">Connect code</AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="text-3xl font-bold tracking-[0.3em] text-[#FB7701]">
              {payload.code}
            </p>
            <p className="text-sm text-muted-foreground">
              Expires {new Date(payload.expiresAt).toLocaleTimeString()}.
            </p>
            <Button variant="outline" size="sm" onClick={() => void copyCode()}>
              {copied ? "Copied code" : "Copy code"}
            </Button>
          </AlertDescription>
        </Alert>
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
