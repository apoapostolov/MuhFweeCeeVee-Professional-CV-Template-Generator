"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

/** Hold before the card lifts out of the column. */
export const KANBAN_GRIP_MS = 180;
/** Soft lean limit (degrees) while dragging. */
const MAX_LEAN_DEG = 12;
/** How strongly horizontal velocity maps to lean. */
const LEAN_SENSITIVITY = 0.65;
/** Smooth lean interpolation (0–1 per sample). */
const LEAN_SMOOTH = 0.28;

export type KanbanDragState = {
  appId: string;
  pointerId: number;
  width: number;
  height: number;
  /** Pointer offset from card top-left when grip engaged. */
  grabX: number;
  grabY: number;
  x: number;
  y: number;
  lean: number;
  overStatus: string | null;
};

type PendingGrip = {
  appId: string;
  pointerId: number;
  startX: number;
  startY: number;
  cardEl: HTMLElement;
  timer: ReturnType<typeof setTimeout>;
};

export type UseKanbanDragOptions = {
  busy?: boolean;
  onDrop: (appId: string, status: string) => void;
};

function isInteractiveTarget(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false;
  return Boolean(
    el.closest(
      "button, a, input, select, textarea, label, [data-no-dnd], [contenteditable='true']",
    ),
  );
}

/**
 * Pointer-based kanban drag: grip delay, floating card, velocity lean, column drop.
 */
export function useKanbanDrag({
  busy = false,
  onDrop,
}: UseKanbanDragOptions): {
  drag: KanbanDragState | null;
  onCardPointerDown: (appId: string, event: ReactPointerEvent<HTMLElement>) => void;
  columnClassName: (status: string) => string;
  isDraggingId: (id: string) => boolean;
} {
  const [drag, setDrag] = useState<KanbanDragState | null>(null);
  const dragRef = useRef<KanbanDragState | null>(null);
  const pendingRef = useRef<PendingGrip | null>(null);
  const lastXRef = useRef(0);
  const lastTRef = useRef(0);
  const leanRef = useRef(0);
  const rafRef = useRef(0);

  const clearPending = useCallback(() => {
    const pending = pendingRef.current;
    if (pending) {
      clearTimeout(pending.timer);
      pendingRef.current = null;
    }
  }, []);

  const endDrag = useCallback(
    (commit: boolean) => {
      const current = dragRef.current;
      clearPending();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      dragRef.current = null;
      setDrag(null);
      leanRef.current = 0;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";

      if (commit && current?.overStatus) {
        onDrop(current.appId, current.overStatus);
      }
    },
    [clearPending, onDrop],
  );

  const activateDrag = useCallback(
    (
      appId: string,
      cardEl: HTMLElement,
      clientX: number,
      clientY: number,
      pointerId: number,
    ) => {
      const rect = cardEl.getBoundingClientRect();
      const next: KanbanDragState = {
        appId,
        pointerId,
        width: rect.width,
        height: rect.height,
        grabX: clientX - rect.left,
        grabY: clientY - rect.top,
        x: rect.left,
        y: rect.top,
        lean: 0,
        overStatus: null,
      };
      dragRef.current = next;
      setDrag(next);
      lastXRef.current = clientX;
      lastTRef.current = performance.now();
      leanRef.current = 0;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
    },
    [],
  );

  const onCardPointerDown = useCallback(
    (appId: string, event: ReactPointerEvent<HTMLElement>) => {
      if (busy || event.button !== 0) return;
      if (isInteractiveTarget(event.target)) return;
      if (dragRef.current) return;

      const cardEl = event.currentTarget;
      const pointerId = event.pointerId;
      const startX = event.clientX;
      const startY = event.clientY;

      clearPending();
      const timer = setTimeout(() => {
        const pending = pendingRef.current;
        if (!pending || pending.appId !== appId) return;
        pendingRef.current = null;
        activateDrag(
          appId,
          pending.cardEl,
          pending.startX,
          pending.startY,
          pending.pointerId,
        );
      }, KANBAN_GRIP_MS);

      pendingRef.current = {
        appId,
        pointerId,
        startX,
        startY,
        cardEl,
        timer,
      };
    },
    [activateDrag, busy, clearPending],
  );

  useEffect(() => {
    function onMove(event: PointerEvent) {
      const pending = pendingRef.current;
      if (pending && event.pointerId === pending.pointerId) {
        const dx = event.clientX - pending.startX;
        const dy = event.clientY - pending.startY;
        // Cancel grip if the pointer wanders before lift (scroll / misclick).
        if (Math.hypot(dx, dy) > 14) {
          clearPending();
          return;
        }
      }

      const current = dragRef.current;
      if (!current || event.pointerId !== current.pointerId) return;

      const now = performance.now();
      const dt = Math.max(8, now - lastTRef.current);
      const vx = ((event.clientX - lastXRef.current) / dt) * 16;
      lastXRef.current = event.clientX;
      lastTRef.current = now;

      const targetLean = Math.max(
        -MAX_LEAN_DEG,
        Math.min(MAX_LEAN_DEG, vx * LEAN_SENSITIVITY),
      );
      leanRef.current =
        leanRef.current + (targetLean - leanRef.current) * LEAN_SMOOTH;

      const stack = document.elementsFromPoint(event.clientX, event.clientY);
      let over: string | null = null;
      for (const el of stack) {
        if (!(el instanceof HTMLElement)) continue;
        if (el.dataset.kanbanDragLayer === "1") continue;
        const status = el
          .closest("[data-kanban-status]")
          ?.getAttribute("data-kanban-status");
        if (status) {
          over = status;
          break;
        }
      }

      const next: KanbanDragState = {
        ...current,
        x: event.clientX - current.grabX,
        y: event.clientY - current.grabY,
        lean: leanRef.current,
        overStatus: over,
      };
      dragRef.current = next;

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = 0;
          if (dragRef.current) setDrag({ ...dragRef.current });
        });
      }
    }

    function onUp(event: PointerEvent) {
      const pending = pendingRef.current;
      if (pending && event.pointerId === pending.pointerId) {
        clearPending();
        return;
      }
      if (dragRef.current && event.pointerId === dragRef.current.pointerId) {
        endDrag(true);
      }
    }

    function onCancel(event: PointerEvent) {
      const pending = pendingRef.current;
      if (pending && event.pointerId === pending.pointerId) {
        clearPending();
      }
      if (dragRef.current && event.pointerId === dragRef.current.pointerId) {
        endDrag(false);
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      clearPending();
    };
  }, [clearPending, endDrag]);

  const columnClassName = useCallback(
    (status: string) => {
      const over = drag?.overStatus === status;
      return over
        ? "ring-2 ring-[var(--accent)] ring-offset-1 bg-[var(--accent-soft)]/50 transition-[box-shadow,background-color] duration-150"
        : "transition-[box-shadow,background-color] duration-150";
    },
    [drag?.overStatus],
  );

  return {
    drag,
    onCardPointerDown,
    columnClassName,
    isDraggingId: (id: string) => drag?.appId === id,
  };
}

