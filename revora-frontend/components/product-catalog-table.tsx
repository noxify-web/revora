"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

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

  function handleSearchInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement
    setSearch(target.value)
  }

  return (
    <s-section
      heading="Step 1. Import reviews to your products below"
      id={id}
      padding="none"
    >
      <s-stack gap="base">
        <s-box padding="base" paddingBlockEnd="none">
          <s-search-field
            label="Search products"
            labelAccessibilityVisibility="exclusive"
            placeholder="Search products"
            value={search}
            onInput={handleSearchInput}
          />
        </s-box>

        {message ? (
          <s-box paddingInline="base">
            <s-banner heading="Published" tone="success" dismissible>
              {message}
            </s-banner>
          </s-box>
        ) : null}

        {error ? (
          <s-box paddingInline="base">
            <s-banner heading="Error" tone="critical" dismissible>
              {error}
            </s-banner>
          </s-box>
        ) : null}

        {importHintProduct ? (
          <s-box paddingInline="base">
            <s-banner heading="How to import" tone="info" dismissible>
              <s-stack gap="small">
                <s-paragraph>
                  Open a Temu product page in Chrome, use the Revora extension,
                  and map reviews to{" "}
                  <s-text type="strong">{importHintProduct}</s-text>.
                </s-paragraph>
                <s-button
                  variant="secondary"
                  onClick={() => setImportHintProduct(null)}
                >
                  Got it
                </s-button>
              </s-stack>
            </s-banner>
          </s-box>
        ) : null}

        {loading ? (
          <s-box padding="large">
            <s-stack direction="inline" gap="small" alignItems="center">
              <s-spinner accessibilityLabel="Loading products" />
              <s-text color="subdued">Loading products...</s-text>
            </s-stack>
          </s-box>
        ) : filteredProducts.length === 0 ? (
          <s-box padding="large">
            <s-paragraph color="subdued">
              {search
                ? "No products match your search."
                : "No Shopify products found yet."}
            </s-paragraph>
          </s-box>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header listSlot="primary">
                Shopify product
              </s-table-header>
              <s-table-header format="numeric">Reviews</s-table-header>
              <s-table-header format="numeric">Pictures</s-table-header>
              <s-table-header>Actions</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {filteredProducts.map((product) => {
                const importRecord = product.importId
                  ? imports.find((item) => item.id === product.importId)
                  : importsByProductId.get(product.id)
                const showPublish = canPublish(product, importRecord)

                return (
                  <s-table-row key={product.id}>
                    <s-table-cell>
                      <s-link
                        href={getProductAdminUrl(shop, product.id)}
                        target="_blank"
                      >
                        {product.title}
                      </s-link>
                    </s-table-cell>
                    <s-table-cell>
                      {importRecord?.totalImported ?? product.reviewCount}
                    </s-table-cell>
                    <s-table-cell>{product.pictureCount}</s-table-cell>
                    <s-table-cell>
                      <s-stack direction="inline" gap="small">
                        <s-button
                          variant="secondary"
                          onClick={() => setImportHintProduct(product.title)}
                        >
                          Import
                        </s-button>
                        {showPublish && product.importId ? (
                          <s-button
                            variant="primary"
                            loading={publishingId === product.importId}
                            onClick={() =>
                              void publishImport(product.importId!)
                            }
                          >
                            Publish
                          </s-button>
                        ) : null}
                      </s-stack>
                    </s-table-cell>
                  </s-table-row>
                )
              })}
            </s-table-body>
          </s-table>
        )}
      </s-stack>
    </s-section>
  )
}