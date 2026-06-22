import type { Session } from "@shopify/shopify-api";
import { and, eq } from "drizzle-orm";

import { parseStoredPictures } from "@/lib/extension/pictures";
import { getShopify } from "@/lib/shopify/shopify";
import { db } from "@/src/db";
import { importedReviews, reviewImports } from "@/src/db/schema";

const REVIEW_METAOBJECT_TYPE = "$app:revora_review";
const PUBLISH_CONCURRENCY = 5;

interface ReviewRow {
  authorName: string | null;
  comment: string | null;
  id: string;
  pictures: string | null;
  reviewTime: number | null;
  score: number | null;
  shopifyMetaobjectId: string | null;
  temuReviewId: string;
  translatedComment: string | null;
}

interface GraphqlAdmin {
  request: (
    query: string,
    options?: { variables?: Record<string, unknown> }
  ) => Promise<{ data?: unknown }>;
}

interface PublishAttempt {
  error: string | null;
  metaobjectId: string | null;
  review: ReviewRow;
}

function reviewComment(review: ReviewRow) {
  return (review.translatedComment || review.comment || "").trim();
}

function buildReviewFields(review: ReviewRow) {
  const pictureUrls = parseStoredPictures(review.pictures);

  const fields = [
    { key: "author_name", value: review.authorName || "Customer" },
    { key: "comment", value: reviewComment(review) || "Great product!" },
    {
      key: "score",
      value: String(Math.min(5, Math.max(1, review.score ?? 5))),
    },
    {
      key: "review_date",
      value: review.reviewTime
        ? new Date(review.reviewTime * 1000).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    },
    { key: "temu_review_id", value: review.temuReviewId },
  ];

  if (pictureUrls.length) {
    fields.push({ key: "pictures", value: JSON.stringify(pictureUrls) });
  }

  return fields;
}

async function createReviewMetaobject(
  admin: GraphqlAdmin,
  review: ReviewRow,
  fields: ReturnType<typeof buildReviewFields>
) {
  const response = await admin.request(
    `#graphql
    mutation MetaobjectCreate($metaobject: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $metaobject) {
        metaobject { id }
        userErrors { field message }
      }
    }
  `,
    {
      variables: {
        metaobject: {
          type: REVIEW_METAOBJECT_TYPE,
          handle: `temu-${review.temuReviewId}`,
          fields,
        },
      },
    }
  );

  const payload = response.data as {
    metaobjectCreate?: {
      metaobject?: { id?: string };
      userErrors?: { message: string }[];
    };
  };

  const error = payload.metaobjectCreate?.userErrors?.[0]?.message;
  const id = payload.metaobjectCreate?.metaobject?.id;

  if (error || !id) {
    throw new Error(error || "Failed to create review metaobject");
  }

  return id;
}

async function upsertReviewMetaobject(admin: GraphqlAdmin, review: ReviewRow) {
  const fields = buildReviewFields(review);

  if (review.shopifyMetaobjectId) {
    const response = await admin.request(
      `#graphql
      mutation MetaobjectUpdate($id: ID!, $metaobject: MetaobjectUpdateInput!) {
        metaobjectUpdate(id: $id, metaobject: $metaobject) {
          metaobject { id }
          userErrors { field message }
        }
      }
    `,
      {
        variables: {
          id: review.shopifyMetaobjectId,
          metaobject: { fields },
        },
      }
    );

    const errors = (
      response.data as {
        metaobjectUpdate?: { userErrors?: { message: string }[] };
      }
    )?.metaobjectUpdate?.userErrors;

    if (!errors?.length) {
      return review.shopifyMetaobjectId;
    }

    const message = errors[0]?.message || "";
    if (!/not found|does not exist|invalid id/i.test(message)) {
      throw new Error(message || "Failed to update review metaobject");
    }
  }

  return createReviewMetaobject(admin, review, fields);
}

async function publishReviewsInParallel(
  admin: GraphqlAdmin,
  reviews: ReviewRow[]
): Promise<PublishAttempt[]> {
  const results: PublishAttempt[] = [];

  for (let index = 0; index < reviews.length; index += PUBLISH_CONCURRENCY) {
    const batch = reviews.slice(index, index + PUBLISH_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (review) => {
        try {
          const metaobjectId = await upsertReviewMetaobject(admin, review);
          return { review, metaobjectId, error: null };
        } catch (error) {
          return {
            review,
            metaobjectId: null,
            error:
              error instanceof Error
                ? error.message
                : "Failed to publish review",
          };
        }
      })
    );

    results.push(...batchResults);
  }

  return results;
}

const STOREFRONT_JSON_REVIEW_LIMIT = 30;

function buildStorefrontReviewsPayload(
  succeeded: PublishAttempt[],
  publishedCount: number,
  averageScore: number
) {
  return {
    count: publishedCount,
    averageRating: Number(averageScore.toFixed(1)),
    reviews: succeeded.slice(0, STOREFRONT_JSON_REVIEW_LIMIT).map((item) => {
      const pictureUrls = parseStoredPictures(item.review.pictures);

      return {
        authorName: item.review.authorName || "Customer",
        comment: reviewComment(item.review) || "Great product!",
        score: Math.min(5, Math.max(1, item.review.score ?? 5)),
        reviewDate: item.review.reviewTime
          ? new Date(item.review.reviewTime * 1000).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        pictures: pictureUrls,
      };
    }),
  };
}

