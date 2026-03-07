import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const baseUrlRaw = process.env.CV_API_BASE_URL || "http://127.0.0.1:3000/api";
const baseUrl = baseUrlRaw.replace(/\/+$/, "");

function toTextContent(value) {
  return {
    content: [
      {
        type: "text",
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

function buildUrl(path, query) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${baseUrl}${normalizedPath}`);
  if (query && typeof query === "object") {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function requestJson(method, path, { query, body, headers } = {}) {
  const response = await fetch(buildUrl(path, query), {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(headers || {}),
    },
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

async function requestForm(path, formData) {
  const response = await fetch(buildUrl(path), {
    method: "POST",
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

const server = new McpServer(
  {
    name: "muhfweeceevee-api-mcp",
    version: "0.1.0",
  },
  {
    instructions:
      "MCP wrapper for MuhFweeCeeVee web API. Use these tools to manage CVs, templates, keyword analysis, and Photo Booth AI flows.",
  },
);

server.tool("api_info", "Show MCP wrapper + target API info.", {}, async () => {
  return toTextContent({
    name: "muhfweeceevee-api-mcp",
    apiBaseUrl: baseUrl,
    env: {
      CV_API_BASE_URL: baseUrlRaw,
    },
  });
});

server.tool("list_cvs", "List CV variants.", {}, async () => {
  const data = await requestJson("GET", "/cvs");
  return toTextContent(data);
});

server.tool(
  "get_cv",
  "Fetch a CV by ID, optionally resolving language variant.",
  {
    cvId: z.string().min(1),
    language: z.string().optional(),
    autoTranslate: z.boolean().optional(),
    templateId: z.string().optional(),
  },
  async ({ cvId, language, autoTranslate, templateId }) => {
    const data = await requestJson("GET", `/cvs/${encodeURIComponent(cvId)}`, {
      query: { language, autoTranslate, templateId },
    });
    return toTextContent(data);
  },
);

server.tool(
  "save_cv",
  "Update an existing CV payload.",
  {
    cvId: z.string().min(1),
    cv: z.record(z.any()),
  },
  async ({ cvId, cv }) => {
    const data = await requestJson("PUT", `/cvs/${encodeURIComponent(cvId)}`, { body: { cv } });
    return toTextContent(data);
  },
);

server.tool(
  "create_cv_variant",
  "Create/ensure a language variant from a source CV, optionally AI-translated.",
  {
    sourceCvId: z.string().min(1),
    targetLanguage: z.string().min(2),
    aiTranslate: z.boolean().default(false),
  },
  async ({ sourceCvId, targetLanguage, aiTranslate }) => {
    const data = await requestJson("POST", "/cvs/variant", {
      body: { sourceCvId, targetLanguage, aiTranslate },
    });
    return toTextContent(data);
  },
);

server.tool("list_templates", "List available templates.", {}, async () => {
  const data = await requestJson("GET", "/templates");
  return toTextContent(data);
});

server.tool(
  "preview_html_url",
  "Build a preview URL for HTML rendering endpoint.",
  {
    cvId: z.string().min(1),
    templateId: z.string().min(1),
    theme: z.string().optional(),
    photo: z.enum(["default", "on-circle", "on-square", "on-original", "off"]).optional(),
    photoId: z.string().optional(),
  },
  async ({ cvId, templateId, theme, photo, photoId }) => {
    return toTextContent({
      url: buildUrl("/preview/html", { cvId, templateId, theme, photo, photoId }),
    });
  },
);

server.tool(
  "keyword_analysis",
  "Run keywords analysis for a CV.",
  {
    cvId: z.string().min(1),
    role: z.string().optional(),
    dataset: z.string().optional(),
  },
  async ({ cvId, role, dataset }) => {
    const data = await requestJson("GET", "/analysis/keywords", {
      query: { cvId, role, dataset },
    });
    return toTextContent(data);
  },
);

server.tool("keyword_datasets", "Get keyword datasets.", {}, async () => {
  const data = await requestJson("GET", "/analysis/keywords/datasets");
  return toTextContent(data);
});

server.tool("keyword_datasets_rebuild", "Force rebuild core keyword dataset.", {}, async () => {
  const data = await requestJson("POST", "/analysis/keywords/datasets");
  return toTextContent(data);
});

server.tool(
  "keyword_manage",
  "Read keyword manage stats, or start a collection run with action='run_collection'.",
  {
    action: z.enum(["run_collection"]).optional(),
    runId: z.string().optional(),
  },
  async ({ action, runId }) => {
    if (action) {
      const data = await requestJson("POST", "/analysis/keywords/manage", { body: { action } });
      return toTextContent(data);
    }
    const data = await requestJson("GET", "/analysis/keywords/manage", { query: { runId } });
    return toTextContent(data);
  },
);

server.tool("photo_list", "List Photo Booth images and analysis history.", {}, async () => {
  const data = await requestJson("GET", "/photos");
  return toTextContent(data);
});

server.tool(
  "photo_upload_base64",
  "Upload one photo from base64 content into Photo Booth.",
  {
    fileName: z.string().min(1),
    mimeType: z
      .enum(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"])
      .default("image/jpeg"),
    imageBase64: z.string().min(1),
  },
  async ({ fileName, mimeType, imageBase64 }) => {
    const bytes = Uint8Array.from(Buffer.from(imageBase64, "base64"));
    const blob = new Blob([bytes], { type: mimeType });
    const form = new FormData();
    form.append("files", blob, fileName);
    const data = await requestForm("/photos", form);
    return toTextContent(data);
  },
);

server.tool(
  "photo_delete",
  "Delete a Photo Booth image by id.",
  {
    id: z.string().min(1),
  },
  async ({ id }) => {
    const data = await requestJson("DELETE", "/photos", { query: { id } });
    return toTextContent(data);
  },
);

server.tool(
  "photo_analyze",
  "Analyze a photo (data URL payload). If photoId is set, history is persisted on server.",
  {
    imageDataUrl: z.string().min(1),
    fileName: z.string().optional(),
    photoId: z.string().optional(),
  },
  async ({ imageDataUrl, fileName, photoId }) => {
    const data = await requestJson("POST", "/analysis/photo", {
      body: { imageDataUrl, fileName, photoId },
    });
    return toTextContent(data);
  },
);

server.tool(
  "photo_compare",
  "Compare 2+ photos via multi-image ranking.",
  {
    images: z.array(
      z.object({
        name: z.string().min(1),
        imageDataUrl: z.string().min(1),
      }),
    ).min(2),
  },
  async ({ images }) => {
    const data = await requestJson("POST", "/analysis/photo/compare", {
      body: { images },
    });
    return toTextContent(data);
  },
);

server.tool("openrouter_settings_get", "Get OpenRouter settings and model catalog.", {}, async () => {
  const data = await requestJson("GET", "/settings/openrouter");
  return toTextContent(data);
});

server.tool(
  "openrouter_settings_update",
  "Update OpenRouter settings (api key/model/base URL).",
  {
    apiKey: z.string().optional(),
    model: z.string().optional(),
    baseUrl: z.string().optional(),
  },
  async ({ apiKey, model, baseUrl: nextBaseUrl }) => {
    const data = await requestJson("PUT", "/settings/openrouter", {
      body: { apiKey, model, baseUrl: nextBaseUrl },
    });
    return toTextContent(data);
  },
);

server.tool("openrouter_credit", "Get OpenRouter credit/prepaid data.", {}, async () => {
  const data = await requestJson("GET", "/settings/openrouter/credit");
  return toTextContent(data);
});

const transport = new StdioServerTransport();
await server.connect(transport);
