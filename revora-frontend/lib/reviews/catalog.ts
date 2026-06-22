import type { Session } from "@shopify/shopify-api";
import { desc, eq } from "drizzle-orm";

import { parseStoredPictures } from "@/lib/extension/pictures";
import { getShopify } from "@/lib/shopify/shopify";
import { db } from "@/src/db";
import { importedReviews, reviewImports } from "@/src/db/schema";

const PRODUCTS_PAGE_SIZE = 250;

const PRODUCTS_QUERY = `#graphql
  query RevoraCatalogProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          title
          handle
        }
      }
    }
  }
`;

interface CatalogProductNode {
  handle: string;
  id: string;
  title: string;
}

async function fetchAllCatalogProducts(
  admin: InstanceType<ReturnType<typeof getShopify>["clients"]["Graphql"]>
): Promise<CatalogProductNode[]> {
  const products: CatalogProductNode[] = [];
  let after: string | undefined;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await admin.request(PRODUCTS_QUERY, {
      variables: { first: PRODUCTS_PAGE_SIZE, after },
    });

    const connection = (
      response.data as {
        products?: {
          pageInfo?: { hasNextPage: boolean; endCursor: string | null };
          edges?: { node: CatalogProductNode }[];
        };
      }
    )?.products;

    products.push(...(connection?.edges?.map((edge) => edge.node) ?? []));
    hasNextPage = connection?.pageInfo?.hasNextPage ?? false;
    after = connection?.pageInfo?.endCursor ?? undefined;
  }

  return products;
}

interface ProductStats {
  importId: string | null;
  pictureCount: number;
  publishStatus: string | null;
  reviewCount: number;
}

export async function getProductCatalogWithStats(session: Session) {
  const shopify = getShopify();
  const admin = new shopify.clients.Graphql({ session });
  const products = await fetchAllCatalogProducts(admin);

  const [imports, allReviews] = await Promise.all([
    db.query.reviewImports.findMany({
      where: eq(reviewImports.shop, session.shop),
      orderBy: [desc(reviewImports.updatedAt)],
    }),
    db.query.importedReviews.findMany({
      where: eq(importedReviews.shop, session.shop),
    }),
  ]);

  const latestImportByProduct = new Map<string, (typeof imports)[number]>();

  for (const importRecord of imports) {
    if (
      importRecord.shopifyProductId &&
      !latestImportByProduct.has(importRecord.shopifyProductId)
    ) {
      latestImportByProduct.set(importRecord.shopifyProductId, importRecord);
    }
  }

  const statsByProduct = new Map<string, ProductStats>();

  for (const review of allReviews) {
    if (!review.shopifyProductId) {
      continue;
    }

    const current = statsByProduct.get(review.shopifyProductId) ?? {
      reviewCount: 0,
      pictureCount: 0,
      publishStatus: null,
      importId: null,
    };

    current.reviewCount += 1;
    current.pictureCount += parseStoredPictures(review.pictures).length;
    statsByProduct.set(review.shopifyProductId, current);
  }

  for (const [productId, importRecord] of latestImportByProduct) {
    const current = statsByProduct.get(productId) ?? {
      reviewCount: 0,
      pictureCount: 0,
      publishStatus: null,
      importId: null,
    };

    current.publishStatus = importRecord.publishStatus;
    current.importId = importRecord.id;
    statsByProduct.set(productId, current);
  }

  return products.map((product) => {
    const stats = statsByProduct.get(product.id) ?? {
      reviewCount: 0,
      pictureCount: 0,
      publishStatus: null,
      importId: null,
    };

    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      reviewCount: stats.reviewCount,
      pictureCount: stats.pictureCount,
      publishStatus: stats.publishStatus,
      importId: stats.importId,
    };
  });
}
