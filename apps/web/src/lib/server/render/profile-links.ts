function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function normalizeUrl(raw: unknown): string {
  const input = String(raw ?? "").trim();
  if (!input) return "";
  try {
    const parsed = new URL(input);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

type ProfileLinkKind = "linkedin" | "github" | "website";
type NormalizedProfileLink = { href: string; display: string };

export function normalizeUrlLenient(raw: unknown): string {
  const input = String(raw ?? "").trim();
  if (!input) return "";
  const direct = normalizeUrl(input);
  if (direct) return direct;
  if (/^[a-z][a-z0-9+.-]*:/i.test(input)) {
    return "";
  }
  return normalizeUrl(`https://${input.replace(/^\/+/, "")}`);
}

export function compactDisplayFromUrl(href: string): string {
  try {
    const parsed = new URL(href);
    const host = parsed.hostname.replace(/^www\./i, "");
    const cleanPath = parsed.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
    return cleanPath ? `${host}/${cleanPath}` : host;
  } catch {
    return href;
  }
}

export function normalizeProfileLink(
  raw: unknown,
  kind: ProfileLinkKind,
): NormalizedProfileLink | null {
  const input = String(raw ?? "").trim();
  if (!input) return null;

  if (kind === "website") {
    const href = normalizeUrlLenient(input);
    if (!href) return null;
    return { href, display: compactDisplayFromUrl(href) };
  }

  if (kind === "linkedin") {
    const cleaned = input.replace(/^@+/, "").trim();
    const directHref = normalizeUrlLenient(cleaned);
    if (directHref) {
      try {
        const parsed = new URL(directHref);
        const host = parsed.hostname.toLowerCase();
        const path = parsed.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
        if (host.includes("linkedin.com")) {
          return { href: directHref, display: path || "linkedin.com" };
        }
        return { href: directHref, display: compactDisplayFromUrl(directHref) };
      } catch {
        return { href: directHref, display: directHref };
      }
    }
    if (/^(in|company|school|pub)\/[^\s]+$/i.test(cleaned)) {
      return {
        href: `https://www.linkedin.com/${cleaned}`,
        display: cleaned,
      };
    }
    if (/^[a-z0-9][a-z0-9-]{1,99}$/i.test(cleaned)) {
      const path = `in/${cleaned}`;
      return { href: `https://www.linkedin.com/${path}`, display: path };
    }
    return null;
  }

  const cleaned = input.replace(/^@+/, "").trim();
  const directHref = normalizeUrlLenient(cleaned);
  if (directHref) {
    try {
      const parsed = new URL(directHref);
      const host = parsed.hostname.toLowerCase();
      const path = parsed.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
      if (host.includes("github.com")) {
        return { href: directHref, display: path || "github.com" };
      }
      return { href: directHref, display: compactDisplayFromUrl(directHref) };
    } catch {
      return { href: directHref, display: directHref };
    }
  }
  if (/^[a-z0-9][a-z0-9-]{0,38}(\/[a-z0-9._-]+)?$/i.test(cleaned)) {
    return { href: `https://github.com/${cleaned}`, display: cleaned };
  }
  return null;
}

export function deriveTitleFromUrl(raw: unknown): string {
  const href = normalizeUrl(raw);
  if (!href) return "";
  try {
    const parsed = new URL(href);
    const tail = parsed.pathname.split("/").filter(Boolean).pop();
    if (tail) {
      const cleaned = decodeURIComponent(tail)
        .replace(/\.[a-z0-9]{1,6}$/i, "")
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (cleaned) {
        return cleaned;
      }
    }
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function toPublicationLinks(
  value: unknown,
): Array<{ href: string; title: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((entry) => {
      if (typeof entry === "string") {
        const href = normalizeUrl(entry);
        if (!href) return [];
        return [{ href, title: deriveTitleFromUrl(href) || href }];
      }
      const record = asRecord(entry);
      if (!record) return [];
      const href = normalizeUrl(record.url);
      if (!href) return [];
      const title = String(record.title ?? "").trim() || deriveTitleFromUrl(href) || href;
      return [{ href, title }];
    })
    .filter((entry) => entry.href.length > 0);
}