/**
 * Text-scale tweaks for the native renderer.
 *
 * `zoom` is not implemented by takumi-pdf and `transform: scale` shrinks the
 * whole container, but the tweak is meant to change the type size while the
 * sidebar and content columns keep their geometry. The templates declare
 * absolute `font-size` values in px and mm on their own rules, so those
 * declarations are rewritten in place at the requested scale, scoped to the
 * selector subtree the tweak targets.
 */

const FONT_SIZE_PATTERN = /font-size\s*:\s*(-?[\d.]+)(px|mm|pt|em|rem|%)/gi;

/** Convert a length to px so px and mm sources can share one scale factor. */
function toPx(value: number, unit: string): number | null {
  switch (unit.toLowerCase()) {
    case "px":
      return value;
    case "mm":
      return (value * 96) / 25.4;
    case "pt":
      return (value * 96) / 72;
    case "em":
    case "rem":
      return value * 16;
    case "%":
      return null;
    default:
      return null;
  }
}

function fromPx(px: number, unit: string): string {
  switch (unit.toLowerCase()) {
    case "px":
      return `${Math.round(px * 100) / 100}px`;
    case "mm":
      return `${Math.round(((px * 25.4) / 96) * 1000) / 1000}mm`;
    case "pt":
      return `${Math.round((px * 72) / 96 * 100) / 100}pt`;
    case "em":
    case "rem":
      return `${Math.round((px / 16) * 1000) / 1000}${unit}`;
    default:
      return `${px}px`;
  }
}

/** Selectors whose subtree the tweak scales, keyed by template shape. */
function scaledSelectors(templateId: string, sidebarScale: number, contentScale: number): string[] {
  const out: string[] = [];
  if (sidebarScale !== 1) {
    out.push("aside.sidebar", ".sidebar", "aside.left", ".left");
  }
  if (contentScale !== 1) {
    if (templateId === "europass-v1") {
      out.push("body > .page");
    } else {
      out.push("main.content", ".content", "main.right", ".right");
    }
  }
  return out;
}

/**
 * Rewrite font-size declarations inside the targeted selector blocks.
 *
 * Only rules whose selector mentions one of the targets are touched, and the
 * body-based `body { font-size }` rule is scaled too, because the column
 * selectors inherit from it. Everything else, including page geometry, padding
 * and icon sizes, is left exactly as the template wrote it.
 */
export function applyTextScale(
  html: string,
  templateId: string,
  sidebarScale: number,
  contentScale: number,
): string {
  const targets = scaledSelectors(templateId, sidebarScale, contentScale);
  if (targets.length === 0) {
    return html;
  }
  const scaleFor = (selectorLine: string): number => {
    const s = selectorLine.trim();
    // `body` sets the inherited base size for both columns. The selector text
    // here excludes the opening brace, so the match is anchored on the name.
    if (/^body\b/.test(s)) {
      return contentScale !== 1 ? contentScale : sidebarScale;
    }
    // The sidebar subtree.
    if (/(^|[\s,>])(aside\.sidebar|\.sidebar|aside\.left|\.left)([\s,:.{]|$)/.test(s)) {
      return sidebarScale;
    }
    // The content subtree, including the europass page wrapper.
    if (
      /(^|[\s,>])(main\.content|\.content|main\.right|\.right|body\s*>\s*\.page)([\s,:.{]|$)/.test(s)
    ) {
      return contentScale;
    }
    return 1;
  };

  return html.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, (match, attrs, css) => {
    const rewritten = css.replace(
      // The selector list is everything up to the first brace of the block. It is
      // trimmed and re-emitted verbatim so unrelated rules keep their formatting.
      /([^{}]+)\{([^{}]*)\}/g,
      (rule: string, selector: string, body: string) => {
        const leading = selector.match(/^\s*/)?.[0] ?? "";
        const trailing = selector.match(/\s*$/)?.[0] ?? "";
        const clean = selector.trim();
        const scale = scaleFor(clean);
        if (scale === 1) {
          return rule;
        }
        const newBody = body.replace(FONT_SIZE_PATTERN, (fs: string, value: string, unit: string) => {
          const num = Number(value);
          const px = toPx(num, unit);
          if (px === null) {
            // Percentages are relative and already follow the inherited size.
            return fs;
          }
          return `font-size: ${fromPx(px * scale, unit)}`;
        });
        return `${leading}${clean}{${newBody}}${trailing}`;
      },
    );
    return `<style${attrs}>${rewritten}</style>`;
  });
}
