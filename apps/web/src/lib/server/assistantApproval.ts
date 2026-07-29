import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import type {
  AssistantApprovalKind,
  AssistantContextEnvelope,
} from "@muhfweeceevee/schemas";

const TOKEN_VERSION = 1;
const DEFAULT_TTL_MS = 5 * 60 * 1000;

type ApprovalBinding = {
  sessionId: string;
  toolName: string;
  approvalKind: AssistantApprovalKind;
  arguments: Record<string, unknown>;
  context: AssistantContextEnvelope;
};

type ApprovalTokenPayload = {
  version: typeof TOKEN_VERSION;
  sessionId: string;
  toolName: string;
  approvalKind: AssistantApprovalKind;
  argumentsHash: string;
  contextHash: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

export type ApprovalVerification =
  | { valid: true; payload: ApprovalTokenPayload }
  | {
      valid: false;
      code: "MALFORMED" | "INVALID_SIGNATURE" | "EXPIRED" | "STALE";
    };

function canonicalize(value: unknown): string {
  if (value === undefined) {
    return '"[undefined]"';
  }
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) as string;
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
    .join(",")}}`;
}

export function hashAssistantApprovalValue(value: unknown): string {
  return createHash("sha256").update(canonicalize(value)).digest("base64url");
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function signaturesEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function issueAssistantApprovalToken(
  binding: ApprovalBinding,
  secret: string,
  options: { now?: number; ttlMs?: number } = {},
): string {
  if (secret.length < 32) {
    throw new Error("Assistant approval secret must be at least 32 characters.");
  }
  const issuedAt = options.now ?? Date.now();
  const payload: ApprovalTokenPayload = {
    version: TOKEN_VERSION,
    sessionId: binding.sessionId,
    toolName: binding.toolName,
    approvalKind: binding.approvalKind,
    argumentsHash: hashAssistantApprovalValue(binding.arguments),
    contextHash: hashAssistantApprovalValue(binding.context),
    issuedAt,
    expiresAt: issuedAt + (options.ttlMs ?? DEFAULT_TTL_MS),
    nonce: randomBytes(16).toString("base64url"),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function verifyAssistantApprovalToken(
  token: string,
  binding: ApprovalBinding,
  secret: string,
  now = Date.now(),
): ApprovalVerification {
  const [encodedPayload, providedSignature, extra] = token.split(".");
  if (!encodedPayload || !providedSignature || extra) {
    return { valid: false, code: "MALFORMED" };
  }

  const expectedSignature = sign(encodedPayload, secret);
  if (!signaturesEqual(providedSignature, expectedSignature)) {
    return { valid: false, code: "INVALID_SIGNATURE" };
  }

  let payload: ApprovalTokenPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as ApprovalTokenPayload;
  } catch {
    return { valid: false, code: "MALFORMED" };
  }

  if (
    payload.version !== TOKEN_VERSION ||
    typeof payload.expiresAt !== "number" ||
    typeof payload.issuedAt !== "number" ||
    typeof payload.nonce !== "string"
  ) {
    return { valid: false, code: "MALFORMED" };
  }
  if (now > payload.expiresAt) {
    return { valid: false, code: "EXPIRED" };
  }

  const isCurrent =
    payload.sessionId === binding.sessionId &&
    payload.toolName === binding.toolName &&
    payload.approvalKind === binding.approvalKind &&
    payload.argumentsHash === hashAssistantApprovalValue(binding.arguments) &&
    payload.contextHash === hashAssistantApprovalValue(binding.context);

  return isCurrent
    ? { valid: true, payload }
    : { valid: false, code: "STALE" };
}
