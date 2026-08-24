#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";

const ALLOWED_ROOTS = [
  ".github/",
  "ai-skills/",
  "apps/",
  "deploy/",
  "dev/",
  "docs/",
  "keywords/",
  "packages/",
  "proposal/",
  "services/",
  "scripts/",
  "skills/",
  "templates/",
  "images/",
];

const ALLOWED_FILES = new Set([
  ".dockerignore",
  ".env.example",
  ".env.test.example",
  ".gitignore",
  ".markdownlint-cli2.cjs",
  ".markdownlint.json",
  "AGENTS.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "Dockerfile",
  "LICENSE",
  "README.md",
  "TODO.md",
  "docker-compose.yml",
  "package-lock.json",
  "package.json",
  "vitest.config.ts",
]);

const ALLOWED_DATA_PREFIXES = [
  "data/applications/",
  "data/cover_letters/",
  "data/research/",
  "data/template_mappings/",
];

const ALLOWED_DATA_FILES = new Set([
  "data/cvs/cv_en_john_doe.yaml",
  "data/settings/companies.example.json",
  "data/settings/openrouter_image_pricing.yaml",
  "data/research/catalog.example.json",
]);

const FORBIDDEN_PATHS = [
  /^photos(\/|$)/i,
  /(^|\/)data\/assistant(\/|$)/i,
  /(^|\/)data\/cvs\/history(\/|$)/i,
  /(^|\/)data\/settings\/(?:ai|openrouter|companies\.personal)\./i,
  /(^|\/)work(\/|$)/i,
  /(^|\/)logs(\/|$)/i,
];

const GOVERNANCE_FILES = new Set([
  "AGENTS.md",
  "scripts/check-public-sync.mjs",
  "skills/patterns/muhfweeceevee-development/references/privacy-and-safety.md",
]);

const SENSITIVE_CONTENT = [
  { pattern: /Apostol\s+(?:Georgiev\s+)?Apostolov\b|theapoapostolov\b/i, label: "private name" },
  { pattern: /theapoapostolov@gmail\.com|apoapostolov@/i, label: "private email" },
  { pattern: /(?:\+359|0[87])\d{7,}/, label: "Bulgarian phone number" },
  { pattern: /Aleksandar\s+Stamboliyski|Sofia\s+Tower/i, label: "private address" },
  { pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/i, label: "private key" },
  { pattern: /\b(?:sk|xai|AIza|ghp|github_pat)-[A-Za-z0-9_-]{20,}/, label: "provider token" },
  { pattern: /\bBearer\s+(?!<|\[)[A-Za-z0-9._-]{20,}/i, label: "bearer token" },
  { pattern: /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token)\s*[:=]\s*["'][A-Za-z0-9._-]{20,}["']/i, label: "credential value" },
];

function isAllowedPath(file) {
  if (ALLOWED_FILES.has(file) || ALLOWED_DATA_FILES.has(file)) return true;
  if (ALLOWED_ROOTS.some((root) => file.startsWith(root))) return true;
  return ALLOWED_DATA_PREFIXES.some((prefix) => file.startsWith(prefix));
}

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
}

const violations = [];
for (const file of trackedFiles()) {
  if (!isAllowedPath(file)) violations.push({ file, reason: "outside public sync allowlist" });
  if (
    FORBIDDEN_PATHS.some((pattern) => pattern.test(file)) ||
    file === ".env" ||
    /(^|\/)\.env\.(?!(?:example|test\.example)$)[^/]+$/i.test(file)
  ) {
    violations.push({ file, reason: "forbidden private/runtime path" });
  }
  const absolute = path.resolve(process.cwd(), file);
  let raw;
  try {
    if (statSync(absolute).size > 2_000_000) continue;
    raw = readFileSync(absolute);
  } catch {
    continue;
  }
  if (raw.includes(0)) continue;
  const text = raw.toString("utf8");
  for (const { pattern, label } of SENSITIVE_CONTENT) {
    if (GOVERNANCE_FILES.has(file)) continue;
    if (pattern.test(text)) violations.push({ file, reason: label });
  }
}

if (violations.length > 0) {
  console.error("Public sync gate failed:");
  for (const violation of violations) console.error(`- ${violation.file}: ${violation.reason}`);
  process.exitCode = 1;
} else {
  console.log(`Public sync gate passed (${trackedFiles().length} tracked files checked).`);
}
