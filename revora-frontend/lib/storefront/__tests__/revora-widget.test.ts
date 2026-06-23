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
    expect(css).toContain(REVORA_WIDGET_PALETTE.surfaceHover);
  });

  it("ships only the widget palette in the compiled storefront asset", () => {
    const widgetSource = readFileSync(
      join(
        __dirname,
        "../../../extensions/revora-reviews/assets/revora-widget.js"
      ),
      "utf8"
    );

    expect(widgetSource).toContain(REVORA_WIDGET_PALETTE.brand);
    expect(widgetSource).toContain(".revora-reviews");
    expect(widgetSource).toContain("revora-reviews-styles");
    expect(widgetSource).not.toContain("fontSizeBase");
    expect(widgetSource).not.toContain("shadowPopover");
  });
});
