import type { Session } from "@shopify/shopify-api"
import { desc, eq } from "drizzle-orm"

import { parseStoredPictures } from "@/lib/extension/pictures"
import { getShopify } from "@/lib/shopify/shopify"
import { db } from "@/src/db"
import { importedReviews, reviewImports } from "@/src/db/schema"

const PRODUCTS_QUERY = `#graphql
  query RevoraCatalogProducts($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          handle
        }
      }
    }
  }
`

type ProductStats = {
  reviewCount: number
  pictureCount: number
  publishStatus: string | null
  importId: string | null
}

export async function getProductCatalogWithStats(session: Session) {
  const shopify = getShopify()
  const admin = new shopify.clients.Graphql({ session })
  const response = await admin.request(PRODUCTS_QUERY, {
    variables: { first: 50 },
  })

  const products =
    (
      response.data as {
        products?: {
          edges?: {
            node: { id: string; title: string; handle: string }
          }[]
        }
      }
    )?.products?.edges?.map((edge) => edge.node) ?? []

  const [imports, allReviews] = await Promise.all([
    db.query.reviewImports.findMany({
      where: eq(reviewImports.shop, session.shop),
      orderBy: [desc(reviewImports.updatedAt)],
    }),
    db.query.importedReviews.findMany({
      where: eq(importedReviews.shop, session.shop),
    }),
  ])

  const latestImportByProduct = new Map<string, (typeof imports)[number]>()

  for (const importRecord of imports) {
    if (
      importRecord.shopifyProductId &&
      !latestImportByProduct.has(importRecord.shopifyProductId)
    ) {
      latestImportByProduct.set(
        importRecord.shopifyProductId,
        importRecord,
      )
    }
  }

  const statsByProduct = new Map<string, ProductStats>()

  for (const review of allReviews) {
    if (!review.shopifyProductId) continue

    const current = statsByProduct.get(review.shopifyProductId) ?? {
      reviewCount: 0,
      pictureCount: 0,
      publishStatus: null,
      importId: null,
    }

    current.reviewCount += 1
    current.pictureCount += parseStoredPictures(review.pictures).length
    statsByProduct.set(review.shopifyProductId, current)
  }

  for (const [productId, importRecord] of latestImportByProduct) {
    const current = statsByProduct.get(productId) ?? {
      reviewCount: 0,
      pictureCount: 0,
      publishStatus: null,
      importId: null,
    }

    current.publishStatus = importRecord.publishStatus
    current.importId = importRecord.id
    statsByProduct.set(productId, current)
  }

  return products.map((product) => {
    const stats = statsByProduct.get(product.id) ?? {
      reviewCount: 0,
      pictureCount: 0,
      publishStatus: null,
      importId: null,
    }

    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      reviewCount: stats.reviewCount,
      pictureCount: stats.pictureCount,
      publishStatus: stats.publishStatus,
      importId: stats.importId,
    }
  })
}