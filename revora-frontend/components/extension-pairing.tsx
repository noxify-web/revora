"use client"

import { useCallback, useEffect, useState } from "react"

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
  const [originUrl, setOriginUrl] = useState<string | null>(null)
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
    setOriginUrl(window.location.origin)
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
    const url = originUrl ?? serverUrl
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setCopiedToken(false)
  }

  return (
    <s-stack gap="large">
      <s-paragraph color="subdued">
        Generate a pairing code and paste it into the Revora Chrome extension.
        During local dev the Cloudflare tunnel URL changes when you restart{" "}
        <s-text type="strong">shopify app dev</s-text> — keep Revora admin open
        and click <s-text type="strong">Sync URL</s-text> in the extension popup
        instead of generating a new code.
      </s-paragraph>

      {originUrl ? (
        <s-banner heading="Current server URL" tone="info">
          <s-stack gap="small">
            <s-box padding="base" background="subdued" borderRadius="base">
              <s-text>{originUrl}</s-text>
            </s-box>
            <s-button variant="secondary" onClick={() => void copyServerUrl()}>
              Copy server URL
            </s-button>
          </s-stack>
        </s-banner>
      ) : null}

      <s-button
        variant="primary"
        onClick={() => void createToken()}
        loading={creating}
      >
        Generate pairing code
      </s-button>

      {pairingCode ? (
        <s-banner heading="New pairing code" tone="success">
          <s-stack gap="base">
            <s-paragraph>
              Recommended for dev: copy the token-only code once. When the tunnel
              URL changes, open this page and click{" "}
              <s-text type="strong">Sync URL</s-text> in the extension popup.
            </s-paragraph>

            {tokenOnlyCode ? (
              <s-stack gap="small">
                <s-text type="strong">Token-only code</s-text>
                <s-box padding="base" background="subdued" borderRadius="base">
                  <s-text>{tokenOnlyCode}</s-text>
                </s-box>
                <s-button
                  variant="secondary"
                  onClick={() => void copyTokenOnlyCode()}
                >
                  {copiedToken ? "Copied" : "Copy token-only code"}
                </s-button>
              </s-stack>
            ) : null}

            <s-stack gap="small">
              <s-text type="strong">Full code (token + current URL)</s-text>
              <s-box padding="base" background="subdued" borderRadius="base">
                <s-text>{pairingCode}</s-text>
              </s-box>
              <s-button variant="secondary" onClick={() => void copyPairingCode()}>
                {copied ? "Copied" : "Copy full pairing code"}
              </s-button>
            </s-stack>
          </s-stack>
        </s-banner>
      ) : null}

      {error ? (
        <s-banner heading="Something went wrong" tone="critical">
          {error}
        </s-banner>
      ) : null}

      <s-divider />

      <s-section heading="Active tokens">
        <s-stack gap="base">
          <s-paragraph color="subdued">
            Tokens currently linked to your Chrome extension.
          </s-paragraph>

          {loading ? (
            <s-paragraph color="subdued">Loading...</s-paragraph>
          ) : tokens.length === 0 ? (
            <s-paragraph color="subdued">No active tokens yet.</s-paragraph>
          ) : (
            <s-stack gap="small">
              {tokens.map((token) => (
                <s-box
                  key={token.id}
                  padding="base"
                  border="base"
                  borderRadius="base"
                >
                  <s-stack gap="small">
                    <s-text type="strong">{token.label}</s-text>
                    <s-paragraph color="subdued">
                      Created {new Date(token.createdAt).toLocaleString()}
                      {token.lastUsedAt
                        ? ` · Last used ${new Date(token.lastUsedAt).toLocaleString()}`
                        : " · Never used"}
                    </s-paragraph>
                    <s-button
                      variant="secondary"
                      tone="critical"
                      onClick={() => void revokeToken(token.id)}
                    >
                      Revoke
                    </s-button>
                  </s-stack>
                </s-box>
              ))}
            </s-stack>
          )}
        </s-stack>
      </s-section>

      <s-divider />

      <s-section heading="Recent imports">
        <s-stack gap="base">
          <s-paragraph color="subdued">
            Imports started from Temu product pages.
          </s-paragraph>

          {loading ? (
            <s-paragraph color="subdued">Loading...</s-paragraph>
          ) : imports.length === 0 ? (
            <s-paragraph color="subdued">
              No imports yet. Use the Chrome extension on a Temu product page.
            </s-paragraph>
          ) : (
            <s-stack gap="small">
              {imports.map((item) => (
                <s-box
                  key={item.id}
                  padding="base"
                  border="base"
                  borderRadius="base"
                  background="subdued"
                >
                  <s-grid
                    gridTemplateColumns="1fr auto"
                    gap="small"
                    alignItems="start"
                  >
                    <s-stack gap="small-200">
                      <s-text type="strong">
                        {item.temuProductTitle ||
                          `Temu product ${item.temuGoodsId}`}
                      </s-text>
                      <s-paragraph color="subdued">
                        {item.shopifyProductTitle
                          ? `Mapped to ${item.shopifyProductTitle}`
                          : "No Shopify product mapped"}
                      </s-paragraph>
                    </s-stack>
                    <s-badge tone="info">{formatStatus(item.status)}</s-badge>
                  </s-grid>
                  <s-paragraph color="subdued">
                    {item.totalImported}
                    {item.totalExpected ? ` / ${item.totalExpected}` : ""}{" "}
                    reviews · {new Date(item.createdAt).toLocaleString()}
                  </s-paragraph>
                </s-box>
              ))}
            </s-stack>
          )}
        </s-stack>
      </s-section>
    </s-stack>
  )
}