import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("storefront reviews route wiring", () => {
  it("shares handler implementations across app proxy and api storefront paths", () => {
    const appProxyRoute = readFileSync(
      join(__dirname, "../../../app/apps/revora/reviews/route.ts"),
      "utf8"
    );
    const apiRoute = readFileSync(
      join(__dirname, "../../../app/api/storefront/reviews/route.ts"),
      "utf8"
    );

    expect(appProxyRoute).toContain("@/lib/storefront/reviews-route");
    expect(apiRoute).toContain("@/lib/storefront/reviews-route");
    expect(appProxyRoute).toContain("export { GET, OPTIONS, POST }");
    expect(apiRoute).toContain("export { GET, OPTIONS, POST }");
  });
});
