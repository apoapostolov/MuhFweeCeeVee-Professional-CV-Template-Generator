import { NextResponse } from "next/server";

import type { AssistantEvent } from "@muhfweeceevee/schemas";

import { assertApiAuthorized } from "@/lib/server/apiAuth";
import { runAssistantTurn } from "@/lib/server/assistantRuntime";
import { assistantSessionStore } from "@/lib/server/assistantStore";
import {
  parseAssistantContext,
  parseAssistantMessage,
} from "@/lib/server/assistantValidation";

export const runtime = "nodejs";
export const maxDuration = 65;

const encoder = new TextEncoder();

function eventLine(event: AssistantEvent): Uint8Array {
  return encoder.encode(`${JSON.stringify(event)}\n`);
}

export async function POST(request: Request): Promise<Response> {
  const denied = assertApiAuthorized(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  try {
    const message = parseAssistantMessage(body.message);
    const context = parseAssistantContext(body.context);
    const requestedSessionId =
      typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    let session = requestedSessionId
      ? await assistantSessionStore.get(requestedSessionId)
      : null;
    if (requestedSessionId && !session) {
      return NextResponse.json(
        { error: "Assistant session not found." },
        { status: 404 },
      );
    }
    if (session?.status === "archived") {
      return NextResponse.json(
        { error: "Archived conversations are read-only. Reopen it first." },
        { status: 409 },
      );
    }
    session = session
      ? await assistantSessionStore.updateContext(session.id, context)
      : await assistantSessionStore.create(context);
    const sessionId = session.id;
    const abortController = new AbortController();
    const abort = () => abortController.abort();
    request.signal.addEventListener("abort", abort, { once: true });
    let streamClosed = false;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (event: AssistantEvent): void => {
          if (streamClosed) return;
          try {
            controller.enqueue(eventLine(event));
          } catch {
            streamClosed = true;
            abortController.abort();
          }
        };
        send({
          type: "session_ready",
          sessionId,
          timestamp: new Date().toISOString(),
        });
        void runAssistantTurn({
          session,
          message,
          context,
          signal: abortController.signal,
          onEvent: send,
        })
          .then(async (result) => {
            await assistantSessionStore.appendEvents(sessionId, result.events);
          })
          .catch(async (error) => {
            const events: AssistantEvent[] = [
              {
                type: "turn_error",
                code: "ASSISTANT_STREAM_FAILED",
                message:
                  error instanceof Error
                    ? error.message
                    : "Assistant stream failed.",
                canRetry: true,
                timestamp: new Date().toISOString(),
              },
              {
                type: "completed",
                status: "partial",
                timestamp: new Date().toISOString(),
              },
            ];
            events.forEach(send);
            await assistantSessionStore.appendEvents(sessionId, events);
          })
          .finally(() => {
            request.signal.removeEventListener("abort", abort);
            if (!streamClosed) {
              streamClosed = true;
              controller.close();
            }
          });
      },
      cancel() {
        streamClosed = true;
        abortController.abort();
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "application/x-ndjson; charset=utf-8",
        "cache-control": "no-store, no-transform",
        connection: "keep-alive",
        "x-assistant-session-id": sessionId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Assistant turn is invalid.",
      },
      { status: 400 },
    );
  }
}
