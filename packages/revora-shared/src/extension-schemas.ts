import { z } from "zod";

export const importReviewSchema = z.object({
  temuReviewId: z.string().min(1),
  comment: z.string().optional(),
  translatedComment: z.string().optional(),
  score: z.number().int().min(1).max(5).nullable().optional(),
  authorName: z.string().optional(),
  reviewTime: z.number().int().nullable().optional(),
  pictures: z.array(z.string()).optional(),
});

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
});

/* -------------------------------------------------------------------------- */
/* Trust-boundary message schemas (window.postMessage + sessionStorage).       */
/* These cross the iframe trust boundary (embedded app <-> extension content   */
/* scripts) and are validated on receipt rather than trusted by TS type only.  */
/* -------------------------------------------------------------------------- */

/** sessionStorage payload persisted during pairing for reload resilience. */
export const pendingConnectTokenSchema = z.object({
  apiUrl: z.string(),
  shop: z.string(),
  token: z.string().min(1),
});

/** `REVORA_CONNECT_TOKEN` broadcast: app -> extension content script. */
export const connectTokenBroadcastSchema = z.object({
  apiUrl: z.string(),
  plan: z.string().nullable().optional(),
  planName: z.string().nullable().optional(),
  reviewLimit: z.number().nullable().optional(),
  shop: z.string(),
  token: z.string().min(1),
  type: z.literal("REVORA_CONNECT_TOKEN"),
});

/** `REVORA_PAIRING_CONFIRMED`: extension content script -> app (pinned origin). */
export const pairingConfirmedSchema = z.object({
  shop: z.string(),
  type: z.literal("REVORA_PAIRING_CONFIRMED"),
});

/** `REVORA_REQUEST_EXTENSION_STATUS`: app -> extension. */
export const extensionStatusRequestSchema = z.object({
  requestId: z.string(),
  type: z.literal("REVORA_REQUEST_EXTENSION_STATUS"),
});

/** `REVORA_EXTENSION_STATUS_RESPONSE`: extension -> app. */
export const extensionStatusResponseSchema = z.object({
  installed: z.boolean(),
  paired: z.boolean(),
  requestId: z.string(),
  shop: z.string().nullable(),
  type: z.literal("REVORA_EXTENSION_STATUS_RESPONSE"),
  verified: z.boolean(),
});

/** `REVORA_REQUEST_CONNECT_TOKEN`: extension -> app (pull-on-load race fallback). */
export const connectTokenRequestSchema = z.object({
  requestId: z.string(),
  type: z.literal("REVORA_REQUEST_CONNECT_TOKEN"),
});

/** `REVORA_CONNECT_TOKEN_RESPONSE`: app -> extension (pull response). */
export const connectTokenPullResponseSchema = z.object({
  apiUrl: z.string().nullable(),
  plan: z.string().nullable().optional(),
  planName: z.string().nullable().optional(),
  requestId: z.string(),
  reviewLimit: z.number().nullable().optional(),
  shop: z.string().nullable(),
  token: z.string().nullable(),
  type: z.literal("REVORA_CONNECT_TOKEN_RESPONSE"),
});

/** `REVORA_CLEAR_CONNECT_TOKEN`: app -> extension (clear pairing state). */
export const clearConnectTokenSchema = z.object({
  type: z.literal("REVORA_CLEAR_CONNECT_TOKEN"),
});

/** `REVORA_PAIRING_CONFIRMED` runtime broadcast: background -> content scripts. */
export const backgroundBroadcastSchema = z.discriminatedUnion("type", [
  pairingConfirmedSchema,
]);
