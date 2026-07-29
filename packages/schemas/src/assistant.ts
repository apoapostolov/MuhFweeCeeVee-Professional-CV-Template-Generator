import rawAssistantToolCatalog from "./assistantToolCatalog.json";

export const ASSISTANT_SCHEMA_VERSION = "assistant.v1" as const;

export type AssistantToolClass =
  | "read"
  | "derived"
  | "paid"
  | "write"
  | "destructive"
  | "sensitive"
  | "bulk"
  | "retired";

export type AssistantApprovalKind = "cost" | "write" | "destructive";

export type AssistantRecordReference = {
  type: string;
  id: string;
  label?: string;
  revision?: string;
};

export type AssistantContextEnvelope = {
  schema: typeof ASSISTANT_SCHEMA_VERSION;
  activePanel: string;
  capturedAt: string;
  records: AssistantRecordReference[];
  hasUnsavedChanges: boolean;
};

export type AssistantToolTarget = {
  entity: string;
  idFields: string[];
  labelFields: string[];
};

export type AssistantToolDefinition = {
  title: string;
  class: AssistantToolClass;
  target: AssistantToolTarget;
};

export const ASSISTANT_TOOL_CATALOG =
  rawAssistantToolCatalog as Record<string, AssistantToolDefinition>;

export type AssistantPolicyDecision =
  | { action: "allow"; definition: AssistantToolDefinition }
  | {
      action: "require_approval";
      approvalKind: AssistantApprovalKind;
      definition: AssistantToolDefinition;
    }
  | {
      action: "block";
      code: "UNKNOWN_TOOL" | "BLOCKED_TOOL_CLASS";
      reason: string;
      definition?: AssistantToolDefinition;
    };

export type AssistantApprovalResolution = {
  proposalId: string;
  status: "approved" | "rejected" | "stale" | "expired";
  resolvedAt: string;
  token?: string;
};

export type AssistantApprovalChange = {
  path: string;
  before?: unknown;
  after?: unknown;
};

export type AssistantApprovalPreview = {
  summary: string;
  affectedRecords: number;
  changes: AssistantApprovalChange[];
  reversibility: string;
  warnings: string[];
  estimatedCostUsd?: number;
};

export type AssistantApprovalPrecondition = {
  kind: "content_hash";
  value: string;
  capturedAt: string;
};

export type AssistantApprovalProposal = {
  schema: typeof ASSISTANT_SCHEMA_VERSION;
  id: string;
  callId: string;
  sessionId: string;
  toolName: string;
  approvalKind: AssistantApprovalKind;
  arguments: Record<string, unknown>;
  targetDescription: string;
  context: AssistantContextEnvelope;
  preview: AssistantApprovalPreview;
  precondition: AssistantApprovalPrecondition;
  idempotencyKey: string;
  createdAt: string;
  expiresAt: string;
};

export type AssistantPlanStep = {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "blocked" | "skipped";
  targetDescription?: string;
};

export type AssistantPlan = {
  id: string;
  title: string;
  summary: string;
  steps: AssistantPlanStep[];
  createdAt: string;
  updatedAt: string;
};

export type AssistantHandoff = {
  id: string;
  label: string;
  description: string;
  panel: string;
  record?: AssistantRecordReference;
  url?: string;
};