export type KanbanFloatingCardProps = {
  drag: KanbanDragState;
  children: ReactNode;
};

/** Floating card that follows the pointer and leans with horizontal motion. */
export function KanbanFloatingCard({
  drag,
  children,
}: KanbanFloatingCardProps): JSX.Element {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[80]"
      data-kanban-drag-layer="1"
    >
      <div
        className="absolute overflow-hidden rounded-md border border-[var(--accent)] bg-[var(--surface-1)] text-xs shadow-2xl"
        style={{
          width: drag.width,
          minHeight: drag.height,
          left: drag.x,
          top: drag.y,
          transform: `rotate(${drag.lean.toFixed(2)}deg) scale(1.04)`,
          transformOrigin: `${drag.grabX}px ${drag.grabY}px`,
          boxShadow: "0 20px 48px rgba(15, 23, 42, 0.28)",
          opacity: 0.98,
          willChange: "transform, left, top",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Compact card face for list + floating layer (shared chrome). */
export function KanbanCardFace(props: {
  title: string;
  subtitle: string;
  chips: ReactNode;
}): JSX.Element {
  return (
    <div className="p-2">
      <p className="truncate font-semibold text-slate-900">{props.title}</p>
      <p className="truncate text-[var(--ink-muted)]">{props.subtitle}</p>
      <div className="mt-1.5 flex flex-wrap gap-1">{props.chips}</div>
    </div>
  );
}
