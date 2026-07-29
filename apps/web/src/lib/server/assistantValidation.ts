import {
  ASSISTANT_SCHEMA_VERSION,
  type AssistantContextEnvelope,
} from "@muhfweeceevee/schemas";

const MAX_CONTEXT_RECORDS = 24;
export const MAX_ASSISTANT_MESSAGE_CHARS = 8_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseAssistantContext(
  value: unknown,
): AssistantContextEnvelope {
  if (!isRecord(value)) {
    throw new Error("Assistant context is required.");
  }
  const activePanel =
    typeof value.activePanel === "string" ? value.activePanel.trim() : "";
  const capturedAt =
    typeof value.capturedAt === "string" ? value.capturedAt.trim() : "";
  if (
    value.schema !== ASSISTANT_SCHEMA_VERSION ||
    !activePanel ||
    !capturedAt ||
    typeof value.hasUnsavedChanges !== "boolean" ||
    !Array.isArray(value.records) ||
    value.records.length > MAX_CONTEXT_RECORDS
  ) {
    throw new Error("Assistant context is invalid.");
  }

  const records = value.records.map((record) => {
    if (!isRecord(record)) {
      throw new Error("Assistant context contains an invalid record.");
    }
    const type = typeof record.type === "string" ? record.type.trim() : "";
    const id = typeof record.id === "string" ? record.id.trim() : "";
    if (!type || !id) {
      throw new Error("Assistant context records require type and id.");
    }
    return {
      type,
      id,
      label:
        typeof record.label === "string" && record.label.trim()
          ? record.label.trim()
          : undefined,
      revision:
        typeof record.revision === "string" && record.revision.trim()
          ? record.revision.trim()
          : undefined,
    };
  });

  return {
    schema: ASSISTANT_SCHEMA_VERSION,
    activePanel,
    capturedAt,
    records,
    hasUnsavedChanges: value.hasUnsavedChanges,
  };
}

export function parseAssistantMessage(value: unknown): string {
  const message = typeof value === "string" ? value.trim() : "";
  if (!message) {
    throw new Error("Message is required.");
  }
  if (message.length > MAX_ASSISTANT_MESSAGE_CHARS) {
    throw new Error(
      `Message must be ${MAX_ASSISTANT_MESSAGE_CHARS.toLocaleString()} characters or fewer.`,
    );
  }
  return message;
}
