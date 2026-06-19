import { randomUUID } from "crypto"
import { and, desc, eq } from "drizzle-orm"

import {
  normalizePictureUrls,
  serializePictures,
} from "@/lib/extension/pictures"
import { getReviewLimitForPlan, PLANS } from "@/lib/plans"
import { resolveShopPlan } from "@/lib/shopify/resolve-plan"
import { db } from "@/src/db"
import { importedReviews, reviewImports } from "@/src/db/schema"

import type { ImportBatchRequest } from "./types"

export async function processImportBatch(
  shop: string,
  body: ImportBatchRequest
) {
  const resolved = await resolveShopPlan(shop)
  const plan = resolved.plan
  const reviewLimit = resolved.reviewLimit

  const now = new Date().toISOString()
  let importRecord = body.importId
    ? await db.query.reviewImports.findFirst({
        where: and(
          eq(reviewImports.id, body.importId),
          eq(reviewImports.shop, shop)
        ),
      })
    : null

  if (body.importId && !importRecord) {
    throw new Error("Import not found")
  }

  if (!importRecord) {
    importRecord = {
      id: randomUUID(),
      shop,
      temuGoodsId: body.temuGoodsId,
      temuProductUrl: body.temuProductUrl ?? null,
      temuProductTitle: body.temuProductTitle ?? null,
      shopifyProductId: body.shopifyProductId ?? null,
      shopifyProductTitle: body.shopifyProductTitle ?? null,
      status: "uploading",
      publishStatus: "draft",
      totalExpected: body.totalExpected ?? null,
      totalCollected: 0,
      totalImported: 0,
      totalPublished: 0,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      publishedAt: null,
    }

    await db.insert(reviewImports).values(importRecord)
  } else {
    const updates: Partial<typeof importRecord> = {
      updatedAt: now,
    }

    if (body.shopifyProductId) {
      updates.shopifyProductId = body.shopifyProductId
    }
    if (body.shopifyProductTitle) {
      updates.shopifyProductTitle = body.shopifyProductTitle
    }
    if (body.totalExpected != null) {
      updates.totalExpected = body.totalExpected
    }
    if (body.temuProductUrl) {
      updates.temuProductUrl = body.temuProductUrl
    }
    if (body.temuProductTitle) {
      updates.temuProductTitle = body.temuProductTitle
    }

    await db
      .update(reviewImports)
      .set(updates)
      .where(eq(reviewImports.id, importRecord.id))
  }

  const currentTotal = importRecord.totalImported ?? 0
  let reviewsToInsert = body.reviews
  let truncated = 0

  if (reviewLimit != null) {
    const remaining = Math.max(0, reviewLimit - currentTotal)
    if (remaining <= 0) {
      reviewsToInsert = []
      truncated = body.reviews.length
    } else if (body.reviews.length > remaining) {
      reviewsToInsert = body.reviews.slice(0, remaining)
      truncated = body.reviews.length - remaining
    }
  }

  let inserted = 0
  let skipped = 0

  for (const review of reviewsToInsert) {
    try {
      await db.insert(importedReviews).values({
        id: randomUUID(),
        shop,
        importId: importRecord.id,
        temuReviewId: review.temuReviewId,
        temuGoodsId: body.temuGoodsId,
        comment: review.comment ?? null,
        translatedComment: review.translatedComment ?? null,
        score: review.score ?? null,
        authorName: review.authorName ?? null,
        reviewTime: review.reviewTime ?? null,
        pictures: serializePictures(normalizePictureUrls(review.pictures)),
        shopifyProductId:
          body.shopifyProductId ?? importRecord.shopifyProductId,
        syncStatus: "pending",
        createdAt: now,
      })
      inserted += 1
    } catch {
      skipped += 1
    }
  }

  const totalImported = currentTotal + inserted
  const status = body.isFinal ? "completed" : "uploading"
  const limitReached = reviewLimit != null && totalImported >= reviewLimit

  await db
    .update(reviewImports)
    .set({
      totalImported,
      totalCollected: Math.max(
        importRecord.totalCollected ?? 0,
        totalImported + skipped
      ),
      status,
      updatedAt: now,
      completedAt: body.isFinal ? now : null,
    })
    .where(eq(reviewImports.id, importRecord.id))

  return {
    importId: importRecord.id,
    inserted,
    skipped,
    truncated,
    totalImported,
    status,
    plan,
    reviewLimit,
    limitReached,
    planName: PLANS[plan].name,
  }
}

export async function listRecentImports(shop: string, limit = 10) {
  return db.query.reviewImports.findMany({
    where: eq(reviewImports.shop, shop),
    orderBy: [desc(reviewImports.createdAt)],
    limit,
  })
}
