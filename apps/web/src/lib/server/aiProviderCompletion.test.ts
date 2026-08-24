import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  provider: "xai-oauth",
  readSettings: vi.fn(),
  readKey: vi.fn(),
  readXaiToken: vi.fn(),
  readCodexToken: vi.fn(),
  readCodexCredentials: vi.fn(),
}));

vi.mock("./aiSettings", () => ({
  readAiSettingsDocument: mocks.readSettings,
  readAiProviderKey: mocks.readKey,
}));
vi.mock("./xaiOAuth", () => ({ readXaiOAuthAccessToken: mocks.readXaiToken }));
vi.mock("./openaiCodexOAuth", () => ({
  readCodexOAuthAccessToken: mocks.readCodexToken,
  readCodexOAuthCredentials: mocks.readCodexCredentials,
}));

import { completeAiText, completeAiVision } from "./aiProviderCompletion";

function settings() {
  return {
    disabledRoles: [],
    roles: {
      analysis: { providerId: mocks.provider, modelId: mocks.provider === "xai-oauth" ? "grok-test" : "gpt-test" },
      vision: { providerId: mocks.provider, modelId: mocks.provider === "xai-oauth" ? "grok-test" : "gpt-test" },
    },
    providerEndpoints: {},
  };
}

describe("configured AI provider transports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.provider = "xai-oauth";
    mocks.readSettings.mockImplementation(async () => settings());
    mocks.readKey.mockResolvedValue("");
    mocks.readXaiToken.mockResolvedValue("xai-token");
    mocks.readCodexToken.mockResolvedValue("codex-token");
    mocks.readCodexCredentials.mockResolvedValue({ accessToken: "codex-token", accountId: "account-1" });
  });

  it.each([
    ["xAI OAuth", "xai-oauth", "grok-test", "https://api.x.ai/v1/chat/completions"],
    ["Codex OAuth", "openai-codex", "gpt-test", "https://chatgpt.com/backend-api/codex/responses"],
  ])("completes text through %s", async (_name, provider, model, expectedUrl) => {
    mocks.provider = provider;
    const response = provider === "openai-codex"
      ? new Response('data: {"type":"response.output_text.delta","delta":"CODEX"}\n\ndata: {"type":"response.completed"}\n')
      : new Response(JSON.stringify({ choices: [{ message: { content: "XAI" } }] }));
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);

    const result = await completeAiText({
      role: "analysis",
      messages: [{ role: "user", content: "Return a short result." }],
      maxTokens: 100,
    });

    expect(result).toMatchObject({ providerId: provider, modelId: model });
    expect(result.text).toBe(provider === "openai-codex" ? "CODEX" : "XAI");
    expect(fetchMock).toHaveBeenCalledWith(expectedUrl, expect.objectContaining({ method: "POST" }));
    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string) as Record<string, unknown>;
    expect(request.model).toBe(model);
    expect(request.input || request.messages).toBeTruthy();
    expect(request).not.toHaveProperty("max_output_tokens");
  });

  it.each([
    ["xAI OAuth", "xai-oauth", "grok-test"],
    ["Codex OAuth", "openai-codex", "gpt-test"],
  ])("completes vision through %s", async (_name, provider, model) => {
    mocks.provider = provider;
    const response = provider === "openai-codex"
      ? new Response('data: {"type":"response.output_text.delta","delta":"VISION"}\n')
      : new Response(JSON.stringify({ choices: [{ message: { content: "VISION" } }] }));
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);

    const result = await completeAiVision({
      role: "vision",
      prompt: "Describe the image.",
      images: ["data:image/png;base64,AAAA"],
      maxTokens: 100,
    });

    expect(result).toMatchObject({ providerId: provider, modelId: model, text: "VISION" });
    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string) as Record<string, unknown>;
    expect(JSON.stringify(request)).toContain("data:image/png;base64,AAAA");
  });
});
