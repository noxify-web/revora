"use client"

import { useCallback, useEffect, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { encodePairingCode } from "@/lib/extension/pairing-code"

type ExtensionToken = {
  id: string
  label: string
  createdAt: string
  lastUsedAt: string | null
}

type ImportRecord = {
  id: string
  temuGoodsId: string
  temuProductTitle: string | null
  shopifyProductTitle: string | null
  status: string
  totalExpected: number | null
  totalImported: number
  createdAt: string
}

async function getSessionToken() {
  if (typeof window !== "undefined" && window.shopify?.idToken) {
    return window.shopify.idToken()
  }

  const params = new URLSearchParams(window.location.search)
  return params.get("id_token")
}

async function adminFetch(path: string, init?: RequestInit) {
  const token = await getSessionToken()
  const url = new URL(path, window.location.origin)
  const pageParams = new URLSearchParams(window.location.search)

  pageParams.forEach((value, key) => {
    if (!url.searchParams.has(key)) {
      url.searchParams.set(key, value)
    }
  })

  const headers = new Headers(init?.headers)

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  if (init?.body) {
    headers.set("Content-Type", "application/json")
  }

  const search = url.searchParams.toString()

  return fetch(search ? `${url.pathname}?${search}` : url.pathname, {
    ...init,
    headers,
  })
}

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function ExtensionPairing() {
  const [tokens, setTokens] = useState<ExtensionToken[]>([])
  const [imports, setImports] = useState<ImportRecord[]>([])
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [tokenOnlyCode, setTokenOnlyCode] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [tokenResponse, importResponse] = await Promise.all([
        adminFetch("/api/extension/token"),
        adminFetch("/api/imports"),
      ])

      if (!tokenResponse.ok || !importResponse.ok) {
        throw new Error("Failed to load extension data")
      }

      const tokenData = await tokenResponse.json()
      const importData = await importResponse.json()

      setTokens(tokenData.tokens ?? [])
      setImports(importData.imports ?? [])
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load extension data",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  async function createToken() {
    setCreating(true)
    setError(null)
    setPairingCode(null)
    setTokenOnlyCode(null)
    setCopied(false)
    setCopiedToken(false)

    try {
      const response = await adminFetch("/api/extension/token", {
        method: "POST",
        body: JSON.stringify({ label: "Chrome extension" }),
      })

      if (!response.ok) {
        throw new Error("Failed to create pairing token")
      }

      const data = await response.json()

      if (!data.apiUrl || !data.token) {
        throw new Error("Server did not return a pairing code payload")
      }

      setServerUrl(data.apiUrl)
      setPairingCode(
        encodePairingCode({
          apiUrl: data.apiUrl,
          token: data.token,
        }),
      )
      setTokenOnlyCode(
        encodePairingCode({
          token: data.token,
        }),
      )
      await loadData()
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create pairing token",
      )
    } finally {
      setCreating(false)
    }
  }

  async function revokeToken(id: string) {
    setError(null)

    try {
      const response = await adminFetch(
        `/api/extension/token?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      )

      if (!response.ok) {
        throw new Error("Failed to revoke token")
      }

      await loadData()
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : "Failed to revoke token",
      )
    }
  }

  async function copyPairingCode() {
    if (!pairingCode) return
    await navigator.clipboard.writeText(pairingCode)
    setCopied(true)
    setCopiedToken(false)
  }

  async function copyTokenOnlyCode() {
    if (!tokenOnlyCode) return
    await navigator.clipboard.writeText(tokenOnlyCode)
    setCopiedToken(true)
    setCopied(false)
  }

  async function copyServerUrl() {
    const url =
      typeof window !== "undefined" ? window.location.origin : serverUrl
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setCopiedToken(false)
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Generate a pairing code and paste it into the Revora Chrome extension.
        During local dev the Cloudflare tunnel URL changes when you restart{" "}
        <code>shopify app dev</code> — keep Revora admin open and click{" "}
        <strong>Sync URL</strong> in the extension popup instead of generating a
        new code.
      </p>

      {typeof window !== "undefined" ? (
        <Alert>
          <AlertTitle>Current server URL</AlertTitle>
          <AlertDescription className="space-y-3">
            <code className="block overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs text-foreground">
              {window.location.origin}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void copyServerUrl()}
            >
              Copy server URL
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <Button onClick={() => void createToken()} disabled={creating}>
        {creating ? "Generating..." : "Generate pairing code"}
      </Button>

      {pairingCode ? (
        <Alert>
          <AlertTitle>New pairing code</AlertTitle>
          <AlertDescription className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm">
                Recommended for dev: copy the token-only code once. When the
                tunnel URL changes, open this page and click{" "}
                <strong>Sync URL</strong> in the extension popup.
              </p>
              {tokenOnlyCode ? (
                <>
                  <p className="text-xs font-medium text-foreground">
                    Token-only code
                  </p>
                  <code className="block overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs text-foreground">
                    {tokenOnlyCode}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void copyTokenOnlyCode()}
                  >
                    {copiedToken ? "Copied" : "Copy token-only code"}
                  </Button>
                </>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">
                Full code (token + current URL)
              </p>
              <code className="block overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs text-foreground">
                {pairingCode}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void copyPairingCode()}
              >
                {copied ? "Copied" : "Copy full pairing code"}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Separator />

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Active tokens</h3>
          <p className="text-sm text-muted-foreground">
            Tokens currently linked to your Chrome extension.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active tokens yet.</p>
        ) : (
          <div className="space-y-3">
            {tokens.map((token) => (
              <Card key={token.id} size="sm">
                <CardHeader>
                  <CardTitle>{token.label}</CardTitle>
                  <CardDescription>
                    Created {new Date(token.createdAt).toLocaleString()}
                    {token.lastUsedAt
                      ? ` · Last used ${new Date(token.lastUsedAt).toLocaleString()}`
                      : " · Never used"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => void revokeToken(token.id)}
                  >
                    Revoke
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Recent imports</h3>
          <p className="text-sm text-muted-foreground">
            Imports started from Temu product pages.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : imports.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No imports yet. Use the Chrome extension on a Temu product page.
          </p>
        ) : (
          <div className="space-y-3">
            {imports.map((item) => (
              <Card key={item.id} size="sm">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle>
                        {item.temuProductTitle ||
                          `Temu product ${item.temuGoodsId}`}
                      </CardTitle>
                      <CardDescription>
                        {item.shopifyProductTitle
                          ? `Mapped to ${item.shopifyProductTitle}`
                          : "No Shopify product mapped"}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{formatStatus(item.status)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {item.totalImported}
                  {item.totalExpected ? ` / ${item.totalExpected}` : ""} reviews ·{" "}
                  {new Date(item.createdAt).toLocaleString()}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}