import { describe, expect, it } from "vitest";

import {
  hasEnabledAppEmbed,
  hasEnabledProductAppBlock,
  isRevoraStorefrontWidgetEnabled,
  matchesRevoraBlockType,
} from "@/lib/shopify/theme-app-embed";

const API_KEY = "8306c32501330f9312ff84788895ca36";

const horizonProductTemplate = {
  sections: {
    main: {
      type: "product-information",
      blocks: {
        "product-details": {
          type: "_product-details",
          blocks: {
            header: {
              type: "group",
              blocks: {
                revora_summary: {
                  type: "shopify://apps/revora-import-temu-reviews/blocks/reviews-summary/019edfef-0203-7640-b95c-b65f5095a24f",
                  settings: {},
                },
              },
            },
          },
        },
      },
    },
    revora_section: {
      type: "_blocks",
      blocks: {
        revora_reviews: {
          type: "shopify://apps/revora-import-temu-reviews/blocks/reviews/019edfef-0203-7640-b95c-b65f5095a24f",
          settings: {
            max_reviews: 30,
          },
        },
      },
    },
  },
};

describe("matchesRevoraBlockType", () => {
  it("matches theme blocks that use the Shopify app handle slug", () => {
    expect(
      matchesRevoraBlockType(
        "shopify://apps/revora-import-temu-reviews/blocks/reviews/019edfef-0203-7640-b95c-b65f5095a24f",
        API_KEY
      )
    ).toBe(true);
  });

  it("matches theme blocks that use the app client id", () => {
    expect(
      matchesRevoraBlockType(
        `shopify://apps/${API_KEY}/blocks/reviews-embed/019edfef-0203-7640-b95c-b65f5095a24f`,
        API_KEY
      )
    ).toBe(true);
  });

  it("ignores unrelated app blocks", () => {
    expect(
      matchesRevoraBlockType(
        "shopify://apps/judge-me-reviews/blocks/preview_badge/61ccd3b1-a9f2-4160-9fe9-4fec8413e5d8",
        API_KEY
      )
    ).toBe(false);
  });
});

describe("hasEnabledProductAppBlock", () => {
  it("detects nested Revora blocks in product templates", () => {
    expect(hasEnabledProductAppBlock(horizonProductTemplate, API_KEY)).toBe(
      true
    );
    expect(
      isRevoraStorefrontWidgetEnabled(null, horizonProductTemplate, API_KEY)
    ).toBe(true);
  });
});

describe("hasEnabledAppEmbed", () => {
  it("detects enabled app embed blocks in settings_data presets", () => {
    const settingsData = {
      current: "Default",
      presets: {
        Default: {
          blocks: {
            "revora-embed": {
              type: "shopify://apps/revora-import-temu-reviews/blocks/reviews-embed/019edfef-0203-7640-b95c-b65f5095a24f",
              disabled: false,
              settings: {},
            },
          },
        },
      },
    };

    expect(hasEnabledAppEmbed(settingsData, API_KEY)).toBe(true);
  });
});
