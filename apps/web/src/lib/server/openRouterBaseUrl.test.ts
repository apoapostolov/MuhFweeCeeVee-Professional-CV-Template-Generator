import { describe, expect, it } from "vitest";

import {
  normalizeOpenRouterBaseUrl,
  OPENROUTER_CHAT_COMPLETIONS_DEFAULT,
  resolveOpenRouterBaseUrl,
} from "./openRouterBaseUrl";

describe("normalizeOpenRouterBaseUrl", () => {
  it("defaults empty to OpenRouter chat completions", () => {
    expect(normalizeOpenRouterBaseUrl("")).toEqual({
      ok: true,
      url: OPENROUTER_CHAT_COMPLETIONS_DEFAULT,
    });
    expect(normalizeOpenRouterBaseUrl(undefined)).toEqual({
      ok: true,
      url: OPENROUTER_CHAT_COMPLETIONS_DEFAULT,
    });
  });

  it("accepts the canonical URL", () => {
    expect(
      normalizeOpenRouterBaseUrl("https://openrouter.ai/api/v1/chat/completions"),
    ).toEqual({
      ok: true,
      url: "https://openrouter.ai/api/v1/chat/completions",
    });
  });

  it("rejects http and non-openrouter hosts", () => {
    expect(normalizeOpenRouterBaseUrl("http://openrouter.ai/api/v1/chat/completions").ok).toBe(
      false,
    );
    expect(normalizeOpenRouterBaseUrl("https://evil.example/steal").ok).toBe(false);
    expect(normalizeOpenRouterBaseUrl("https://127.0.0.1/").ok).toBe(false);
    expect(normalizeOpenRouterBaseUrl("https://169.254.169.254/latest/meta-data/").ok).toBe(
      false,
    );
  });

  it("rejects userinfo in URL", () => {
    expect(
      normalizeOpenRouterBaseUrl("https://user:pass@openrouter.ai/api/v1/chat/completions").ok,
    ).toBe(false);
  });

  it("resolveOpenRouterBaseUrl falls back on invalid input", () => {
    expect(resolveOpenRouterBaseUrl("https://evil.test/x")).toBe(
      OPENROUTER_CHAT_COMPLETIONS_DEFAULT,
    );
  });
});
