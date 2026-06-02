import { NextResponse } from "next/server";

/**
 * When MFCV_API_TOKEN is set, mutation and cost-bearing API routes require
 * `Authorization: Bearer <token>` or header `x-mfcv-api-token`.
 * When unset, auth is disabled (local dev default).
 */
export function getApiTokenConfig(): { enabled: boolean; token: string } {
  const token = (process.env.MFCV_API_TOKEN ?? "").trim();
  return { enabled: token.length > 0, token };
}

export function assertApiAuthorized(request: Request): NextResponse | null {
  const { enabled, token } = getApiTokenConfig();
  if (!enabled) {
    return null;
  }

  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
  const headerToken = (request.headers.get("x-mfcv-api-token") ?? "").trim();
  const provided = bearer || headerToken;

  if (provided !== token) {
    return NextResponse.json(
      { error: "Unauthorized. Provide MFCV_API_TOKEN via Bearer or x-mfcv-api-token." },
      { status: 401 },
    );
  }

  return null;
}