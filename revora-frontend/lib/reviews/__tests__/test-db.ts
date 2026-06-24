import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import {
  importedReviews,
  rateLimits,
  reviewImports,
  shopSettings,
} from "@/src/db/schema";

const IMPORTED_REVIEW_DDL = `
CREATE TABLE IF NOT EXISTS ImportedReview (
  id TEXT PRIMARY KEY,
  shop TEXT NOT NULL,
  importId TEXT NOT NULL,
  temuReviewId TEXT NOT NULL,
  temuGoodsId TEXT NOT NULL,
  comment TEXT,
  translatedComment TEXT,
  score INTEGER,
  authorName TEXT,
  reviewTime INTEGER,
  pictures TEXT,
  shopifyProductId TEXT,
  source TEXT NOT NULL DEFAULT 'temu',
  authorEmail TEXT,
  helpfulCount INTEGER NOT NULL DEFAULT 0,
  notHelpfulCount INTEGER NOT NULL DEFAULT 0,
  syncStatus TEXT NOT NULL DEFAULT 'pending',
  shopifyMetaobjectId TEXT,
  syncError TEXT,
  publishedAt TEXT,
  createdAt TEXT NOT NULL
);
`;

const SHOP_SETTINGS_DDL = `
CREATE TABLE IF NOT EXISTS ShopSettings (
  shop TEXT PRIMARY KEY,
  autoPublishReviews INTEGER NOT NULL DEFAULT 0,
  updatedAt TEXT NOT NULL
);
`;

const RATE_LIMIT_DDL = `
CREATE TABLE IF NOT EXISTS RateLimit (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  windowStart TEXT NOT NULL
);
`;

const REVIEW_IMPORT_DDL = `
CREATE TABLE IF NOT EXISTS ReviewImport (
  id TEXT PRIMARY KEY,
  shop TEXT NOT NULL,
  temuGoodsId TEXT NOT NULL,
  temuProductUrl TEXT,
  temuProductTitle TEXT,
  shopifyProductId TEXT,
  shopifyProductTitle TEXT,
  status TEXT NOT NULL,
  publishStatus TEXT NOT NULL DEFAULT 'draft',
  totalExpected INTEGER,
  totalCollected INTEGER NOT NULL DEFAULT 0,
  totalImported INTEGER NOT NULL DEFAULT 0,
  totalPublished INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  completedAt TEXT,
  publishedAt TEXT
);
`;

export async function createTestDatabase() {
  const client = createClient({ url: ":memory:" });
  await client.execute(IMPORTED_REVIEW_DDL);
  await client.execute(REVIEW_IMPORT_DDL);
  await client.execute(SHOP_SETTINGS_DDL);
  await client.execute(RATE_LIMIT_DDL);

  const db = drizzle(client, {
    schema: { importedReviews, reviewImports, shopSettings, rateLimits },
  });

  const globalForDb = globalThis as typeof globalThis & {
    __revoraDb?: typeof db;
  };

  globalForDb.__revoraDb = db;
  return db;
}

export async function seedPublishedReviews(
  db: Awaited<ReturnType<typeof createTestDatabase>>,
  shop: string,
  productId: string
) {
  const importId = "import-1";
  const now = "2024-06-01T00:00:00.000Z";

  await db.insert(reviewImports).values({
    id: importId,
    shop,
    temuGoodsId: "goods-1",
    status: "completed",
    publishStatus: "partial",
    totalImported: 3,
    totalPublished: 2,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(importedReviews).values([
    {
      id: "pub-1",
      shop,
      importId,
      temuReviewId: "temu-1",
      temuGoodsId: "goods-1",
      comment: "Great",
      score: 5,
      authorName: "Alice",
      reviewTime: 1_700_000_000,
      shopifyProductId: productId,
      source: "temu",
      helpfulCount: 3,
      notHelpfulCount: 0,
      syncStatus: "published",
      publishedAt: now,
      createdAt: now,
    },
    {
      id: "pub-2",
      shop,
      importId,
      temuReviewId: "temu-2",
      temuGoodsId: "goods-1",
      comment: "Fine",
      score: 4,
      authorName: "Bob",
      reviewTime: 1_800_000_000,
      pictures: '["https://example.com/photo.jpg"]',
      shopifyProductId: productId,
      source: "temu",
      helpfulCount: 8,
      notHelpfulCount: 1,
      syncStatus: "published",
      publishedAt: now,
      createdAt: now,
    },
    {
      id: "pending-1",
      shop,
      importId,
      temuReviewId: "temu-3",
      temuGoodsId: "goods-1",
      comment: "Hidden",
      score: 2,
      authorName: "Cara",
      reviewTime: 1_900_000_000,
      shopifyProductId: productId,
      source: "storefront",
      helpfulCount: 0,
      notHelpfulCount: 0,
      syncStatus: "pending",
      createdAt: now,
    },
  ]);
}
