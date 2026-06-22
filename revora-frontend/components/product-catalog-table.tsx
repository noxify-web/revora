"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PolarisEmptyState } from "@/components/polaris-empty-state";
import { adminFetch } from "@/lib/admin-fetch";

interface CatalogProduct {
  handle: string;
  id: string;
  importId: string | null;
  pictureCount: number;
  publishStatus: string | null;
  reviewCount: number;
  title: string;
}

interface ImportRecord {
  id: string;
  publishStatus: string;
  shopifyProductId: string | null;
  totalImported: number;
  totalPublished: number;
}

interface ProductCatalogTableProps {
  id?: string;
  onPublished?: () => void;
  shop: string;
}

function getShopSlug(shop: string) {
  return shop.replace(/\.myshopify\.com$/i, "");
}

function getProductAdminUrl(shop: string, productId: string) {
  const numericId = productId.split("/").pop() ?? productId;
  return `https://admin.shopify.com/store/${getShopSlug(shop)}/products/${numericId}`;
}

function canPublish(product: CatalogProduct, importRecord?: ImportRecord) {
  if (!(product.importId && importRecord)) {
    return false;
  }
  if (importRecord.totalImported === 0) {
    return false;
  }
  return importRecord.totalImported > importRecord.totalPublished;
}

export function ProductCatalogTable({
  shop,
  id,
  onPublished,
}: ProductCatalogTableProps) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [importHintProduct, setImportHintProduct] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [catalogResponse, importsResponse] = await Promise.all([
        adminFetch("/api/admin/catalog"),
        adminFetch("/api/imports"),
      ]);

      if (!catalogResponse.ok) {
        throw new Error("Failed to load product catalog");
      }

      if (!importsResponse.ok) {
        throw new Error("Failed to load imports");
      }

      const catalogData = await catalogResponse.json();
      const importsData = await importsResponse.json();

      setProducts(catalogData.catalog ?? []);
      setImports(importsData.imports ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load products"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const importsByProductId = useMemo(() => {
    const map = new Map<string, ImportRecord>();
    for (const item of imports) {
      if (item.shopifyProductId) {
        map.set(item.shopifyProductId, item);
      }
    }
    return map;
  }, [imports]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return products;
    }
    return products.filter(
      (product) =>
        product.title.toLowerCase().includes(query) ||
        product.handle.toLowerCase().includes(query)
    );
  }, [products, search]);

  async function publishImport(importId: string) {
    setPublishingId(importId);
    setError(null);
    setMessage(null);

    try {
      const response = await adminFetch(`/api/imports/${importId}/publish`, {
        method: "POST",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to publish reviews");
      }

      setMessage(
        `Published ${data.published ?? 0} reviews. Enable the Revora Reviews app embed in your theme to display them on product pages.`
      );
      window.shopify?.toast?.show(`Published ${data.published ?? 0} reviews`);
      await loadData();
      onPublished?.();
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Failed to publish reviews"
      );
    } finally {
      setPublishingId(null);
    }
  }

  function handleSearchInput(event: Event) {
    const target = event.currentTarget as HTMLInputElement;
    setSearch(target.value);
  }

  const productSearchField = (
    <s-search-field
      label="Search products"
      labelAccessibilityVisibility="exclusive"
      onInput={handleSearchInput}
      placeholder="Search products"
      value={search}
    />
  );

  return (
    <s-section accessibilityLabel="Product catalog" heading="Products" id={id}>
      <s-stack gap="base">
        {message ? (
          <s-banner dismissible heading="Published" tone="success">
            {message}
          </s-banner>
        ) : null}

        {error ? (
          <s-banner dismissible heading="Error" tone="critical">
            {error}
          </s-banner>
        ) : null}

        {importHintProduct ? (
          <s-banner dismissible heading="How to import" tone="info">
            <s-stack gap="small">
              <s-paragraph>
                Open a Temu product page in Chrome, use the Revora extension,
                and map reviews to{" "}
                <s-text type="strong">{importHintProduct}</s-text>.
              </s-paragraph>
              <s-button
                onClick={() => setImportHintProduct(null)}
                variant="secondary"
              >
                Got it
              </s-button>
            </s-stack>
          </s-banner>
        ) : null}

        {loading ? (
          <s-stack alignItems="center" direction="inline" gap="small">
            <s-spinner accessibilityLabel="Loading products" />
            <s-text color="subdued">Loading products...</s-text>
          </s-stack>
        ) : products.length === 0 ? (
          <PolarisEmptyState
            description="Import Temu reviews with the Revora Chrome extension and map them to your Shopify products."
            heading="No products yet"
            imageAlt="No products illustration"
          />
        ) : filteredProducts.length === 0 ? (
          <s-stack gap="base">
            {productSearchField}
            <PolarisEmptyState
              description="Try a different search term or import reviews from Temu using the Chrome extension."
              heading="No matching products"
              imageAlt="No matching products illustration"
            />
          </s-stack>
        ) : (
          <s-section accessibilityLabel="Products table" padding="none">
            <s-table>
              <s-grid gap="small-200" gridTemplateColumns="1fr" slot="filters">
                {productSearchField}
              </s-grid>
              <s-table-header-row>
                <s-table-header listSlot="primary">
                  Shopify product
                </s-table-header>
                <s-table-header format="numeric" listSlot="labeled">
                  Reviews
                </s-table-header>
                <s-table-header format="numeric">Pictures</s-table-header>
                <s-table-header listSlot="secondary">Actions</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {filteredProducts.map((product) => {
                  const importRecord = product.importId
                    ? imports.find((item) => item.id === product.importId)
                    : importsByProductId.get(product.id);
                  const showPublish = canPublish(product, importRecord);

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
                            icon="import"
                            onClick={() => setImportHintProduct(product.title)}
                            variant="secondary"
                          >
                            Import
                          </s-button>
                          {showPublish && product.importId ? (
                            <s-button
                              icon="view"
                              loading={publishingId === product.importId}
                              onClick={() => {
                                if (!product.importId) {
                                  return;
                                }

                                void publishImport(product.importId);
                              }}
                              variant="primary"
                            >
                              Publish
                            </s-button>
                          ) : null}
                        </s-stack>
                      </s-table-cell>
                    </s-table-row>
                  );
                })}
              </s-table-body>
            </s-table>
          </s-section>
        )}
      </s-stack>
    </s-section>
  );
}
