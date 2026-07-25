import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

/**
 * When MFCV_API_TOKEN is set, mutation and cost-bearing API routes require
 * `Authorization: Bearer <token>` or header `x-mfcv-api-token` for
 * non-loopback clients. Loopback (localhost / 127.0.0.1) is trusted so the
 * same-origin browser UI keeps working without injecting the secret.
 *
 * When unset:
 * - loopback: open (local dev default)
 * - production + non-loopback: denied (must set MFCV_API_TOKEN to expose)
 */

export function getApiTokenConfig(): { enabled: boolean; token: string } {
  const token = (process.env.MFCV_API_TOKEN ?? "").trim();
  return { enabled: token.length > 0, token };
}

export function isLoopbackRequest(request: Request): boolean {
  const hostHeader = (request.headers.get("host") ?? "").split(",")[0].trim().toLowerCase();
  if (!hostHeader) {
    return false;
  }
  const hostname = hostHeader.replace(/:\d+$/, "").replace(/^\[|\]$/g, "");
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "0:0:0:0:0:0:0:1"
  );
}

function tokensEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function extractProvidedToken(request: Request): string {
  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  const headerToken = (request.headers.get("x-mfcv-api-token") ?? "").trim();
  return bearer || headerToken;
}

export function assertApiAuthorized(request: Request): NextResponse | null {
  const loopback = isLoopbackRequest(request);
  const { enabled, token } = getApiTokenConfig();
  const production = process.env.NODE_ENV === "production";
  const forceAuth =
    process.env.MFCV_REQUIRE_API_TOKEN === "1" ||
    process.env.MFCV_REQUIRE_API_TOKEN === "true";

  if (!enabled) {
    if (forceAuth) {
      return NextResponse.json(
        {
          error:
            "MFCV_API_TOKEN must be configured when MFCV_REQUIRE_API_TOKEN is enabled.",
        },
        { status: 503 },
      );
    }
    if (production && !loopback) {
      return NextResponse.json(
        {
          error:
            "API auth required for non-localhost access. Set MFCV_API_TOKEN before exposing this host.",
        },
        { status: 401 },
      );
    }
    return null;
  }

  // Token configured: trust loopback UI; require token off-box.
  if (loopback) {
    return null;
  }

  const provided = extractProvidedToken(request);
  if (!provided || !tokensEqual(provided, token)) {
    return NextResponse.json(
      {
        error:
          "Unauthorized. Provide MFCV_API_TOKEN via Bearer or x-mfcv-api-token.",
      },
      { status: 401 },
    );
  }

  return null;
}
