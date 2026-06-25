import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(webRoot, "../..");

const nextConfig: NextConfig = {
  // WSL + Windows browser: allow dev asset/HMR requests from common local origins.
  allowedDevOrigins: [
    "localhost:3005",
    "127.0.0.1:3005",
    "192.168.1.217:3005",
    "localhost:10003",
    "127.0.0.1:10003",
  ],
  turbopack: {
    resolveAlias: {
      // PostCSS (nested under Next) requires this subpath; Turbopack does not hoist it from the monorepo root.
      "nanoid/non-secure": path.join(
        repoRoot,
        "node_modules/nanoid/non-secure/index.js",
      ),
    },
  },
};

export default nextConfig;