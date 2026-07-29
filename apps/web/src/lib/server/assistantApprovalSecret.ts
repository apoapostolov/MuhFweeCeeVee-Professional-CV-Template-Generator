import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { repoPath } from "./repoPaths";

const SECRET_PATH = repoPath("data", "assistant", "approval-secret");
let cachedSecret = "";

export async function getAssistantApprovalSecret(): Promise<string> {
  const configured = process.env.MFCV_ASSISTANT_APPROVAL_SECRET?.trim();
  if (configured) {
    if (configured.length < 32) {
      throw new Error(
        "MFCV_ASSISTANT_APPROVAL_SECRET must be at least 32 characters.",
      );
    }
    return configured;
  }
  if (cachedSecret) return cachedSecret;
  try {
    cachedSecret = (await fs.readFile(SECRET_PATH, "utf8")).trim();
    if (cachedSecret.length >= 32) return cachedSecret;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  await fs.mkdir(path.dirname(SECRET_PATH), { recursive: true });
  const generated = crypto.randomBytes(48).toString("base64url");
  try {
    await fs.writeFile(SECRET_PATH, `${generated}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    cachedSecret = generated;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    cachedSecret = (await fs.readFile(SECRET_PATH, "utf8")).trim();
  }
  if (cachedSecret.length < 32) {
    throw new Error("Assistant approval secret is invalid.");
  }
  return cachedSecret;
}
