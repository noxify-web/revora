import { eq } from "drizzle-orm";

import { db } from "@/src/db";
import { shopSettings } from "@/src/db/schema";

export async function getShopAutoPublish(shop: string) {
  const settings = await db.query.shopSettings.findFirst({
    where: eq(shopSettings.shop, shop),
  });

  return settings?.autoPublishReviews ?? false;
}

export async function setShopAutoPublish(shop: string, autoPublish: boolean) {
  const now = new Date().toISOString();
  const existing = await db.query.shopSettings.findFirst({
    where: eq(shopSettings.shop, shop),
  });

  if (existing) {
    await db
      .update(shopSettings)
      .set({ autoPublishReviews: autoPublish, updatedAt: now })
      .where(eq(shopSettings.shop, shop));
    return;
  }

  await db.insert(shopSettings).values({
    shop,
    autoPublishReviews: autoPublish,
    updatedAt: now,
  });
}
