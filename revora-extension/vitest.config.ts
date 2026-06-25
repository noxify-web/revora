import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@revora/shared/extension-types",
        replacement: path.resolve(
          import.meta.dirname,
          "../packages/revora-shared/src/extension-types.ts"
        ),
      },
      {
        find: "@revora/shared/extension-messages",
        replacement: path.resolve(
          import.meta.dirname,
          "../packages/revora-shared/src/extension-messages.ts"
        ),
      },
      {
        find: "@revora/shared/extension-schemas",
        replacement: path.resolve(
          import.meta.dirname,
          "../packages/revora-shared/src/extension-schemas.ts"
        ),
      },
      {
        find: "@revora/shared/constants",
        replacement: path.resolve(
          import.meta.dirname,
          "../packages/revora-shared/src/constants.ts"
        ),
      },
      {
        find: "@revora/shared/theme",
        replacement: path.resolve(
          import.meta.dirname,
          "../packages/revora-shared/src/theme.ts"
        ),
      },
      {
        find: "@revora/shared",
        replacement: path.resolve(
          import.meta.dirname,
          "../packages/revora-shared/src/index.ts"
        ),
      },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
