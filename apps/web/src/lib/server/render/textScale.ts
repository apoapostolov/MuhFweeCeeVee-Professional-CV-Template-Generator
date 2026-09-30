/**
 * Text-scale tweaks for the native renderer.
 *
 * `zoom` is not implemented by takumi-pdf and `transform: scale` shrinks the
 * whole container, but the tweak is meant to change the type size while the
 * sidebar and content columns keep their geometry.
 *
 * Matching a fixed list of column selectors is not reliable: the templates name
 * their columns inconsistently (`.content`, `.right`, `.page`, `.timeline-body`,
 * `.subsection`), so any such list silently misses rules. Instead every rule that
 * declares a `font-size` is scaled, and the column is decided by which column's
 * classes the rule mentions.
 */

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
    default:
      // Percentages and unitless values are relative to the parent, which the
      // scaled parent already handles.
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
      return `${Math.round(((px * 72) / 96) * 100) / 100}pt`;
    default:
      return `${Math.round((px / 16) * 1000) / 1000}${unit}`;
  }
}

const FONT_SIZE = /font-size\s*:\s*(-?[\d.]+)(px|mm|pt|em|rem)/gi;

/**
 * Classes that only ever appear in the sidebar column. Matching these wins over
 * the content test, so a sidebar rule is never scaled with the content.
 */
const SIDEBAR_CLASSES =
  /\.(sidebar|left|personal-list|star-list|rated-list|interests-text|photo-frame|photo-wrap|avatar-wrap|avatar-fallback|profile|languages|product-list|lang-block)\b/i;

/**
 * Scale the declared font sizes in the document.
 *
 * Every `font-size` declaration is rewritten. Sidebar-only class names take the
 * sidebar scale; everything else, including `body` and the shared heading
 * rules, follows the content scale. The two columns therefore resize
 * independently, which is what the tweak means.
 */
export function applyTextScale(
  html: string,
  templateId: string,
  sidebarScale: number,
  contentScale: number,
): string {
  void templateId;
  if (sidebarScale === 1 && contentScale === 1) {
    return html;
  }

  return html.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, (match, attrs, css) => {
    const rewritten = css.replace(
      /([^{}]+)\{([^{}]*)\}/g,
      (rule: string, selector: string, body: string) => {
        const scale = SIDEBAR_CLASSES.test(selector) ? sidebarScale : contentScale;
        if (scale === 1) {
          return rule;
        }
        const newBody = body.replace(FONT_SIZE, (fs: string, value: string, unit: string) => {
          const px = toPx(Number(value), unit);
          if (px === null) {
            return fs;
          }
          return `font-size: ${fromPx(px * scale, unit)}`;
        });
        if (newBody === body) {
          return rule;
        }
        const leading = selector.match(/^\s*/)?.[0] ?? "";
        const trailing = selector.match(/\s*$/)?.[0] ?? "";
        return `${leading}${selector.trim()}{${newBody}}${trailing}`;
      },
    );
    return `<style${attrs}>${rewritten}</style>`;
  });
}
