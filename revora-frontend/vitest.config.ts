import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
      "@revora/shared/theme": path.resolve(
        import.meta.dirname,
        "../packages/revora-shared/src/theme.ts"
      ),
      "@revora/shared/constants": path.resolve(
        import.meta.dirname,
        "../packages/revora-shared/src/constants.ts"
      ),
      "@revora/shared/bridge-dom": path.resolve(
        import.meta.dirname,
        "../packages/revora-shared/src/bridge-dom.ts"
      ),
      "@revora/shared/theme-storefront": path.resolve(
        import.meta.dirname,
        "../packages/revora-shared/src/theme-storefront.ts"
      ),
    },
  },
  test: {
    environment: "node",
  },
});
