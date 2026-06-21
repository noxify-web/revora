"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { adminFetch } from "@/lib/admin-fetch"

type CatalogProduct = {
  id: string
  title: string
  handle: string
  reviewCount: number
  pictureCount: number
  publishStatus: string | null
  importId: string | null
}

type ImportRecord = {
  id: string
  shopifyProductId: string | null
  totalImported: number
  totalPublished: number
  publishStatus: string
}

type ProductCatalogTableProps = {
  shop: string
  id?: string
  onPublished?: () => void
}

function getShopSlug(shop: string) {
  return shop.replace(/\.myshopify\.com$/i, "")
}

function getProductAdminUrl(shop: string, productId: string) {
  const numericId = productId.split("/").pop() ?? productId
  return `https://admin.shopify.com/store/${getShopSlug(shop)}/products/${numericId}`
}

function canPublish(
  product: CatalogProduct,
  importRecord?: ImportRecord,
) {
  if (!product.importId || !importRecord) return false
  if (importRecord.totalImported === 0) return false
  return importRecord.totalImported > importRecord.totalPublished
}

export function ProductCatalogTable({
  shop,
  id,
  onPublished,
}: ProductCatalogTableProps) {
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [imports, setImports] = useState<ImportRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [importHintProduct, setImportHintProduct] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [catalogResponse, importsResponse] = await Promise.all([
        adminFetch("/api/admin/catalog"),
        adminFetch("/api/imports"),
      ])

      if (!catalogResponse.ok) {
        throw new Error("Failed to load product catalog")
      }

      if (!importsResponse.ok) {
        throw new Error("Failed to load imports")
      }

      const catalogData = await catalogResponse.json()
      const importsData = await importsResponse.json()

      setProducts(catalogData.catalog ?? [])
      setImports(importsData.imports ?? [])
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load products",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch catalog on mount
    void loadData()
  }, [loadData])

  const importsByProductId = useMemo(() => {
    const map = new Map<string, ImportRecord>()
    for (const item of imports) {
      if (item.shopifyProductId) {
        map.set(item.shopifyProductId, item)
      }
    }
    return map
  }, [imports])

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return products
    return products.filter(
      (product) =>
        product.title.toLowerCase().includes(query) ||
        product.handle.toLowerCase().includes(query),
    )
  }, [products, search])

  async function publishImport(importId: string) {
    setPublishingId(importId)
    setError(null)
    setMessage(null)

    try {
      const response = await adminFetch(`/api/imports/${importId}/publish`, {
        method: "POST",
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || "Failed to publish reviews")
      }

      setMessage(
        `Published ${data.published ?? 0} reviews. Enable the Revora Reviews Widget in your theme to display them.`,
      )
      await loadData()
      onPublished?.()
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Failed to publish reviews",
      )
    } finally {
      setPublishingId(null)
    }
  }

  return (
    <Card id={id} className="border-border/80 shadow-sm">
      <CardHeader className="border-b border-border/60">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold">
            Step 1. Import reviews to your products below
          </CardTitle>
          <label className="relative w-full sm:max-w-xs">
            <span className="sr-only">Search products</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products"
              className="h-8 w-full rounded-md border border-input bg-background px-3 text-xs outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </label>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {message ? (
          <Alert className="m-4 border-[#FFD8B8] bg-[#FFF4EB]">
            <AlertTitle className="text-[#E56B00]">Published</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive" className="m-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {importHintProduct ? (
          <Alert className="mx-4 mt-4 border-[#FFD8B8] bg-[#FFF4EB]">
            <AlertTitle className="text-[#E56B00]">How to import</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                Open a Temu product page in Chrome, use the Revora extension, and
                map reviews to <strong>{importHintProduct}</strong>.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setImportHintProduct(null)}
              >
                Got it
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30 text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Shopify product</th>
                <th className="px-4 py-3 font-medium">Reviews</th>
                <th className="px-4 py-3 font-medium">Pictures</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    Loading products...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    {search
                      ? "No products match your search."
                      : "No Shopify products found yet."}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const importRecord = product.importId
                    ? imports.find((item) => item.id === product.importId)
                    : importsByProductId.get(product.id)
                  const showPublish = canPublish(product, importRecord)

                  return (
                    <tr
                      key={product.id}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="px-4 py-4">
                        <a
                          href={getProductAdminUrl(shop, product.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-[#0d7a6f] underline-offset-4 hover:underline"
                        >
                          {product.title}
                        </a>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {importRecord?.totalImported ?? product.reviewCount}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {product.pictureCount}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setImportHintProduct(product.title)}
                          >
                            Import
                          </Button>
                          {showPublish && product.importId ? (
                            <Button
                              size="sm"
                              className="bg-[#FB7701] text-white hover:bg-[#E56B00]"
                              disabled={publishingId === product.importId}
                              onClick={() => void publishImport(product.importId!)}
                            >
                              {publishingId === product.importId
                                ? "Publishing..."
                                : "Publish"}
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}