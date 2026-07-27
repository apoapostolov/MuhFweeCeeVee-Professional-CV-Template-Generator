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

/** Soft lean limit (degrees) while dragging. */
const MAX_LEAN_DEG = 12;
/** How strongly horizontal velocity maps to lean. */
const LEAN_SENSITIVITY = 0.65;
/** Smooth lean interpolation (0–1 per sample). */
const LEAN_SMOOTH = 0.28;
/** Movement (px) before a press becomes a drag (below this = click). */
const DRAG_THRESHOLD_PX = 4;

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
};

export type UseKanbanDragOptions = {
  busy?: boolean;
  onDrop: (appId: string, status: string) => void;
  /** Fired on a press+release that never crossed the drag threshold. */
  onClick?: (appId: string) => void;
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
 * Pointer-based kanban drag: move to lift, floating card, velocity lean, column drop.
 * Click (no real movement) opens details via onClick.
 */
export function useKanbanDrag({
  busy = false,
  onDrop,
  onClick,
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
  const onClickRef = useRef(onClick);
  const onDropRef = useRef(onDrop);
  onClickRef.current = onClick;
  onDropRef.current = onDrop;

  const clearPending = useCallback(() => {
    pendingRef.current = null;
  }, []);

  const endDrag = useCallback((commit: boolean) => {
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
      onDropRef.current(current.appId, current.overStatus);
    }
  }, [clearPending]);

  const activateDrag = useCallback(
    (
      appId: string,
      cardEl: HTMLElement,
      clientX: number,
      clientY: number,
      pointerId: number,
    ) => {
      // Prefer the full card root for size (header is only the grip).
      const root =
        (cardEl.closest("[data-kanban-card]") as HTMLElement | null) ?? cardEl;
      const rect = root.getBoundingClientRect();
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

      pendingRef.current = {
        appId,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        cardEl: event.currentTarget,
      };
    },
    [busy],
  );

  useEffect(() => {
    function onMove(event: PointerEvent) {
      const pending = pendingRef.current;
      if (pending && event.pointerId === pending.pointerId && !dragRef.current) {
        const dx = event.clientX - pending.startX;
        const dy = event.clientY - pending.startY;
        if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
          const { appId, cardEl, pointerId } = pending;
          pendingRef.current = null;
          activateDrag(appId, cardEl, event.clientX, event.clientY, pointerId);
        } else {
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
        // Press without drag → open details.
        const appId = pending.appId;
        pendingRef.current = null;
        onClickRef.current?.(appId);
        return;
      }
      if (dragRef.current && event.pointerId === dragRef.current.pointerId) {
        endDrag(true);
      }
    }

    function onCancel(event: PointerEvent) {
      const pending = pendingRef.current;
      if (pending && event.pointerId === pending.pointerId) {
        pendingRef.current = null;
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
      pendingRef.current = null;
    };
  }, [activateDrag, endDrag]);

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
