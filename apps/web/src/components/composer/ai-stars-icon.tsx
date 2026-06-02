"use client";

import type { JSX } from "react";

export type AiStarsIconProps = {
  className?: string;
};

export function AiStarsIcon({ className = "h-3.5 w-3.5" }: AiStarsIconProps): JSX.Element {
  return (
    <svg aria-hidden className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.55 4.74L18 8.26l-3.9 2.84L15.45 16 12 13.27 8.55 16l1.35-4.9L6 8.26l4.45-1.52L12 2z" />
      <path d="M5 14l.8 2.45L8 17.1l-2 1.45L6.7 21 5 19.55 3.3 21l.7-2.45-2-1.45 2.2-.65L5 14z" opacity="0.85" />
      <path d="M19 14l.8 2.45 2.2.65-2 1.45.7 2.45L19 19.55 17.3 21l.7-2.45-2-1.45 2.2-.65L19 14z" opacity="0.85" />
    </svg>
  );
}