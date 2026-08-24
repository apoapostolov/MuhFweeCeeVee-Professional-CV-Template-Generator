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
    "localhost:10004",
    "127.0.0.1:10004",
    "localhost",
    "127.0.0.1",
    "192.168.1.217",
    "192.168.1.217:10004",
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
  webpack: (config) => {
    // /mnt/c does not emit inotify events across the Windows->WSL boundary.
    // Poll source files, but never watch generated output or runtime data. Watching
    // .next/data made webpack emit periodic full reloads during normal editing.
    config.watchOptions = {
      ...(config.watchOptions || {}),
      poll: 300,
      aggregateTimeout: 300,
      ignored: /node_modules|[/\\]\.next[/\\]|[/\\](?:logs|work|data)[/\\]/,
    };
    return config;
  },
};

export default nextConfig;
