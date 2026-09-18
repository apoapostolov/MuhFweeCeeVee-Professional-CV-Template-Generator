import fs from "node:fs/promises";
import path from "node:path";

import { redactAssistantValue } from "./assistantSecurity";
import { repoPath } from "./repoPaths";

type DebugPayload = Record<string, unknown>;

function debugLogPath(): string | null {
  if (process.env.MFCV_ASSISTANT_DEBUG === "0") return null;
  const configured = process.env.MFCV_ASSISTANT_DEBUG_LOG?.trim();
  return configured || repoPath("work", "assistant-debug.jsonl");
}

let writeChain = Promise.resolve();

export function writeAssistantDebug(
  traceId: string,
  phase: string,
  payload: DebugPayload = {},
): Promise<void> {
  const target = debugLogPath();
  if (!target) return Promise.resolve();
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    traceId,
    phase,
    ...redactAssistantValue(payload) as DebugPayload,
  });
  writeChain = writeChain.then(async () => {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.appendFile(target, `${entry}\n`, "utf-8");
  }).catch(() => undefined);
  return writeChain;
}

export function assistantDebugLogPath(): string | null {
  return debugLogPath();
}
