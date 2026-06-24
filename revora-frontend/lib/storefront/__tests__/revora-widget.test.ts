import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getRevoraReviewsWidgetCss,
  REVORA_WIDGET_PALETTE,
} from "@revora/shared/theme-storefront";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("revora-widget storefront bundle", () => {
  it("builds CSS from the widget palette", () => {
    const css = getRevoraReviewsWidgetCss();

    expect(css).toContain(REVORA_WIDGET_PALETTE.brand.toLowerCase());
    expect(css).toContain(REVORA_WIDGET_PALETTE.surfaceSubdued.toLowerCase());
    expect(css).toContain(".revora-reviews-summary");
    expect(css).toContain(".revora-reviews__toolbar");
    expect(css).toContain(".revora-reviews__form");
  });

  it("ships interactive storefront features in the compiled asset", () => {
    const widgetSource = readFileSync(
      join(
        __dirname,
        "../../../extensions/revora-reviews/assets/revora-widget.js"
      ),
      "utf8"
    );

    expect(widgetSource).toContain(REVORA_WIDGET_PALETTE.brand);
    expect(widgetSource).toContain(".revora-reviews");
    expect(widgetSource).toContain("data-revora-sort");
    expect(widgetSource).toContain("data-revora-photos-only");
    expect(widgetSource).toContain("data-revora-vote");
    expect(widgetSource).toContain("data-revora-review-form");
    expect(widgetSource).toContain("revora-reviews-summary");
    expect(widgetSource).toContain("/apps/revora/reviews");
    expect(widgetSource).not.toContain("fontSizeBase");
    expect(widgetSource).not.toContain("shadowPopover");
  });
});
