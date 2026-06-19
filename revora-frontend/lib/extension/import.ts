import { randomUUID } from "crypto"
import { and, desc, eq } from "drizzle-orm"

import { db } from "@/src/db"
import { importedReviews, reviewImports } from "@/src/db/schema"

import type { ImportBatchRequest } from "./types"

export async function processImportBatch(shop: string, body: ImportBatchRequest) {
  const now = new Date().toISOString()
  let importRecord = body.importId
    ? await db.query.reviewImports.findFirst({
        where: and(
          eq(reviewImports.id, body.importId),
          eq(reviewImports.shop, shop),
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
      totalExpected: body.totalExpected ?? null,
      totalCollected: 0,
      totalImported: 0,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
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

  let inserted = 0
  let skipped = 0

  for (const review of body.reviews) {
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
        pictures: review.pictures?.length
          ? JSON.stringify(review.pictures)
          : null,
        shopifyProductId: body.shopifyProductId ?? importRecord.shopifyProductId,
        createdAt: now,
      })
      inserted += 1
    } catch {
      skipped += 1
    }
  }

  const totalImported = (importRecord.totalImported ?? 0) + inserted
  const status = body.isFinal ? "completed" : "uploading"

  await db
    .update(reviewImports)
    .set({
      totalImported,
      totalCollected: Math.max(importRecord.totalCollected ?? 0, totalImported + skipped),
      status,
      updatedAt: now,
      completedAt: body.isFinal ? now : null,
    })
    .where(eq(reviewImports.id, importRecord.id))

  return {
    importId: importRecord.id,
    inserted,
    skipped,
    totalImported,
    status,
  }
}

export async function listRecentImports(shop: string, limit = 10) {
  return db.query.reviewImports.findMany({
    where: eq(reviewImports.shop, shop),
    orderBy: [desc(reviewImports.createdAt)],
    limit,
  })
}