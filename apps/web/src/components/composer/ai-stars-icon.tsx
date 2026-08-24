"use client";

import type { JSX } from "react";

export type AiStarsIconProps = {
  className?: string;
  /** White fill with a light edge — readable on transparent / white toolbar buttons. */
  variant?: "default" | "on-light";
};

export function AiStarsIcon({
  className = "h-3.5 w-3.5",
  variant = "default",
}: AiStarsIconProps): JSX.Element {
  const starPath =
    "M12 2l1.55 4.74L18 8.26l-3.9 2.84L15.45 16 12 13.27 8.55 16l1.35-4.9L6 8.26l4.45-1.52L12 2z";
  const smallStarA = "M5 14l.8 2.45L8 17.1l-2 1.45L6.7 21 5 19.55 3.3 21l.7-2.45-2-1.45 2.2-.65L5 14z";
  const smallStarB = "M19 14l.8 2.45 2.2.65-2 1.45.7 2.45L19 19.55 17.3 21l.7-2.45-2-1.45 2.2-.65L19 14z";

  if (variant === "on-light") {
    return (
      <svg
        aria-hidden
        className={`${className} drop-shadow-[0_0_1.5px_rgba(15,23,42,0.55)]`}
        viewBox="0 0 24 24"
      >
        <path d={starPath} fill="var(--accent)" />
        <path d={smallStarA} fill="var(--accent)" opacity="0.9" />
        <path d={smallStarB} fill="var(--accent)" opacity="0.9" />
      </svg>
    );
  }

  return (
    <svg aria-hidden className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d={starPath} />
      <path d={smallStarA} opacity="0.85" />
      <path d={smallStarB} opacity="0.85" />
    </svg>
  );
}