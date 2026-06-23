import { describe, expect, it } from "vitest";

import {
  getRevoraConnectPageStyles,
  getRevoraCssVariables,
  getRevoraReviewsWidgetCss,
  getRevoraRootCss,
  getRevoraSelectChevronDataUri,
  REVORA_THEME,
} from "./theme";
import {
  getRevoraReviewsWidgetCss as getStorefrontWidgetCss,
  REVORA_WIDGET_PALETTE,
} from "./theme-storefront";

const REVORA_THEME_CSS_VARS = [
  "--revora-brand",
  "--revora-text",
  "--revora-text-subdued",
  "--revora-surface",
  "--revora-surface-subdued",
  "--revora-fill-brand",
  "--revora-font",
  "--revora-radius",
  "--revora-shadow",
] as const;

describe("REVORA_THEME", () => {
  it("uses the Northstar landing palette for brand and surfaces", () => {
    expect(REVORA_THEME.brand).toBe("#FF4F1A");
    expect(REVORA_THEME.text).toBe("#0C0C0C");
    expect(REVORA_THEME.textSubdued).toBe("#5C5A56");
    expect(REVORA_THEME.textOnFill).toBe("#F6F3EE");
    expect(REVORA_THEME.surfaceSubdued).toBe("#F6F3EE");
    expect(REVORA_THEME.surfaceHover).toBe("#E8E4DC");
    expect(REVORA_THEME.fillBrand).toBe("#FF4F1A");
    expect(REVORA_THEME.border).toBe("rgba(12, 12, 12, 0.12)");
  });

  it("maps theme tokens to CSS variable declarations", () => {
    const vars = getRevoraCssVariables();

    for (const cssVar of REVORA_THEME_CSS_VARS) {
      expect(vars).toContain(`${cssVar}:`);
    }
  });

  it("wraps variables in a root selector", () => {
    expect(getRevoraRootCss()).toMatch(/^:root \{/);
    expect(getRevoraRootCss(":host")).toContain(":host {");
  });

  it("derives the select chevron from textSubdued", () => {
    expect(getRevoraSelectChevronDataUri()).toContain("%235c5a56");
  });

  it("builds connect page styles from the same palette", () => {
    const connectStyles = getRevoraConnectPageStyles();

    expect(connectStyles).toContain(REVORA_THEME.surfaceSubdued);
    expect(connectStyles).toContain(REVORA_THEME.surface);
    expect(connectStyles).toContain(REVORA_THEME.fillBrand);
    expect(connectStyles).toContain(REVORA_THEME.textSubdued);
  });

  it("re-exports storefront widget CSS aligned with the widget palette", () => {
    expect(getRevoraReviewsWidgetCss()).toBe(getStorefrontWidgetCss());
    expect(REVORA_WIDGET_PALETTE.brand).toBe(REVORA_THEME.brand);
    expect(REVORA_WIDGET_PALETTE.text).toBe(REVORA_THEME.text);
    expect(REVORA_WIDGET_PALETTE.textSubdued).toBe(REVORA_THEME.textSubdued);
    expect(REVORA_WIDGET_PALETTE.surfaceSubdued).toBe(
      REVORA_THEME.surfaceSubdued
    );
    expect(REVORA_WIDGET_PALETTE.surfaceHover).toBe(REVORA_THEME.surfaceHover);
  });
});
