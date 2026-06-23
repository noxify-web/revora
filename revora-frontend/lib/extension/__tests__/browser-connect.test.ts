import { REVORA_LOGO_ASSETS } from "@revora/shared/constants";
import { getRevoraConnectPageStyles, REVORA_THEME } from "@revora/shared/theme";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/db", () => ({
  db: {},
}));

vi.mock("@/lib/extension/auth", () => ({
  generateExtensionToken: vi.fn(),
  revokeShopExtensionTokens: vi.fn(),
}));

import { renderShopPromptHtml } from "../browser-connect";

describe("renderShopPromptHtml", () => {
  it("uses shared connect page styles", () => {
    const html = renderShopPromptHtml({
      redirectUri: "https://abcdefghijklmnop.chromiumapp.org/",
    });

    expect(html).toContain(getRevoraConnectPageStyles().trim());
    expect(html).toContain(`background: ${REVORA_THEME.surfaceSubdued}`);
    expect(html).toContain(`background: ${REVORA_THEME.surface}`);
    expect(html).toContain(`background: ${REVORA_THEME.fillBrand}`);
    expect(html).toContain(`href="${REVORA_LOGO_ASSETS.ico}"`);
    expect(html).toContain(`src="${REVORA_LOGO_ASSETS.svg}"`);
    expect(html).toContain('class="connect-brand"');
  });

  it("renders errors with the theme critical text color", () => {
    const html = renderShopPromptHtml({
      redirectUri: "https://abcdefghijklmnop.chromiumapp.org/",
      error: "Invalid shop domain",
    });

    expect(html).toContain(`color:${REVORA_THEME.textCritical}`);
  });
});