async function updateProductMetafields(
  admin: GraphqlAdmin,
  productId: string,
  metaobjectIds: string[],
  publishedCount: number,
  averageScore: number,
  storefrontPayload: ReturnType<typeof buildStorefrontReviewsPayload>
) {
  const productResponse = await admin.request(
    `#graphql
    mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id namespace key }
        userErrors { field message }
      }
    }
  `,
    {
      variables: {
        metafields: [
          {
            ownerId: productId,
            namespace: "$app",
            key: "revora_reviews",
            type: "list.metaobject_reference",
            value: JSON.stringify(metaobjectIds),
          },
          {
            ownerId: productId,
            namespace: "$app",
            key: "revora_review_count",
            type: "number_integer",
            value: String(publishedCount),
          },
          {
            ownerId: productId,
            namespace: "$app",
            key: "revora_average_rating",
            type: "number_decimal",
            value: averageScore.toFixed(1),
          },
          {
            ownerId: productId,
            namespace: "$app",
            key: "revora_reviews_json",
            type: "json",
            value: JSON.stringify(storefrontPayload),
          },
        ],
      },
    }
  );

  const productError = (
    productResponse.data as {
      metafieldsSet?: { userErrors?: { message: string }[] };
    }
  )?.metafieldsSet?.userErrors?.[0]?.message;

  if (productError) {
    throw new Error(productError);
  }
}

export async function publishImportToShopify(
  session: Session,
  importId: string
) {
  const importRecord = await db.query.reviewImports.findFirst({
    where: and(
      eq(reviewImports.id, importId),
      eq(reviewImports.shop, session.shop)
    ),
  });

  if (!importRecord) {
    throw new Error("Import not found");
  }

  if (!importRecord.shopifyProductId) {
    throw new Error("Import is missing a Shopify product mapping");
  }

  const reviews = await db.query.importedReviews.findMany({
    where: and(
      eq(importedReviews.importId, importId),
      eq(importedReviews.shop, session.shop)
    ),
  });

  if (!reviews.length) {
    throw new Error("No reviews to publish");
  }

  const shopify = getShopify();
  const admin = new shopify.clients.Graphql({ session });
  const attempts = await publishReviewsInParallel(admin, reviews);

  const succeeded = attempts.filter((item) => item.metaobjectId);
  const failed = attempts.filter((item) => item.error);
  const now = new Date().toISOString();

  for (const item of failed) {
    await db
      .update(importedReviews)
      .set({
        syncStatus: "failed",
        syncError: item.error,
      })
      .where(eq(importedReviews.id, item.review.id));
  }

  if (!succeeded.length) {
    await db
      .update(reviewImports)
      .set({
        publishStatus: "partial",
        totalPublished: 0,
        updatedAt: now,
      })
      .where(eq(reviewImports.id, importId));

    return {
      importId,
      published: 0,
      failed: failed.length,
      productId: importRecord.shopifyProductId,
      errors: failed.map((item) => item.error).filter(Boolean),
    };
  }

  const metaobjectIds = succeeded.map((item) => item.metaobjectId as string);
  const scores = succeeded
    .map((item) => item.review.score)
    .filter((score): score is number => typeof score === "number");
  const averageScore = scores.length
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : 5;

  for (const item of succeeded) {
    await db
      .update(importedReviews)
      .set({
        shopifyMetaobjectId: item.metaobjectId,
        syncStatus: "pending",
        syncError: null,
      })
      .where(eq(importedReviews.id, item.review.id));
  }

  try {
    await updateProductMetafields(
      admin,
      importRecord.shopifyProductId,
      metaobjectIds,
      succeeded.length,
      averageScore,
      buildStorefrontReviewsPayload(succeeded, succeeded.length, averageScore)
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update product";

    for (const item of succeeded) {
      await db
        .update(importedReviews)
        .set({
          syncStatus: "failed",
          syncError: message,
        })
        .where(eq(importedReviews.id, item.review.id));
    }

    await db
      .update(reviewImports)
      .set({
        publishStatus: "partial",
        totalPublished: 0,
        updatedAt: now,
      })
      .where(eq(reviewImports.id, importId));

    throw new Error(message);
  }

  for (const item of succeeded) {
    await db
      .update(importedReviews)
      .set({
        syncStatus: "published",
        shopifyMetaobjectId: item.metaobjectId,
        syncError: null,
        publishedAt: now,
      })
      .where(eq(importedReviews.id, item.review.id));
  }

  await db
    .update(reviewImports)
    .set({
      publishStatus: failed.length ? "partial" : "published",
      totalPublished: succeeded.length,
      publishedAt: now,
      updatedAt: now,
    })
    .where(eq(reviewImports.id, importId));

  return {
    importId,
    published: succeeded.length,
    failed: failed.length,
    productId: importRecord.shopifyProductId,
    errors: failed.map((item) => item.error).filter(Boolean),
  };
}
