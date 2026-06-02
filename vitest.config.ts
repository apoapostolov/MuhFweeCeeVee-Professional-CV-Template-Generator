import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/schemas/src/**/*.test.ts",
      "apps/web/src/**/*.test.ts",
    ],
    environment: "node",
  },
});