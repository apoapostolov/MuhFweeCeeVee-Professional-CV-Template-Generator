import { describe, expect, it } from "vitest";

import { resolveOpenRouterResearchModelId } from "./openrouter-research-model";

describe("resolveOpenRouterResearchModelId", () => {
  it("defaults to sonar-pro when research model is empty", () => {
    expect(resolveOpenRouterResearchModelId("")).toBe("perplexity/sonar-pro");
  });

  it("keeps perplexity models from settings", () => {
    expect(resolveOpenRouterResearchModelId("perplexity/sonar")).toBe("perplexity/sonar");
  });

  it("appends :online to non-search models chosen as research model", () => {
    expect(resolveOpenRouterResearchModelId("openai/gpt-4o")).toBe("openai/gpt-4o:online");
  });

  it("appends :online when env forces a plain slug", () => {
    const prev = process.env.OPENROUTER_COMPANY_RESEARCH_MODEL;
    process.env.OPENROUTER_COMPANY_RESEARCH_MODEL = "anthropic/claude-sonnet-4";
    expect(resolveOpenRouterResearchModelId("perplexity/sonar-pro")).toBe(
      "anthropic/claude-sonnet-4:online",
    );
    if (prev === undefined) {
      delete process.env.OPENROUTER_COMPANY_RESEARCH_MODEL;
    } else {
      process.env.OPENROUTER_COMPANY_RESEARCH_MODEL = prev;
    }
  });
});