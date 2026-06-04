const baseUrlRaw = process.env.CV_API_BASE_URL || "http://127.0.0.1:3000/api";
export const baseUrl = baseUrlRaw.replace(/\/+$/, "");

const apiToken = (process.env.MFCV_API_TOKEN ?? process.env.CV_API_TOKEN ?? "").trim();

export function authHeaders(extra = {}) {
  if (!apiToken) {
    return { ...extra };
  }
  return {
    authorization: `Bearer ${apiToken}`,
    "x-mfcv-api-token": apiToken,
    ...extra,
  };
}

export function toTextContent(value) {
  return {
    content: [
      {
        type: "text",
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

export function buildUrl(path, query) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${baseUrl}${normalizedPath}`);
  if (query && typeof query === "object") {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      if (typeof value === "boolean") {
        if (value) {
          url.searchParams.set(key, "1");
        }
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function requestJson(method, path, { query, body, headers } = {}) {
  const response = await fetch(buildUrl(path, query), {
    method,
    headers: authHeaders({
      ...(body ? { "content-type": "application/json" } : {}),
      ...(headers || {}),
    }),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`API ${method} ${path} failed (${response.status}): ${JSON.stringify(parsed)}`);
  }
  return parsed;
}

export async function requestForm(path, formData) {
  const response = await fetch(buildUrl(path), {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`API POST ${path} failed (${response.status}): ${JSON.stringify(parsed)}`);
  }
  return parsed;
}

export function appendPrintTweakQuery(query, tweaks = {}) {
  const next = { ...query };
  if (tweaks.removePhoto) {
    next.removePhoto = true;
  }
  if (tweaks.moveSkillsLeft) {
    next.moveSkillsLeft = true;
  }
  if (typeof tweaks.sidebarTextScale === "number") {
    next.sidebarTextScale = tweaks.sidebarTextScale;
  }
  if (typeof tweaks.contentTextScale === "number") {
    next.contentTextScale = tweaks.contentTextScale;
  }
  return next;
}