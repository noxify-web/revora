import { describe, expect, it } from "vitest";

import { REVORA_REVIEWS_EMBED_BLOCK_HANDLE } from "./constants";
import { getThemeEditorProductUrl } from "./shopify-admin";

describe("getThemeEditorProductUrl", () => {
  it("deep-links to the Revora Reviews app embed on the product template", () => {
    const url = getThemeEditorProductUrl(
      "noxify-dvgwvtrt.myshopify.com",
      "8306c32501330f9312ff84788895ca36"
    );

    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe(
      "https://admin.shopify.com/store/noxify-dvgwvtrt/themes/current/editor"
    );
    expect(parsed.searchParams.get("template")).toBe("product");
    expect(parsed.searchParams.get("context")).toBe("apps");
    expect(parsed.searchParams.get("activateAppId")).toBe(
      `8306c32501330f9312ff84788895ca36/${REVORA_REVIEWS_EMBED_BLOCK_HANDLE}`
    );
  });
});
