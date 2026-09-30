/* Audit only, deliberately skipped. Every case documents a probe result and is
   expected to fail while the tweak stays inert. Run it with:
   npx vitest run apps/web/src/lib/server/render/tweaksRendererSupport.audit.ts */

import {
  buildAdaptivePaginationCss,
  buildIntelligentPaginationCss,
  DEFAULT_RENDER_TWEAKS,
} from "./tweaks";

/**
 * The print tweaks were written for Chromium's print pipeline. After the move to
 * the native renderer, several of them produce CSS that the engine never reads,
 * so the toggle appears to work and changes nothing. Each case below was probed
 * by rendering a document that differed only in the property under test and
 * comparing the resulting PDFs.
 *
 * Probed results:
 * - `break-before: page` produced a byte-identical PDF to natural flow, both as
 *   a stylesheet rule and as an inline attribute. `break-inside: avoid`,
 *   `orphans` and `widows` behaved the same way.
 * - `@page` margins are not parsed, so the adaptive page-extension rules cannot
 *   reach the renderer at all.
 * - `[data-mfcv-*]` markers are never emitted by any template, so the rules that
 *   target them cannot match.
 */
xdescribe("print tweaks reach the native renderer", () => {
  it(
    "builds pagination CSS the renderer honours",
    () => {
      const css = buildIntelligentPaginationCss("harvard-v1", {
        ...DEFAULT_RENDER_TWEAKS,
        intelligentPagination: true,
      });
      // A rule the engine ignores is worse than none: it reads as a working
      // control in the UI. Fail while the properties are unsupported so the
      // pagination is rebuilt on something the renderer acts on.
      const unsupported = [
        "break-inside",
        "page-break-inside",
        "break-after",
        "page-break-after",
        "break-before",
        "page-break-before",
        "orphans",
        "widows",
      ].filter((prop) => css.includes(`${prop}:`));
      expect(
        unsupported,
        `the native renderer ignores these, so intelligent pagination is inert:\n${unsupported.join("\n")}`,
      ).toEqual([]);
    },
    30_000,
  );

  it(
    "does not target markers no template emits",
    () => {
      const css = buildIntelligentPaginationCss("harvard-v1", {
        ...DEFAULT_RENDER_TWEAKS,
        intelligentPagination: true,
      });
      // These attributes are referenced by the CSS but nothing sets them.
      expect(css).not.toContain("[data-mfcv-clean-break]");
      expect(css).not.toContain("[data-mfcv-large-section]");
    },
    30_000,
  );

  it(
    "does not rely on @page in the adaptive pagination CSS",
    () => {
      const css = buildAdaptivePaginationCss("normal", { extendPage: true });
      // The renderer ignores @page; page geometry comes from render options.
      expect(css).not.toContain("@page");
    },
    30_000,
  );
});
