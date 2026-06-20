import { z } from "zod"

export const importReviewSchema = z.object({
  temuReviewId: z.string().min(1),
  comment: z.string().optional(),
  translatedComment: z.string().optional(),
  score: z.number().int().min(1).max(5).nullable().optional(),
  authorName: z.string().optional(),
  reviewTime: z.number().int().nullable().optional(),
  pictures: z.array(z.string()).optional(),
})

export const importBatchSchema = z.object({
  importId: z.string().uuid().optional(),
  temuGoodsId: z.string().min(1),
  temuProductUrl: z.string().url().optional(),
  temuProductTitle: z.string().optional(),
  shopifyProductId: z.string().optional(),
  shopifyProductTitle: z.string().optional(),
  totalExpected: z.number().int().positive().optional(),
  batchIndex: z.number().int().min(0).optional(),
  isFinal: z.boolean().optional(),
  reviews: z.array(importReviewSchema),
})

