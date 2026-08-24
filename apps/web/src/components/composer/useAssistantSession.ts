"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  AssistantContextEnvelope,
  AssistantEvent,
  AssistantSession,
} from "@muhfweeceevee/schemas";

const SESSION_STORAGE_KEY = "mfcv_assistant_session_id";
const DRAFT_STORAGE_PREFIX = "mfcv_assistant_draft:";

type AssistantConnectionState =
  | "idle"
  | "connecting"
  | "ready"
  | "streaming"
  | "disconnected";

function draftKey(sessionId: string | null): string {
  return `${DRAFT_STORAGE_PREFIX}${sessionId || "new"}`;
}

function readStorage(key: string): string {
  return typeof window === "undefined" ? "" : window.localStorage.getItem(key) ?? "";
}

function writeStorage(key: string, value: string): void {
  if (typeof window === "undefined") return;
  if (value) window.localStorage.setItem(key, value);
  else window.localStorage.removeItem(key);
}

async function responseError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  return payload.error || `Request failed with HTTP ${response.status}.`;
}

function isAssistantEvent(value: unknown): value is AssistantEvent {
  return value !== null && typeof value === "object" && "type" in value;
}

export function useAssistantSession(isOpen: boolean) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [events, setEvents] = useState<AssistantEvent[]>([]);
  const [draft, setDraftState] = useState("");
  const [state, setState] = useState<AssistantConnectionState>("idle");
  const [error, setError] = useState("");
  const [usage, setUsage] = useState({ inputTokens: 0, outputTokens: 0 });
  const [mcpReady, setMcpReady] = useState(false);
  const [resolvingApprovalId, setResolvingApprovalId] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const initializedRef = useRef(false);
  const lastPromptRef = useRef("");

  const setDraft = useCallback(
    (value: string) => {
      setDraftState(value);
      writeStorage(draftKey(sessionId), value);
    },
    [sessionId],
  );

  const loadSession = useCallback(async (id: string) => {
    const response = await fetch(
      `/api/assistant/sessions/${encodeURIComponent(id)}`,
    );
    if (!response.ok) throw new Error(await responseError(response));
    const payload = (await response.json()) as { session: AssistantSession };
    setSessionId(payload.session.id);
    setEvents(payload.session.events);
    setDraftState(readStorage(draftKey(payload.session.id)));
    writeStorage(SESSION_STORAGE_KEY, payload.session.id);
  }, []);

  useEffect(() => {
    if (!isOpen || initializedRef.current) return;
    initializedRef.current = true;
    setState("connecting");
    void (async () => {
      try {
        const response = await fetch("/api/assistant/sessions");
        if (!response.ok) throw new Error(await responseError(response));
        const payload = (await response.json()) as {
          sessions?: Array<Pick<AssistantSession, "id" | "status">>;
        };
        const active = (payload.sessions ?? []).filter(
          (session) => session.status === "active",
        );
        const storedId = readStorage(SESSION_STORAGE_KEY);
        const selected =
          active.find((session) => session.id === storedId) ?? active[0];
        if (selected) {
          await loadSession(selected.id);
        } else {
          setDraftState(readStorage(draftKey(null)));
        }
        const mcpResponse = await fetch("/api/assistant/reconnect", { method: "POST" });
        setMcpReady(mcpResponse.ok);
        setState("ready");
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not load assistant sessions.",
        );
        setState("disconnected");
      }
    })();
  }, [isOpen, loadSession]);

  const newConversation = useCallback(() => {
    abortRef.current?.abort();
    setSessionId(null);
    setEvents([]);
    setUsage({ inputTokens: 0, outputTokens: 0 });
    setError("");
    setState("ready");
    setDraftState(readStorage(draftKey(null)));
    writeStorage(SESSION_STORAGE_KEY, "");
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reconnect = useCallback(async () => {
    setState("connecting");
    setError("");
    const response = await fetch("/api/assistant/reconnect", { method: "POST" });
    if (!response.ok) {
      setError(await responseError(response));
      setState("disconnected");
      return false;
    }
    setState("ready");
    return true;
  }, []);

  const send = useCallback(
    async (message: string, context: AssistantContextEnvelope) => {
      const prompt = message.trim();
      if (!prompt || state === "streaming") return;
      lastPromptRef.current = prompt;
      const controller = new AbortController();
      let activeSessionId = sessionId;
      setEvents((current) => [
        ...current,
        {
          type: "user_message",
          messageId: `local_${Date.now()}`,
          content: prompt,
          timestamp: new Date().toISOString(),
        },
      ]);
      abortRef.current = controller;
      setError("");
      setState("streaming");

      try {
        const response = await fetch("/api/assistant/turn", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            sessionId: sessionId || undefined,
            message: prompt,
            context,
          }),
        });
        if (!response.ok || !response.body) {
          throw new Error(await responseError(response));
        }
        setDraftState("");
        writeStorage(draftKey(sessionId), "");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let terminalStatus:
          | "succeeded"
          | "cancelled"
          | "partial"
          | "awaiting_approval"
          | null = null;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const parsed = JSON.parse(line) as unknown;
            if (!isAssistantEvent(parsed)) continue;
            if (parsed.type === "session_ready") {
              activeSessionId = parsed.sessionId;
              setSessionId(parsed.sessionId);
              writeStorage(SESSION_STORAGE_KEY, parsed.sessionId);
              const pendingDraft = readStorage(draftKey(sessionId));
              writeStorage(draftKey(sessionId), "");
              if (pendingDraft) writeStorage(draftKey(parsed.sessionId), "");
              continue;
            }
            if (parsed.type === "usage") {
              setUsage({
                inputTokens: parsed.inputTokens,
                outputTokens: parsed.outputTokens,
              });
            }
            if (parsed.type === "completed") terminalStatus = parsed.status;
            if (parsed.type !== "user_message") {
              setEvents((current) => [...current, parsed]);
            }
          }
        }
        if (terminalStatus === "partial") {
          setDraftState(prompt);
          writeStorage(draftKey(activeSessionId), prompt);
        }
        setState("ready");
      } catch (caught) {
        if (controller.signal.aborted) {
          setState("ready");
        } else {
          const message =
            caught instanceof Error ? caught.message : "Assistant turn failed.";
          setError(message);
          setDraftState(prompt);
          writeStorage(draftKey(activeSessionId), prompt);
          setState("disconnected");
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [sessionId, state],
  );

  const retry = useCallback(
    (context: AssistantContextEnvelope) =>
      send(draft || lastPromptRef.current, context),
    [draft, send],
  );

  const resolveApproval = useCallback(
    async (
      proposalId: string,
      decision: "approve" | "reject",
      context: AssistantContextEnvelope,
    ) => {
      if (resolvingApprovalId) return;
      setResolvingApprovalId(proposalId);
      setError("");
      try {
        const response = await fetch(
          `/api/assistant/approvals/${encodeURIComponent(proposalId)}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ decision, context }),
          },
        );
        if (!response.ok) throw new Error(await responseError(response));
        const payload = (await response.json()) as {
          events?: unknown[];
          replayed?: boolean;
        };
        const approvalEvents = (payload.events ?? []).filter(isAssistantEvent);
        if (payload.replayed && sessionId) {
          await loadSession(sessionId);
        } else {
          setEvents((current) => [...current, ...approvalEvents]);
        }
        if (
          approvalEvents.some(
            (event) =>
              event.type === "approval_resolved" &&
              event.status === "approved",
          )
        ) {
          window.dispatchEvent(
            new CustomEvent("mfcv:assistant-mutation", {
              detail: { proposalId },
            }),
          );
        }
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not resolve assistant approval.",
        );
      } finally {
        setResolvingApprovalId("");
      }
    },
    [loadSession, resolvingApprovalId, sessionId],
  );

  const resolveApprovalBatch = useCallback(
    async (
      proposalIds: string[],
      decision: "approve" | "reject",
      context: AssistantContextEnvelope,
    ) => {
      if (resolvingApprovalId || proposalIds.length < 2) return;
      setResolvingApprovalId("batch");
      setError("");
      try {
        const response = await fetch("/api/assistant/approval-batches", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ proposalIds, decision, context }),
        });
        if (!response.ok) throw new Error(await responseError(response));
        if (sessionId) await loadSession(sessionId);
        if (decision === "approve") {
          window.dispatchEvent(
            new CustomEvent("mfcv:assistant-mutation", {
              detail: { proposalIds },
            }),
          );
        }
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not resolve assistant approval batch.",
        );
      } finally {
        setResolvingApprovalId("");
      }
    },
    [loadSession, resolvingApprovalId, sessionId],
  );

  const archiveConversation = useCallback(async () => {
    if (!sessionId) return;
    const response = await fetch(
      `/api/assistant/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      },
    );
    if (!response.ok) throw new Error(await responseError(response));
    newConversation();
  }, [newConversation, sessionId]);

  return {
    sessionId,
    events,
    draft,
    setDraft,
    state,
    error,
    usage,
    mcpReady,
    resolvingApprovalId,
    isStreaming: state === "streaming",
    send,
    stop,
    reconnect,
    retry,
    resolveApproval,
    resolveApprovalBatch,
    loadSession,
    archiveConversation,
    newConversation,
  };
}
