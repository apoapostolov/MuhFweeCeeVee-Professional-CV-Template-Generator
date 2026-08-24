import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { repoPath } from "./repoPaths";

const ISSUER = "https://auth.openai.com";
const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const REDIRECT_URI = `${ISSUER}/deviceauth/callback`;
const SESSION_FILE = repoPath("work", "ai-oauth", "openai-codex.json");
const PENDING_DIR = repoPath("work", "ai-oauth", "pending");
const MAX_LOGIN_AGE_MS = 15 * 60 * 1000;

type PendingLogin = {
  deviceAuthId: string;
  userCode: string;
  interval: number;
  createdAt: number;
};

type DeviceTokenResponse = {
  authorization_code?: string;
  code_challenge?: string;
  code_verifier?: string;
};

type OAuthTokenResponse = {
  id_token?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

function pendingFile(sessionId: string): string {
  if (!/^[a-f0-9-]+$/i.test(sessionId)) throw new Error("Invalid OAuth session.");
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

function expiresAtFromToken(idToken: string, expiresIn?: number): string {
  try {
    const payload = idToken.split(".")[1];
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    if (typeof claims.exp === "number") return new Date(claims.exp * 1000).toISOString();
  } catch {
    // Use the OAuth response lifetime when the ID token is not a JWT.
  }
  return new Date(Date.now() + Math.max(300, expiresIn ?? 3600) * 1000).toISOString();
}

export async function startCodexOAuth(): Promise<{
  sessionId: string;
  verificationUri: string;
  userCode: string;
  interval: number;
}> {
  const response = await fetch(`${ISSUER}/api/accounts/deviceauth/usercode`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID }),
    signal: AbortSignal.timeout(15000),
  });
  const payload = (await response.json()) as { device_auth_id?: string; user_code?: string; usercode?: string; interval?: number };
  const userCode = payload.user_code || payload.usercode || "";
  if (!response.ok || !payload.device_auth_id || !userCode) {
    throw new Error(`OpenAI Codex login could not start (${response.status}).`);
  }
  const sessionId = randomUUID();
  const interval = Math.max(5, payload.interval ?? 5);
  await fs.mkdir(PENDING_DIR, { recursive: true });
  await fs.writeFile(pendingFile(sessionId), JSON.stringify({ deviceAuthId: payload.device_auth_id, userCode, interval, createdAt: Date.now() }), "utf8");
  return { sessionId, verificationUri: `${ISSUER}/codex/device`, userCode, interval };
}

export async function pollCodexOAuth(sessionId: string): Promise<
  | { status: "pending"; interval: number }
  | { status: "connected"; expiresAt: string }
> {
  const pending = await readPendingLogin(sessionId);
  if (!pending || Date.now() - pending.createdAt > MAX_LOGIN_AGE_MS) {
    await deletePendingLogin(sessionId);
    throw new Error("OpenAI Codex login expired. Start login again.");
  }

  const response = await fetch(`${ISSUER}/api/accounts/deviceauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ device_auth_id: pending.deviceAuthId, user_code: pending.userCode }),
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 403 || response.status === 404) {
    return { status: "pending", interval: pending.interval };
  }
  const deviceTokens = (await response.json()) as DeviceTokenResponse;
  if (!response.ok || !deviceTokens.authorization_code || !deviceTokens.code_verifier) {
    throw new Error(`OpenAI Codex login failed (${response.status}).`);
  }

  const form = new URLSearchParams({
    grant_type: "authorization_code",
    code: deviceTokens.authorization_code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: deviceTokens.code_verifier,
  });
  const tokenResponse = await fetch(`${ISSUER}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form,
    signal: AbortSignal.timeout(15000),
  });
  const tokens = (await tokenResponse.json()) as OAuthTokenResponse;
  if (!tokenResponse.ok || !tokens.id_token || !tokens.access_token || !tokens.refresh_token) {
    throw new Error(`OpenAI Codex token exchange failed (${tokenResponse.status}).`);
  }

  const expiresAt = expiresAtFromToken(tokens.id_token, tokens.expires_in);
  await fs.mkdir(path.dirname(SESSION_FILE), { recursive: true });
  const temporary = `${SESSION_FILE}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify({
    providerId: "openai-codex",
    idToken: tokens.id_token,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
    connectedAt: new Date().toISOString(),
  }, null, 2), "utf8");
  try {
    await fs.rename(temporary, SESSION_FILE);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EPERM") throw error;
    await fs.copyFile(temporary, SESSION_FILE);
    await fs.unlink(temporary).catch(() => undefined);
  }
  await deletePendingLogin(sessionId);
  return { status: "connected", expiresAt };
}

export async function disconnectCodexOAuth(): Promise<void> {
  await fs.unlink(SESSION_FILE).catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  });
  try {
    const files = await fs.readdir(PENDING_DIR);
    await Promise.all(files.filter((file) => file.endsWith(".json")).map((file) => fs.unlink(path.join(PENDING_DIR, file))));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
