"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  Archive,
  Bot,
  Library,
  Plus,
  Send,
  Square,
  X,
} from "lucide-react";

import type {
  AssistantContextEnvelope,
  AssistantHandoff,
} from "@muhfweeceevee/schemas";

import { assistantContextLabel } from "./assistant-context";
import { buildAssistantTimeline } from "./assistant-panel-model";
import { AssistantConversation } from "./AssistantConversation";
import { AssistantLibrary } from "./AssistantLibrary";
import { useAssistantSession } from "./useAssistantSession";

const SUGGESTIONS: Record<string, string[]> = {
  applications: [
    "Which applications have stalled for more than seven days?",
    "Summarize my current application funnel.",
  ],
  research: [
    "Summarize the selected company and role.",
    "What does this role emphasize most?",
  ],
  editor: [
    "Compare the selected role with my current CV.",
    "Run a truthful ATS gap check for this CV.",
  ],
  cover_letters: ["Review the selected CV and job before I draft a letter."],
  photo_booth: ["List my approved photo and available alternatives."],
  workspace: ["What CV and template are selected for printing?"],
  templates: ["Summarize the available CV templates."],
  settings: ["Check whether the assistant can reach the local workspace tools."],
};

export function AssistantPanel({
  context,
  isOpen,
  onClose,
  onNavigate,
}: {
  context: AssistantContextEnvelope;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (handoff: AssistantHandoff) => void;
}) {
  const assistant = useAssistantSession(isOpen);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const timeline = useMemo(
    () => buildAssistantTimeline(assistant.events),
    [assistant.events],
  );
  const suggestions =
    SUGGESTIONS[context.activePanel] ?? [
      "Summarize the current workspace context.",
      "What should I review next?",
    ];
  const hasPendingApproval = timeline.some(
    (item) => item.kind === "approval" && item.status === "pending",
  );

  useEffect(() => {
    if (isOpen && assistant.state !== "connecting") {
      textareaRef.current?.focus();
    }
  }, [assistant.state, isOpen]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [timeline.length, assistant.isStreaming]);

  function close(): void {
    assistant.stop();
    onClose();
  }

  function submit(value = assistant.draft): void {
    if (!value.trim() || assistant.isStreaming) return;
    void assistant.send(value, context);
  }

  function handleComposerKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
  ): void {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      submit();
    }
  }

  const statusLabel =
    assistant.resolvingApprovalId
      ? "Applying approved operation"
      : hasPendingApproval
        ? "Approval needed"
        : assistant.state === "streaming"
          ? "Responding"
          : assistant.state === "connecting"
            ? "Connecting"
            : assistant.state === "disconnected"
              ? "Disconnected"
              : "Confirmed management";

  return (
    <aside
      aria-labelledby="assistant-panel-heading"
      className={`fixed inset-0 z-50 min-h-0 flex-col border border-[var(--line)] bg-[var(--surface-1)] shadow-xl xl:static xl:z-auto xl:w-[26rem] xl:flex-none xl:rounded-xl ${
        isOpen ? "flex" : "hidden"
      }`}
    >
      <header className="relative border-b border-[var(--line)] py-3 pl-4 pr-36">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-white">
            <Bot aria-hidden className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-black" id="assistant-panel-heading">
              MuhFwee AI
            </h2>
            <p
              aria-live="polite"
              className="text-xs text-[var(--ink-muted)]"
            >
              {statusLabel} · MCP workspace context
            </p>
          </div>
        </div>
        <div
          aria-label="Assistant controls"
          className="absolute right-3 top-3 inline-flex items-center divide-x divide-[var(--line)] rounded-full border border-[var(--line)] bg-[var(--surface-1)]/85 p-1 shadow-sm backdrop-blur-sm"
          role="group"
        >
          <button
            aria-label="Open conversations and playbooks"
            aria-pressed={libraryOpen}
            className="inline-flex h-7 w-8 items-center justify-center rounded-l-full text-[var(--ink-muted)] hover:bg-[var(--surface-2)]"
            onClick={() => setLibraryOpen((value) => !value)}
            title="Conversations and playbooks"
            type="button"
          >
            <Library aria-hidden className="h-4 w-4" />
          </button>
          <button
            aria-label="Archive current conversation"
            className="inline-flex h-7 w-8 items-center justify-center text-[var(--ink-muted)] hover:bg-[var(--surface-2)] disabled:opacity-40"
            disabled={!assistant.sessionId}
            onClick={() => void assistant.archiveConversation()}
            title="Archive conversation"
            type="button"
          >
            <Archive aria-hidden className="h-4 w-4" />
          </button>
          <button
            aria-label="Start new conversation"
            className="inline-flex h-7 w-8 items-center justify-center text-[var(--ink-muted)] hover:bg-[var(--surface-2)]"
            onClick={assistant.newConversation}
            title="New conversation"
            type="button"
          >
            <Plus aria-hidden className="h-4 w-4" />
          </button>
          <button
            aria-label="Close MuhFwee AI"
            className="inline-flex h-7 w-8 items-center justify-center rounded-r-full text-[var(--ink-muted)] hover:bg-[var(--surface-2)]"
            onClick={close}
            title="Close MuhFwee AI"
            type="button"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 truncate rounded border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 text-[10px] text-[var(--ink-muted)]">
          Context: {assistantContextLabel(context)}
        </p>
      </header>

      {libraryOpen ? (
        <AssistantLibrary
          activePanel={context.activePanel}
          draft={assistant.draft}
          onOpenSession={(id) => {
            void assistant.loadSession(id);
            setLibraryOpen(false);
          }}
          onUsePlaybook={(prompt) => {
            assistant.setDraft(prompt);
            setLibraryOpen(false);
            textareaRef.current?.focus();
          }}
        />
      ) : null}

      <AssistantConversation
        endRef={conversationEndRef}
        error={assistant.error}
        onReconnect={() => void assistant.reconnect()}
        onResolveApproval={(proposalId, decision) =>
          void assistant.resolveApproval(proposalId, decision, context)
        }
        onResolveBatch={(proposalIds, decision) =>
          void assistant.resolveApprovalBatch(proposalIds, decision, context)
        }
        onNavigate={onNavigate}
        onRetry={() => void assistant.retry(context)}
        onSuggestion={(suggestion) => {
          assistant.setDraft(suggestion);
          textareaRef.current?.focus();
        }}
        suggestions={suggestions}
        timeline={timeline}
        resolvingApprovalId={assistant.resolvingApprovalId}
      />

      <footer className="border-t border-[var(--line)] p-3">
        <label className="sr-only" htmlFor="assistant-composer">
          Message MuhFwee AI
        </label>
        <textarea
          className="min-h-20 w-full resize-none rounded-md border border-[var(--line)] bg-[var(--surface-1)] px-3 py-2 text-sm"
          disabled={assistant.state === "connecting"}
          id="assistant-composer"
          onChange={(event) => assistant.setDraft(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          placeholder="Ask about this CV workspace…"
          ref={textareaRef}
          value={assistant.draft}
        />
        <div className="mt-2 flex items-center gap-2">
          <p className="min-w-0 flex-1 text-[10px] text-[var(--ink-muted)]">
            Ctrl/⌘ + Enter · {assistant.usage.inputTokens + assistant.usage.outputTokens} tokens
          </p>
          {assistant.isStreaming ? (
            <button
              className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] px-3 py-1.5 text-xs font-semibold"
              onClick={assistant.stop}
              type="button"
            >
              <Square aria-hidden className="h-3 w-3 fill-current" />
              Stop
            </button>
          ) : (
            <button
              className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              disabled={!assistant.draft.trim()}
              onClick={() => submit()}
              type="button"
            >
              <Send aria-hidden className="h-3 w-3" />
              Send
            </button>
          )}
        </div>
      </footer>
    </aside>
  );
}
