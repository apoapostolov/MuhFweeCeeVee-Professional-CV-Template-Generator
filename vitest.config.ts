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
    ],
    environment: "node",
    setupFiles: ["apps/web/src/test/load-env-test.ts"],
  },
});