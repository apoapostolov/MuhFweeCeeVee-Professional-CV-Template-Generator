import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { repoPath } from "./repoPaths";

const ISSUER = "https://auth.x.ai";
const CLIENT_ID = "b1a00492-073a-47ea-816f-4c329264a828";
const SCOPE = "openid profile email offline_access grok-cli:access api:access";
const DEVICE_CODE_URL = `${ISSUER}/oauth2/device/code`;
const TOKEN_URL = `${ISSUER}/oauth2/token`;
const SESSION_FILE = repoPath("work", "ai-oauth", "xai-oauth.json");
const PENDING_DIR = repoPath("work", "ai-oauth", "pending");
const MAX_LOGIN_AGE_MS = 15 * 60 * 1000;
const REFRESH_SKEW_MS = 5 * 60 * 1000;

type PendingLogin = {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  interval: number;
  expiresAt: number;
  createdAt: number;
};

type OAuthTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type XaiOAuthSession = {
  providerId: "xai-oauth";
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  connectedAt: string;
};

function pendingFile(sessionId: string): string {
  if (!/^xai-[a-f0-9-]+$/i.test(sessionId)) throw new Error("Invalid OAuth session.");
  return path.join(PENDING_DIR, `${sessionId}.json`);
}

async function readPendingLogin(sessionId: string): Promise<PendingLogin | null> {
  try {
    return JSON.parse(await fs.readFile(pendingFile(sessionId), "utf8")) as PendingLogin;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function deletePendingLogin(sessionId: string): Promise<void> {
  await fs.unlink(pendingFile(sessionId)).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  });
}

async function postForm(fields: Record<string, string>): Promise<{ response: Response; payload: OAuthTokenResponse & Record<string, unknown> }> {
  const response = await fetch(DEVICE_CODE_URL, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields),
    signal: AbortSignal.timeout(15000),
  });
  const payload = (await response.json().catch(() => ({}))) as OAuthTokenResponse & Record<string, unknown>;
  return { response, payload };
}

async function writeSession(tokens: OAuthTokenResponse, previousRefreshToken?: string): Promise<XaiOAuthSession> {
  if (!tokens.access_token) throw new Error("xAI OAuth response did not include an access token.");
  const refreshToken = tokens.refresh_token ?? previousRefreshToken;
  if (!refreshToken) throw new Error("xAI OAuth response did not include a refresh token.");
  const lifetime = typeof tokens.expires_in === "number" && tokens.expires_in > 0 ? tokens.expires_in : 3600;
  const session: XaiOAuthSession = {
    providerId: "xai-oauth",
    accessToken: tokens.access_token,
    refreshToken,
    expiresAt: new Date(Date.now() + Math.max(300, lifetime) * 1000 - REFRESH_SKEW_MS).toISOString(),
    connectedAt: new Date().toISOString(),
  };
  await fs.mkdir(path.dirname(SESSION_FILE), { recursive: true });
  const temporary = `${SESSION_FILE}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(session, null, 2), "utf8");
  try {
    await fs.rename(temporary, SESSION_FILE);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EPERM") throw error;
    await fs.copyFile(temporary, SESSION_FILE);
    await fs.unlink(temporary).catch(() => undefined);
  }
  return session;
}

export async function startXaiOAuth(): Promise<{
  sessionId: string;
  verificationUri: string;
  userCode: string;
  interval: number;
}> {
  const { response, payload } = await postForm({ client_id: CLIENT_ID, scope: SCOPE, referrer: "mfcv" });
  const verificationUri = typeof payload.verification_uri === "string" ? payload.verification_uri : "";
  const userCode = typeof payload.user_code === "string" ? payload.user_code : "";
  const deviceCode = typeof payload.device_code === "string" ? payload.device_code : "";
  const expiresIn = typeof payload.expires_in === "number" && payload.expires_in > 0 ? payload.expires_in : 900;
  if (!response.ok || !deviceCode || !userCode || !verificationUri.startsWith("https://")) {
    throw new Error(`xAI OAuth login could not start (${response.status}).`);
  }
  const sessionId = `xai-${randomUUID()}`;
  const interval = typeof payload.interval === "number" && payload.interval > 0 ? payload.interval : 5;
  await fs.mkdir(PENDING_DIR, { recursive: true });
  await fs.writeFile(pendingFile(sessionId), JSON.stringify({
    deviceCode,
    userCode,
    verificationUri,
    interval,
    expiresAt: Date.now() + expiresIn * 1000,
    createdAt: Date.now(),
  } satisfies PendingLogin), "utf8");
  return { sessionId, verificationUri, userCode, interval };
}

export async function pollXaiOAuth(sessionId: string): Promise<
  | { status: "pending"; interval: number }
  | { status: "connected"; expiresAt: string }
> {
  const pending = await readPendingLogin(sessionId);
  if (!pending || Date.now() - pending.createdAt > MAX_LOGIN_AGE_MS || Date.now() >= pending.expiresAt) {
    await deletePendingLogin(sessionId);
    throw new Error("xAI login expired. Start login again.");
  }
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      client_id: CLIENT_ID,
      device_code: pending.deviceCode,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const payload = (await response.json().catch(() => ({}))) as OAuthTokenResponse & Record<string, unknown>;
  if (response.ok) {
    const session = await writeSession(payload);
    await deletePendingLogin(sessionId);
    return { status: "connected", expiresAt: session.expiresAt };
  }
  if (payload.error === "authorization_pending") return { status: "pending", interval: pending.interval };
  if (payload.error === "slow_down") {
    const interval = typeof payload.interval === "number" && payload.interval > 0 ? payload.interval : pending.interval + 5;
    return { status: "pending", interval };
  }
  if (payload.error === "access_denied" || payload.error === "authorization_denied") throw new Error("xAI device authorization was denied.");
  if (payload.error === "expired_token") throw new Error("xAI device code expired. Start login again.");
  throw new Error(`xAI OAuth login failed (${response.status}).${payload.error_description ? ` ${payload.error_description}` : ""}`);
}

export async function readXaiOAuthAccessToken(): Promise<string> {
  let session: XaiOAuthSession;
  try {
    session = JSON.parse(await fs.readFile(SESSION_FILE, "utf8")) as XaiOAuthSession;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
  if (Date.parse(session.expiresAt) > Date.now() + REFRESH_SKEW_MS) return session.accessToken;
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", client_id: CLIENT_ID, refresh_token: session.refreshToken }),
    signal: AbortSignal.timeout(15000),
  });
  const payload = (await response.json().catch(() => ({}))) as OAuthTokenResponse;
  if (!response.ok) throw new Error(`xAI OAuth token refresh failed (${response.status}).`);
  const refreshed = await writeSession(payload, session.refreshToken);
  return refreshed.accessToken;
}

export async function disconnectXaiOAuth(): Promise<void> {
  await fs.unlink(SESSION_FILE).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  });
  try {
    const files = await fs.readdir(PENDING_DIR);
    await Promise.all(files.filter((file) => file.startsWith("xai-") && file.endsWith(".json")).map((file) => fs.unlink(path.join(PENDING_DIR, file))));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
