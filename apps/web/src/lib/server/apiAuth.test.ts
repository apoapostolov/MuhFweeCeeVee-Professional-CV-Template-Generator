import { afterEach, describe, expect, it } from "vitest";

import { assertApiAuthorized, getApiTokenConfig, isLoopbackRequest } from "./apiAuth";

const ORIGINAL_ENV = { ...process.env };

function setEnv(partial: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(partial)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function request(url: string, headers?: Record<string, string>): Request {
  return new Request(url, { headers });
}

describe("isLoopbackRequest", () => {
  it("detects localhost and 127.0.0.1", () => {
    expect(isLoopbackRequest(request("http://localhost:3005/api/x", { host: "localhost:3005" }))).toBe(
      true,
    );
    expect(isLoopbackRequest(request("http://127.0.0.1:3005/api/x", { host: "127.0.0.1:3005" }))).toBe(
      true,
    );
    expect(isLoopbackRequest(request("http://example.com/api/x", { host: "example.com" }))).toBe(
      false,
    );
  });
});

describe("assertApiAuthorized", () => {
  it("allows loopback when token unset", () => {
    setEnv({ MFCV_API_TOKEN: undefined, NODE_ENV: "development", MFCV_REQUIRE_API_TOKEN: undefined });
    expect(
      assertApiAuthorized(request("http://localhost/api", { host: "localhost:3005" })),
    ).toBeNull();
  });

  it("denies non-loopback in production when token unset", () => {
    setEnv({ MFCV_API_TOKEN: undefined, NODE_ENV: "production", MFCV_REQUIRE_API_TOKEN: undefined });
    const denied = assertApiAuthorized(
      request("http://example.com/api", { host: "cv.example.com" }),
    );
    expect(denied?.status).toBe(401);
  });

  it("allows loopback even when token is set (UI path)", () => {
    setEnv({ MFCV_API_TOKEN: "secret-token-value", NODE_ENV: "production" });
    expect(
      assertApiAuthorized(request("http://localhost/api", { host: "localhost:3005" })),
    ).toBeNull();
  });

  it("requires token for non-loopback when configured", () => {
    setEnv({ MFCV_API_TOKEN: "secret-token-value", NODE_ENV: "production" });
    const noToken = assertApiAuthorized(
      request("http://example.com/api", { host: "cv.example.com" }),
    );
    expect(noToken?.status).toBe(401);

    const bad = assertApiAuthorized(
      request("http://example.com/api", {
        host: "cv.example.com",
        authorization: "Bearer wrong",
      }),
    );
    expect(bad?.status).toBe(401);

    const ok = assertApiAuthorized(
      request("http://example.com/api", {
        host: "cv.example.com",
        authorization: "Bearer secret-token-value",
      }),
    );
    expect(ok).toBeNull();

    const okHeader = assertApiAuthorized(
      request("http://example.com/api", {
        host: "cv.example.com",
        "x-mfcv-api-token": "secret-token-value",
      }),
    );
    expect(okHeader).toBeNull();
  });

  it("reports enabled when token present", () => {
    setEnv({ MFCV_API_TOKEN: "abc" });
    expect(getApiTokenConfig().enabled).toBe(true);
  });
});
