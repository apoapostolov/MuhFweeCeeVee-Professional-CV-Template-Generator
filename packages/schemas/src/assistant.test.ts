import Ajv from "ajv";
import { describe, expect, it } from "vitest";

import {
  ASSISTANT_APPROVAL_JSON_SCHEMA,
  ASSISTANT_AUDIT_JSON_SCHEMA,
  ASSISTANT_CONTEXT_JSON_SCHEMA,
  ASSISTANT_EVENT_JSON_SCHEMA,
  ASSISTANT_SCHEMA_VERSION,
  ASSISTANT_SESSION_JSON_SCHEMA,
  ASSISTANT_TOOL_CATALOG,
} from "./assistant";

describe("assistant schemas", () => {
  it("accepts a bounded context envelope", () => {
    const validate = new Ajv({ strict: false }).compile(
      ASSISTANT_CONTEXT_JSON_SCHEMA,
    );
    const valid = validate({
      schema: ASSISTANT_SCHEMA_VERSION,
      activePanel: "applications",
      capturedAt: "2026-07-29T12:00:00.000Z",
      records: [
        {
          type: "application",
          id: "application-1",
          label: "Acme · Product Lead",
          revision: "2026-07-29T11:00:00.000Z",
        },
      ],
      hasUnsavedChanges: false,
    });

    expect(valid).toBe(true);
  });

  it("rejects context records without stable identifiers", () => {
    const validate = new Ajv({ strict: false }).compile(
      ASSISTANT_CONTEXT_JSON_SCHEMA,
    );
    expect(
      validate({
        schema: ASSISTANT_SCHEMA_VERSION,
        activePanel: "applications",
        capturedAt: "2026-07-29T12:00:00.000Z",
        records: [{ type: "application" }],
        hasUnsavedChanges: false,
      }),
    ).toBe(false);
  });

  it("keeps tool definitions structured", () => {
    expect(ASSISTANT_TOOL_CATALOG.photo_delete).toEqual({
      title: "Delete photo",
      class: "destructive",
      target: {
        entity: "photo",
        idFields: ["id"],
        labelFields: [],
      },
    });
  });

  it("validates a previewed, revision-bound approval proposal", () => {
    const validate = new Ajv({ strict: false }).compile(
      ASSISTANT_APPROVAL_JSON_SCHEMA,
    );
    expect(
      validate({
        schema: ASSISTANT_SCHEMA_VERSION,
        id: "approval_1",
        callId: "call_1",
        sessionId: "session_1",
        toolName: "save_cv",
        approvalKind: "write",
        arguments: { cvId: "cv_1", cv: { headline: "Product Lead" } },
        targetDescription: "cv: cvId=cv_1",
        context: {
          schema: ASSISTANT_SCHEMA_VERSION,
          activePanel: "editor",
          capturedAt: "2026-07-29T12:00:00.000Z",
          records: [{ type: "cv", id: "cv_1", revision: "rev-1" }],
          hasUnsavedChanges: false,
        },
        preview: {
          summary: "Save CV.",
          affectedRecords: 1,
          changes: [
            { path: "headline", before: "PM", after: "Product Lead" },
          ],
          reversibility: "Version history is available.",
          warnings: [],
        },
        precondition: {
          kind: "content_hash",
          value: "hash",
          capturedAt: "2026-07-29T12:00:00.000Z",
        },
        idempotencyKey: "assistant:approval_1",
        createdAt: "2026-07-29T12:00:00.000Z",
        expiresAt: "2026-07-29T12:05:00.000Z",
      }),
    ).toBe(true);
  });

  it("publishes compilable event, approval, audit, and session schemas", () => {
    const schemas = [
      ASSISTANT_EVENT_JSON_SCHEMA,
      ASSISTANT_APPROVAL_JSON_SCHEMA,
      ASSISTANT_AUDIT_JSON_SCHEMA,
      ASSISTANT_SESSION_JSON_SCHEMA,
    ];

    for (const schema of schemas) {
      expect(() => new Ajv({ strict: false }).compile(schema)).not.toThrow();
    }
  });
});
