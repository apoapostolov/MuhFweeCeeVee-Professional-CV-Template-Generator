/* Audit suite, deliberately skipped. Each case documents a probe result and is
   expected to fail while the gap it describes is still open. Run one with:
     npx vitest run apps/web/src/lib/server/render/tweaksRendererSupport.audit.ts

   The native renderer ignores `break-before`, `break-inside`, `break-after`,
   `orphans`, `widows` and `@page`. Probed by rendering a document that differed
   only in the property under test: `break-before: page` produced a
   byte-identical PDF to natural flow, both as a stylesheet rule and as an inline
   attribute.

   Intelligent pagination has been rebuilt on top padding, which the renderer
   does honour, so that toggle is no longer in this file. The adaptive
   page-extension rules still cannot reach the renderer and remain below. */
import { describe, expect, it } from "vitest";

import {
  buildAdaptivePaginationCss,
  buildIntelligentPaginationCss,
  DEFAULT_RENDER_TWEAKS,
} from "./tweaks";

describe.skip("print tweaks reach the native renderer", () => {
  it(
    "does not target markers no template emits",
    () => {
      const css = buildIntelligentPaginationCss("harvard-v1", {
        ...DEFAULT_RENDER_TWEAKS,
        intelligentPagination: true,
      });
      expect(css).not.toContain("[data-mfcv-clean-break]");
      expect(css).not.toContain("[data-mfcv-large-section]");
    },
    30_000,
  );

  it(
    "does not rely on @page in the adaptive pagination CSS",
    () => {
      const css = buildAdaptivePaginationCss("normal", { extendPage: true });
      // The renderer ignores @page; page geometry has to travel through the
      // render options instead.
      expect(css).not.toContain("@page");
    },
    30_000,
  );
});
