/**
 * Font Awesome icons.
 *
 * The templates reference the `fa-solid <name>` classes, which normally resolve
 * through a CDN stylesheet. The PDF renderer does not fetch stylesheets, so the
 * icon webfont is vendored and registered directly (see `pdfFonts.ts`) and each
 * icon is emitted as its real glyph character.
 *
 * Keep this list in step with the classes the templates use; an unknown class
 * renders nothing.
 */
const FONT_AWESOME_FAMILY = "Font Awesome 6 Free";

const ICON_GLYPHS: Record<string, string> = {
  "fa-briefcase": "",
  "fa-envelope": "",
  "fa-graduation-cap": "",
  "fa-house": "",
  "fa-id-badge": "",
  "fa-link": "",
  "fa-phone": "",
  "fa-screwdriver-wrench": "",
  "fa-user": "",
};

/**
 * Render an icon element for a `fa-*` class name.
 *
 * The family is set inline because the class-based binding lived in the CDN
 * stylesheet the renderer ignores. An unmapped class yields an empty string so
 * no blank gap is left in the layout.
 *
 * The weight has to be set too. The vendored Font Awesome face is declared at
 * `font-weight: 900`, so an icon that inherits its parent's weight matches no
 * face at all and the renderer falls back to a system font.
 */
export function renderIcon(iconClass: string): string {
  const glyph = ICON_GLYPHS[iconClass];
  if (!glyph) {
    return "";
  }
  // `font-synthesis: none` matters: the icon font ships no italic or bold face,
  // and without this the renderer shears the glyph to fake one, which reads as a
  // backslanted icon. Icons are never meant to be slanted.
  const style = [
    `font-family: '${FONT_AWESOME_FAMILY}'`,
    "font-weight: 900",
    "font-synthesis: none",
    "font-style: normal",
  ].join("; ");
  return `<i class="fa-solid ${iconClass}" style="${style}">${glyph}</i>`;
}

/** Class names this module can draw. */
export function knownIconClasses(): string[] {
  return Object.keys(ICON_GLYPHS);
}
