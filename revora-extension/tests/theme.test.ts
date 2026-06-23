import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getRevoraCssVariables,
  getRevoraRootCss,
  REVORA_THEME,
} from "@revora/shared/theme";
import { describe, expect, it } from "vitest";

import { getRevoraCssVariables as getExtensionCssVariables } from "../lib/theme";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("extension theme integration", () => {
  it("re-exports the shared palette", () => {
    expect(REVORA_THEME.brand).toBe("#FF4F1A");
    expect(getExtensionCssVariables()).toBe(getRevoraCssVariables());
  });

  it("maps shared tokens to CSS variable declarations", () => {
    const vars = getRevoraCssVariables();

    expect(vars).toContain("--revora-brand: #FF4F1A;");
    expect(vars).toContain("--revora-text:");
    expect(vars).toContain("--revora-select-chevron:");
  });

  it("keeps palette tokens out of duplicated CSS variable blocks", () => {
    const extensionUi = readFileSync(
      join(__dirname, "../lib/extension-ui.css"),
      "utf8"
    );

    expect(extensionUi).not.toMatch(/^:root\s*\{/m);
    expect(extensionUi).toContain("var(--revora-select-chevron)");
    expect(getRevoraRootCss()).toContain("--revora-brand: #FF4F1A");
  });
});
