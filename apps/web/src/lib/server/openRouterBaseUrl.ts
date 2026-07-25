/**
 * SSRF guard for OpenRouter chat completions endpoint.
 * Only https://openrouter.ai (and www) chat completion paths are allowed.
 */

export const OPENROUTER_CHAT_COMPLETIONS_DEFAULT =
  "https://openrouter.ai/api/v1/chat/completions";

const ALLOWED_HOSTS = new Set(["openrouter.ai", "www.openrouter.ai"]);

export type OpenRouterBaseUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export function normalizeOpenRouterBaseUrl(raw: unknown): OpenRouterBaseUrlResult {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { ok: true, url: OPENROUTER_CHAT_COMPLETIONS_DEFAULT };
  }

  const trimmed = raw.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "baseUrl must be a valid absolute URL." };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, error: "baseUrl must use https." };
  }

  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) {
    return {
      ok: false,
      error: "baseUrl host must be openrouter.ai (SSRF protection).",
    };
  }

  // Reject credentials / userinfo in URL
  if (parsed.username || parsed.password) {
    return { ok: false, error: "baseUrl must not include credentials." };
  }

  // Normalize to known API path if someone passes the origin only
  const path = parsed.pathname.replace(/\/+$/, "") || "";
  if (path === "" || path === "/api/v1" || path === "/api/v1/chat/completions") {
    return {
      ok: true,
      url: `https://${host === "www.openrouter.ai" ? "www.openrouter.ai" : "openrouter.ai"}/api/v1/chat/completions`,
    };
  }

  if (!path.startsWith("/api/v1/")) {
    return {
      ok: false,
      error: "baseUrl path must be under /api/v1/ on openrouter.ai.",
    };
  }

  parsed.hash = "";
  return { ok: true, url: parsed.toString() };
}

export function resolveOpenRouterBaseUrl(raw: unknown): string {
  const result = normalizeOpenRouterBaseUrl(raw);
  if (result.ok) {
    return result.url;
  }
  return OPENROUTER_CHAT_COMPLETIONS_DEFAULT;
}
