"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PolarisEmptyState } from "@/components/polaris-empty-state";
import {
  REVIEW_EXPORT_MODAL_ID,
  ReviewExportModal,
  type ReviewExportTarget,
} from "@/components/review-export-modal";
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

interface ProductExportTableProps {
  shop: string;
}

function getShopSlug(shop: string) {
  return shop.replace(/\.myshopify\.com$/i, "");
}

function getProductAdminUrl(shop: string, productId: string) {
  const numericId = productId.split("/").pop() ?? productId;
  return `https://admin.shopify.com/store/${getShopSlug(shop)}/products/${numericId}`;
}

export function ProductExportTable({ shop }: ProductExportTableProps) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [exportProduct, setExportProduct] = useState<ReviewExportTarget | null>(
    null
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const catalogResponse = await adminFetch("/api/admin/catalog");

      if (!catalogResponse.ok) {
        throw new Error("Failed to load product catalog");
      }

      const catalogData = await catalogResponse.json();

      setProducts(catalogData.catalog ?? []);
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

  const exportableProducts = useMemo(
    () => products.filter((product) => product.reviewCount > 0),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return exportableProducts;
    }

    return exportableProducts.filter(
      (product) =>
        product.title.toLowerCase().includes(query) ||
        product.handle.toLowerCase().includes(query)
    );
  }, [exportableProducts, search]);

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
    <s-section
      accessibilityLabel="Export products"
      heading="Products with reviews"
    >
      <s-stack gap="base">
        {error ? (
          <s-banner dismissible heading="Error" tone="critical">
            {error}
          </s-banner>
        ) : null}

        {loading ? (
          <s-stack alignItems="center" direction="inline" gap="small">
            <s-spinner accessibilityLabel="Loading products" />
            <s-text color="subdued">Loading products...</s-text>
          </s-stack>
        ) : exportableProducts.length === 0 ? (
          <PolarisEmptyState
            description="Import Temu reviews from the Dashboard first, then return here to export them for another review app."
            heading="No reviews to export yet"
            imageAlt="No reviews to export illustration"
          />
        ) : filteredProducts.length === 0 ? (
          <s-stack gap="base">
            {productSearchField}
            <PolarisEmptyState
              description="Try a different search term."
              heading="No matching products"
              imageAlt="No matching products illustration"
            />
          </s-stack>
        ) : (
          <s-section accessibilityLabel="Export products table" padding="none">
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
                {filteredProducts.map((product) => (
                  <s-table-row key={product.id}>
                    <s-table-cell>
                      <s-link
                        href={getProductAdminUrl(shop, product.id)}
                        target="_blank"
                      >
                        {product.title}
                      </s-link>
                    </s-table-cell>
                    <s-table-cell>{product.reviewCount}</s-table-cell>
                    <s-table-cell>{product.pictureCount}</s-table-cell>
                    <s-table-cell>
                      <s-button
                        command="--show"
                        commandFor={REVIEW_EXPORT_MODAL_ID}
                        icon="export"
                        onClick={() =>
                          setExportProduct({
                            id: product.id,
                            title: product.title,
                            handle: product.handle,
                            reviewCount: product.reviewCount,
                          })
                        }
                        variant="primary"
                      >
                        Export
                      </s-button>
                    </s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>
          </s-section>
        )}
      </s-stack>
      <ReviewExportModal product={exportProduct} />
    </s-section>
  );
}
