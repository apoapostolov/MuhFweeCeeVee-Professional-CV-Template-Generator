import { inflateSync } from "node:zlib";

export type DrawnFont = { font: string; chars: number };

const SELECT_FONT = /\/([A-Za-z0-9]+)\s+[\d.]+\s+Tf/g;
const LITERAL_STRING = /\(((?:[^()\\]|\\.)*)\)\s*Tj/g;
const ARRAY_SHOW = /\[((?:[^\][]|\][^\][])*)\]\s*TJ/g;
const STRING_IN_ARRAY = /\(((?:[^()\\]|\\.)*)\)/g;

/** Length of the text a literal PDF string paints. Octal escapes count as one. */
function literalLength(value: string): number {
  return value.replace(/\\[0-7]{1,3}/g, "x").length;
}

/** Characters painted by one slice of a content stream. */
function drawnChars(segment: string): number {
  let total = 0;
  const literal = new RegExp(LITERAL_STRING.source, "g");
  let match: RegExpExecArray | null;
  while ((match = literal.exec(segment))) {
    total += literalLength(match[1]);
  }
  const array = new RegExp(ARRAY_SHOW.source, "g");
  while ((match = array.exec(segment))) {
    const run = new RegExp(STRING_IN_ARRAY.source, "g");
    let inner: RegExpExecArray | null;
    while ((inner = run.exec(match[1]))) {
      total += literalLength(inner[1]);
    }
  }
  return total;
}

/**
 * Read back which font programs actually drew the text in a PDF.
 *
 * A PDF lists every font it embeds, including ones it never draws with, so
 * checking that list proves nothing: a resource can sit there untouched while
 * every glyph was drawn by something else. The reliable signal is to walk the
 * content stream, note which font each `Tf` selects, and attribute the text that
 * follows to it.
 *
 * Body copy is usually drawn as a `TJ` array of runs rather than a plain `Tj`
 * string, so both forms are counted. Content streams are Flate-compressed.
 */
export function drawnFonts(pdf: Buffer): DrawnFont[] {
  const raw = pdf.toString("latin1");

  const streams: string[] = [];
  const startPattern = /stream\r?\n/g;
  let hit: RegExpExecArray | null;
  while ((hit = startPattern.exec(raw))) {
    const from = hit.index + hit[0].length;
    const to = raw.indexOf("endstream", from);
    if (to < 0) continue;
    const slice = Buffer.from(raw.slice(from, to), "latin1");
    try {
      streams.push(inflateSync(slice).toString("latin1"));
    } catch {
      streams.push(slice.toString("latin1"));
    }
  }

  const counts = new Map<string, number>();
  for (const stream of streams) {
    // Attribute the text between each Tf and the next one to that font.
    const select = new RegExp(SELECT_FONT.source, "g");
    let position = 0;
    let font = "";
    let chosen: RegExpExecArray | null;
    while ((chosen = select.exec(stream))) {
      if (chosen.index > position) {
        const painted = drawnChars(stream.slice(position, chosen.index));
        if (painted > 0) {
          counts.set(font, (counts.get(font) ?? 0) + painted);
        }
      }
      font = chosen[1];
      position = chosen.index + chosen[0].length;
    }
    const tail = drawnChars(stream.slice(position));
    if (tail > 0) {
      counts.set(font, (counts.get(font) ?? 0) + tail);
    }
  }

  const resolved = new Map<string, number>();
  for (const [resource, chars] of counts) {
    if (chars === 0) continue;
    const base = baseFontFor(raw, resource);
    resolved.set(base, (resolved.get(base) ?? 0) + chars);
  }

  return [...resolved.entries()]
    .map(([font, chars]) => ({ font, chars }))
    .sort((a, b) => b.chars - a.chars);
}

/** Resolve a font resource name to the embedded program's declared name. */
function baseFontFor(raw: string, resource: string): string {
  const reference = raw.match(new RegExp("/" + resource + "\\s+(\\d+)\\s+0\\s+R"));
  if (!reference) return resource;
  const object = raw.match(
    new RegExp("\\n" + reference[1] + " 0 obj([\\s\\S]{0,800}?)endobj"),
  );
  const declared = object?.[1].match(/\/BaseFont\s*\/([A-Za-z0-9+_\-.]+)/)?.[1];
  if (!declared) return resource;
  // A subset prefix looks like "ABCDEF+FamilyName".
  return declared.split("+").pop() ?? declared;
}