export type AssistantPlaybook = {
  schema: typeof ASSISTANT_SCHEMA_VERSION;
  id: string;
  title: string;
  description: string;
  prompt: string;
  scopePanels: string[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
};

export type AssistantToolEventBase = {
  callId: string;
  toolName: string;
  targetDescription: string;
  timestamp: string;
};

export type AssistantEvent =
  | { type: "session_ready"; sessionId: string; timestamp: string }
  | {
      type: "user_message";
      messageId: string;
      content: string;
      timestamp: string;
    }
  | {
      type: "message_delta";
      messageId: string;
      delta: string;
      timestamp?: string;
    }
  | ({ type: "tool_preparing" | "tool_running"; arguments?: Record<string, unknown> } & AssistantToolEventBase)
  | ({ type: "tool_succeeded"; result: unknown } & AssistantToolEventBase)
  | ({ type: "tool_failed"; code: string; message: string; canRetry: boolean } & AssistantToolEventBase)
  | ({ type: "approval_required"; proposal: AssistantApprovalProposal } & AssistantToolEventBase)
  | ({
      type: "approval_resolved";
      proposalId: string;
      status: "approved" | "rejected" | "stale" | "expired" | "failed";
      message: string;
      result?: unknown;
    } & AssistantToolEventBase)
  | { type: "plan_created" | "plan_updated"; plan: AssistantPlan; timestamp: string }
  | { type: "handoff_available"; handoff: AssistantHandoff; timestamp: string }
  | { type: "usage"; inputTokens: number; outputTokens: number; estimatedCostUsd?: number }
  | {
      type: "turn_error";
      code: string;
      message: string;
      canRetry: boolean;
      timestamp: string;
    }
  | {
      type: "completed";
      status: "succeeded" | "cancelled" | "partial" | "awaiting_approval";
      timestamp: string;
    };

export type AssistantAuditEvent = {
  schema: typeof ASSISTANT_SCHEMA_VERSION;
  id: string;
  sessionId: string;
  timestamp: string;
  actor: "user" | "assistant" | "system";
  action: string;
  toolName?: string;
  targetIds?: string[];
  arguments?: Record<string, unknown>;
  approvalId?: string;
  result:
    | "proposed"
    | "approved"
    | "rejected"
    | "blocked"
    | "stale"
    | "expired"
    | "succeeded"
    | "failed";
  model?: string;
  usage?: { inputTokens: number; outputTokens: number; estimatedCostUsd?: number };
};

export type AssistantSession = {
  schema: typeof ASSISTANT_SCHEMA_VERSION;
  id: string;
  title: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
  context: AssistantContextEnvelope;
  events: AssistantEvent[];
};

export const ASSISTANT_CONTEXT_JSON_SCHEMA = {
  $id: "assistant.context.v1",
  type: "object",
  required: ["schema", "activePanel", "capturedAt", "records", "hasUnsavedChanges"],
  properties: {
    schema: { const: ASSISTANT_SCHEMA_VERSION },
    activePanel: { type: "string", minLength: 1 },
    capturedAt: { type: "string", minLength: 1 },
    hasUnsavedChanges: { type: "boolean" },
    records: {
      type: "array",
      items: {
        type: "object",
        required: ["type", "id"],
        properties: {
          type: { type: "string", minLength: 1 },
          id: { type: "string", minLength: 1 },
          label: { type: "string" },
          revision: { type: "string" }
        },
        additionalProperties: false
      }
    }
  },
  additionalProperties: false
} as const;

function inlineSchema<T extends { $id: string }>(
  schema: T,
): Omit<T, "$id"> {
  const { $id: _id, ...inline } = schema;
  return inline;
}

export const ASSISTANT_APPROVAL_JSON_SCHEMA = {
  $id: "assistant.approval.v1",
  type: "object",
  required: [
    "schema",
    "id",
    "callId",
    "sessionId",
    "toolName",
    "approvalKind",
    "arguments",
    "targetDescription",
    "context",
    "preview",
    "precondition",
    "idempotencyKey",
    "createdAt",
    "expiresAt"
  ],
  properties: {
    schema: { const: ASSISTANT_SCHEMA_VERSION },
    id: { type: "string", minLength: 1 },
    callId: { type: "string", minLength: 1 },
    sessionId: { type: "string", minLength: 1 },
    toolName: { type: "string", minLength: 1 },
    approvalKind: { enum: ["cost", "write", "destructive"] },
    arguments: { type: "object" },
    targetDescription: { type: "string", minLength: 1 },
    context: inlineSchema(ASSISTANT_CONTEXT_JSON_SCHEMA),
    preview: {
      type: "object",
      required: [
        "summary",
        "affectedRecords",
        "changes",
        "reversibility",
        "warnings"
      ],
      properties: {
        summary: { type: "string", minLength: 1 },
        affectedRecords: { type: "integer", minimum: 0 },
        changes: {
          type: "array",
          items: {
            type: "object",
            required: ["path"],
            properties: {
              path: { type: "string", minLength: 1 },
              before: {},
              after: {}
            },
            additionalProperties: false
          }
        },
        reversibility: { type: "string", minLength: 1 },
        warnings: { type: "array", items: { type: "string" } },
        estimatedCostUsd: { type: "number", minimum: 0 }
      },
      additionalProperties: false
    },
    precondition: {
      type: "object",
      required: ["kind", "value", "capturedAt"],
      properties: {
        kind: { const: "content_hash" },
        value: { type: "string", minLength: 1 },
        capturedAt: { type: "string", minLength: 1 }
      },
      additionalProperties: false
    },
    idempotencyKey: { type: "string", minLength: 1 },
    createdAt: { type: "string", minLength: 1 },
    expiresAt: { type: "string", minLength: 1 }
  },
  additionalProperties: false
} as const;

const ASSISTANT_TOOL_EVENT_BASE_PROPERTIES = {
  callId: { type: "string", minLength: 1 },
  toolName: { type: "string", minLength: 1 },
  targetDescription: { type: "string", minLength: 1 },
  timestamp: { type: "string", minLength: 1 }
} as const;

export const ASSISTANT_EVENT_JSON_SCHEMA = {
  $id: "assistant.event.v1",
  oneOf: [
    {
      type: "object",
      required: ["type", "sessionId", "timestamp"],
      properties: {
        type: { const: "session_ready" },
        sessionId: { type: "string", minLength: 1 },
        timestamp: { type: "string", minLength: 1 }
      },
      additionalProperties: false
    },
    {
      type: "object",
      required: ["type", "plan", "timestamp"],
      properties: {
        type: { enum: ["plan_created", "plan_updated"] },
        timestamp: { type: "string", minLength: 1 },
        plan: {
          type: "object",
          required: ["id", "title", "summary", "steps", "createdAt", "updatedAt"],
          properties: {
            id: { type: "string", minLength: 1 },
            title: { type: "string", minLength: 1 },
            summary: { type: "string" },
            createdAt: { type: "string", minLength: 1 },
            updatedAt: { type: "string", minLength: 1 },
            steps: {
              type: "array",
              minItems: 2,
              maxItems: 12,
              items: {
                type: "object",
                required: ["id", "title", "status"],
                properties: {
                  id: { type: "string", minLength: 1 },
                  title: { type: "string", minLength: 1 },
                  status: {
                    enum: ["pending", "running", "completed", "blocked", "skipped"]
                  },
                  targetDescription: { type: "string" }
                },
                additionalProperties: false
              }
            }
          },
          additionalProperties: false
        }
      },
      additionalProperties: false
    },
    {
      type: "object",
      required: ["type", "handoff", "timestamp"],
      properties: {
        type: { const: "handoff_available" },
        timestamp: { type: "string", minLength: 1 },
        handoff: {
          type: "object",
          required: ["id", "label", "description", "panel"],
          properties: {
            id: { type: "string", minLength: 1 },
            label: { type: "string", minLength: 1 },
            description: { type: "string", minLength: 1 },
            panel: { type: "string", minLength: 1 },
            record: {
              type: "object",
              required: ["type", "id"],
              properties: {
                type: { type: "string", minLength: 1 },
                id: { type: "string", minLength: 1 },
                label: { type: "string" },
                revision: { type: "string" }
              },
              additionalProperties: false
            },
            url: { type: "string", pattern: "^/" }
          },
          additionalProperties: false
        }
      },
      additionalProperties: false
    },
    {
      type: "object",
      required: [
        "type",
        "callId",
        "toolName",
        "targetDescription",
        "timestamp",
        "proposalId",
        "status",
        "message"
      ],
      properties: {
        type: { const: "approval_resolved" },
        ...ASSISTANT_TOOL_EVENT_BASE_PROPERTIES,
        proposalId: { type: "string", minLength: 1 },
        status: {
          enum: ["approved", "rejected", "stale", "expired", "failed"]
        },
        message: { type: "string", minLength: 1 },
        result: {}
      },
      additionalProperties: false
    },
    {
      type: "object",
      required: ["type", "messageId", "content", "timestamp"],
      properties: {
        type: { const: "user_message" },
        messageId: { type: "string", minLength: 1 },
        content: { type: "string", minLength: 1 },
        timestamp: { type: "string", minLength: 1 }
      },
      additionalProperties: false
    },
    {
      type: "object",
      required: ["type", "messageId", "delta"],
      properties: {
        type: { const: "message_delta" },
        messageId: { type: "string", minLength: 1 },
        delta: { type: "string" },
        timestamp: { type: "string" }
      },
      additionalProperties: false
    },
    ...(["tool_preparing", "tool_running"] as const).map((type) => ({
      type: "object",
      required: [
        "type",
        "callId",
        "toolName",
        "targetDescription",
        "timestamp"
      ],
      properties: {
        type: { const: type },
        ...ASSISTANT_TOOL_EVENT_BASE_PROPERTIES,
        arguments: { type: "object" }
      },
      additionalProperties: false
    })),
    {
      type: "object",
      required: [
        "type",
        "callId",
        "toolName",
        "targetDescription",
        "timestamp",
        "result"
      ],
      properties: {
        type: { const: "tool_succeeded" },
        ...ASSISTANT_TOOL_EVENT_BASE_PROPERTIES,
        result: {}
      },
      additionalProperties: false
    },
    {
      type: "object",
      required: [
        "type",
        "callId",
        "toolName",
        "targetDescription",
        "timestamp",
        "code",
        "message",
        "canRetry"
      ],
      properties: {
        type: { const: "tool_failed" },
        ...ASSISTANT_TOOL_EVENT_BASE_PROPERTIES,
        code: { type: "string", minLength: 1 },
        message: { type: "string", minLength: 1 },
        canRetry: { type: "boolean" }
      },
      additionalProperties: false
    },
    {
      type: "object",
      required: [
        "type",
        "callId",
        "toolName",
        "targetDescription",
        "timestamp",
        "proposal"
      ],
      properties: {
        type: { const: "approval_required" },
        ...ASSISTANT_TOOL_EVENT_BASE_PROPERTIES,
        proposal: inlineSchema(ASSISTANT_APPROVAL_JSON_SCHEMA)
      },
      additionalProperties: false
    },
    {
      type: "object",
      required: ["type", "inputTokens", "outputTokens"],
      properties: {
        type: { const: "usage" },
        inputTokens: { type: "integer", minimum: 0 },
        outputTokens: { type: "integer", minimum: 0 },
        estimatedCostUsd: { type: "number", minimum: 0 }
      },
      additionalProperties: false
    },
    {
      type: "object",
      required: ["type", "code", "message", "canRetry", "timestamp"],
      properties: {
        type: { const: "turn_error" },
        code: { type: "string", minLength: 1 },
        message: { type: "string", minLength: 1 },
        canRetry: { type: "boolean" },
        timestamp: { type: "string", minLength: 1 }
      },
      additionalProperties: false
    },
    {
      type: "object",
      required: ["type", "status", "timestamp"],
      properties: {
        type: { const: "completed" },
        status: {
          enum: ["succeeded", "cancelled", "partial", "awaiting_approval"]
        },
        timestamp: { type: "string", minLength: 1 }
      },
      additionalProperties: false
    }
  ]
} as const;

export const ASSISTANT_AUDIT_JSON_SCHEMA = {
  $id: "assistant.audit.v1",
  type: "object",
  required: [
    "schema",
    "id",
    "sessionId",
    "timestamp",
    "actor",
    "action",
    "result"
  ],
  properties: {
    schema: { const: ASSISTANT_SCHEMA_VERSION },
    id: { type: "string", minLength: 1 },
    sessionId: { type: "string", minLength: 1 },
    timestamp: { type: "string", minLength: 1 },
    actor: { enum: ["user", "assistant", "system"] },
    action: { type: "string", minLength: 1 },
    toolName: { type: "string" },
    targetIds: { type: "array", items: { type: "string" } },
    arguments: { type: "object" },
    approvalId: { type: "string" },
    result: {
      enum: [
        "proposed",
        "approved",
        "rejected",
        "blocked",
        "stale",
        "expired",
        "succeeded",
        "failed"
      ]
    },
    model: { type: "string" },
    usage: {
      type: "object",
      required: ["inputTokens", "outputTokens"],
      properties: {
        inputTokens: { type: "integer", minimum: 0 },
        outputTokens: { type: "integer", minimum: 0 },
        estimatedCostUsd: { type: "number", minimum: 0 }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
} as const;

export const ASSISTANT_SESSION_JSON_SCHEMA = {
  $id: "assistant.session.v1",
  type: "object",
  required: [
    "schema",
    "id",
    "title",
    "status",
    "createdAt",
    "updatedAt",
    "context",
    "events"
  ],
  properties: {
    schema: { const: ASSISTANT_SCHEMA_VERSION },
    id: { type: "string", minLength: 1 },
    title: { type: "string", minLength: 1 },
    status: { enum: ["active", "archived"] },
    createdAt: { type: "string", minLength: 1 },
    updatedAt: { type: "string", minLength: 1 },
    context: inlineSchema(ASSISTANT_CONTEXT_JSON_SCHEMA),
    events: {
      type: "array",
      items: inlineSchema(ASSISTANT_EVENT_JSON_SCHEMA)
    }
  },
  additionalProperties: false
} as const;

export function getAssistantToolDefinition(
  toolName: string,
): AssistantToolDefinition | undefined {
  return ASSISTANT_TOOL_CATALOG[toolName];
}
