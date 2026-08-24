import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { repoPath } from "./repoPaths";
import type { AiQuota } from "./aiProviderTypes";

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

type CodexSession = {
  providerId?: string;
  idToken?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  connectedAt?: string;
  accountId?: string;
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

function accountIdFromIdToken(idToken: string): string | undefined {
  try {
    const payload = idToken.split(".")[1];
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
    const auth = claims["https://api.openai.com/auth"];
    if (auth && typeof auth === "object" && !Array.isArray(auth)) {
      const accountId = (auth as Record<string, unknown>).chatgpt_account_id;
      if (typeof accountId === "string" && accountId.trim()) return accountId.trim();
    }
  } catch {
    // The usage endpoint can still work without the optional account header.
  }
  return undefined;
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

async function readCodexSession(): Promise<CodexSession | null> {
  try {
    return JSON.parse(await fs.readFile(SESSION_FILE, "utf8")) as CodexSession;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function writeCodexSession(session: CodexSession): Promise<void> {
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
}

async function refreshCodexSession(session: CodexSession): Promise<CodexSession | null> {
  if (!session.refreshToken) return null;
  const form = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: session.refreshToken,
    client_id: CLIENT_ID,
  });
  try {
    const response = await fetch(`${ISSUER}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(15000),
    });
    const tokens = (await response.json().catch(() => ({}))) as OAuthTokenResponse;
    if (!response.ok || !tokens.access_token) return null;
    const idToken = tokens.id_token || session.idToken || "";
    const next: CodexSession = {
      ...session,
      providerId: "openai-codex",
      idToken,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || session.refreshToken,
      expiresAt: expiresAtFromToken(idToken, tokens.expires_in),
      connectedAt: session.connectedAt || new Date().toISOString(),
      accountId: idToken ? accountIdFromIdToken(idToken) || session.accountId : session.accountId,
    };
    await writeCodexSession(next);
    return next;
  } catch {
    return null;
  }
}

export async function readCodexOAuthCredentials(): Promise<{ accessToken: string; accountId?: string }> {
  const accessToken = await readCodexOAuthAccessToken();
  const session = await readCodexSession();
  return {
    accessToken,
    accountId: session?.accountId ?? (session?.idToken ? accountIdFromIdToken(session.idToken) : undefined),
  };
}

export async function readCodexOAuthAccessToken(): Promise<string> {
  const session = await readCodexSession();
  if (!session?.accessToken) throw new Error("OpenAI Codex is not connected.");
  const expiresAt = session.expiresAt ? Date.parse(session.expiresAt) : 0;
  if (expiresAt > Date.now() + 60_000) return session.accessToken;
  const refreshed = await refreshCodexSession(session);
  if (refreshed?.accessToken) return refreshed.accessToken;
  throw new Error("OpenAI Codex session expired. Reconnect the provider.");
}

export async function getCodexOAuthStatus(): Promise<{ connected: boolean; expiresAt?: string }> {
  try {
    const session = await readCodexSession();
    if (!session?.accessToken) return { connected: false };
    const expiresAt = session.expiresAt ? Date.parse(session.expiresAt) : 0;
    if (expiresAt <= Date.now() + 60_000) {
      const refreshed = await refreshCodexSession(session);
      if (refreshed?.accessToken) return { connected: true, expiresAt: refreshed.expiresAt };
      return { connected: false, expiresAt: session.expiresAt };
    }
    return { connected: true, expiresAt: session.expiresAt };
  } catch {
    return { connected: false };
  }
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
    accountId: accountIdFromIdToken(tokens.id_token),
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

export async function fetchCodexQuotas(): Promise<AiQuota[]> {
  try {
    const accessToken = await readCodexOAuthAccessToken();
    const session = await readCodexSession();
    if (!session) return [];
    const accountId = session.accountId ?? (session.idToken ? accountIdFromIdToken(session.idToken) : undefined);
    const response = await fetch("https://chatgpt.com/backend-api/wham/usage", {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${accessToken}`,
        ...(accountId ? { "ChatGPT-Account-Id": accountId } : {}),
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return [];
    const payload = (await response.json().catch(() => ({}))) as {
      rate_limit?: {
        primary_window?: { used_percent?: number; limit_window_seconds?: number } | null;
        secondary_window?: { used_percent?: number; limit_window_seconds?: number } | null;
      };
    };
    const periodForWindow = (window: { limit_window_seconds?: number } | null | undefined): "weekly" | "rolling" =>
      window?.limit_window_seconds !== undefined && window.limit_window_seconds >= 6 * 24 * 60 * 60 ? "weekly" : "rolling";
    const windows = [
      { window: payload.rate_limit?.secondary_window, period: periodForWindow(payload.rate_limit?.secondary_window), label: "OpenAI Codex quota" },
      { window: payload.rate_limit?.primary_window, period: periodForWindow(payload.rate_limit?.primary_window), label: "OpenAI Codex quota" },
    ];
    const checkedAt = new Date().toISOString();
    return windows.flatMap(({ window, period, label }) => {
      if (!window || typeof window.used_percent !== "number" || !Number.isFinite(window.used_percent)) return [];
      return [{
        providerId: "openai-codex",
        available: true,
        label,
        remaining: Math.max(0, Math.min(100, 100 - window.used_percent)),
        limit: 100,
        unit: "ratio",
        period,
        checkedAt,
      } satisfies AiQuota];
    });
  } catch {
    return [];
  }
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
