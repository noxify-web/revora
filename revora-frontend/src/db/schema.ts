import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

export const sessions = sqliteTable("Session", {
  id: text("id").primaryKey(),
  shop: text("shop").notNull(),
  state: text("state").notNull(),
  isOnline: integer("isOnline", { mode: "boolean" }).notNull().default(false),
  scope: text("scope"),
  expires: text("expires"),
  accessToken: text("accessToken").notNull(),
  userId: integer("userId"),
  firstName: text("firstName"),
  lastName: text("lastName"),
  email: text("email"),
  accountOwner: integer("accountOwner", { mode: "boolean" }),
  locale: text("locale"),
  collaborator: integer("collaborator", { mode: "boolean" }),
  emailVerified: integer("emailVerified", { mode: "boolean" }),
  refreshToken: text("refreshToken"),
  refreshTokenExpires: text("refreshTokenExpires"),
})

export const shopPlans = sqliteTable("ShopPlan", {
  shop: text("shop").primaryKey(),
  plan: text("plan").notNull().default("free"),
  subscriptionId: text("subscriptionId"),
  updatedAt: text("updatedAt").notNull(),
})

export const extensionTokens = sqliteTable("ExtensionToken", {
  id: text("id").primaryKey(),
  shop: text("shop").notNull(),
  tokenHash: text("tokenHash").notNull(),
  label: text("label"),
  createdAt: text("createdAt").notNull(),
  lastUsedAt: text("lastUsedAt"),
  revokedAt: text("revokedAt"),
})

export const connectCodes = sqliteTable("ConnectCode", {
  id: text("id").primaryKey(),
  shop: text("shop").notNull(),
  code: text("code").notNull(),
  expiresAt: text("expiresAt").notNull(),
  usedAt: text("usedAt"),
  createdAt: text("createdAt").notNull(),
})

export const rateLimits = sqliteTable("RateLimit", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: text("windowStart").notNull(),
})

export const reviewImports = sqliteTable("ReviewImport", {
  id: text("id").primaryKey(),
  shop: text("shop").notNull(),
  temuGoodsId: text("temuGoodsId").notNull(),
  temuProductUrl: text("temuProductUrl"),
  temuProductTitle: text("temuProductTitle"),
  shopifyProductId: text("shopifyProductId"),
  shopifyProductTitle: text("shopifyProductTitle"),
  status: text("status").notNull(),
  publishStatus: text("publishStatus").notNull().default("draft"),
  totalExpected: integer("totalExpected"),
  totalCollected: integer("totalCollected").notNull().default(0),
  totalImported: integer("totalImported").notNull().default(0),
  totalPublished: integer("totalPublished").notNull().default(0),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
  completedAt: text("completedAt"),
  publishedAt: text("publishedAt"),
})

export const importedReviews = sqliteTable(
  "ImportedReview",
  {
    id: text("id").primaryKey(),
    shop: text("shop").notNull(),
    importId: text("importId").notNull(),
    temuReviewId: text("temuReviewId").notNull(),
    temuGoodsId: text("temuGoodsId").notNull(),
    comment: text("comment"),
    translatedComment: text("translatedComment"),
    score: integer("score"),
    authorName: text("authorName"),
    reviewTime: integer("reviewTime"),
    pictures: text("pictures"),
    shopifyProductId: text("shopifyProductId"),
    syncStatus: text("syncStatus").notNull().default("pending"),
    shopifyMetaobjectId: text("shopifyMetaobjectId"),
    syncError: text("syncError"),
    publishedAt: text("publishedAt"),
    createdAt: text("createdAt").notNull(),
  },
  (table) => [
    uniqueIndex("ImportedReview_shop_temuReviewId").on(
      table.shop,
      table.temuReviewId
    ),
  ]
)
