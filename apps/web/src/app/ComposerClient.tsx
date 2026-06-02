"use client";

import { ComposerShell } from "@/components/composer/ComposerShell";
import { useComposerController } from "@/components/composer/useComposerController";

export function ComposerClient() {
  const controller = useComposerController();
  return <ComposerShell controller={controller} />;
}