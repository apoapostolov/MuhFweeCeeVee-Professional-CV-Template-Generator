import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));
const webSrc = path.join(repoRoot, "apps/web/src");

export default defineConfig({
  resolve: {
    alias: {
      "@": webSrc,
      "@muhfweeceevee/schemas": path.join(
        repoRoot,
        "packages/schemas/src/index.ts",
      ),
    },
  },
  test: {
    include: [
      "packages/schemas/src/**/*.test.ts",
      "apps/web/src/**/*.test.ts",
      // Audit suites are expected to fail while they document a gap. They use
      // describe.skip, so they are inert here and only run when named directly.
      "apps/web/src/**/*.audit.ts",
    ],
    environment: "node",
    setupFiles: ["apps/web/src/test/load-env-test.ts"],
  },
});