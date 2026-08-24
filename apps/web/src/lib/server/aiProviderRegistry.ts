import type { AiCapability, AiProviderDefinition } from "./aiProviderTypes";

const chat: AiCapability[] = ["chat"];
const chatVision: AiCapability[] = ["chat", "vision"];
const chatResearch: AiCapability[] = ["chat", "research"];
const chatVisionResearch: AiCapability[] = ["chat", "vision", "research"];

/**
 * Provider transport metadata. Credentials and model choices are never stored
 * in this registry. OpenAI-compatible providers share the server transport;
 * native providers are explicit so they cannot silently use the wrong wire
 * format.
 */
export const AI_PROVIDER_REGISTRY: readonly AiProviderDefinition[] = [
  { id: "openai-codex", name: "OpenAI Codex (OAuth)", kind: "native", auth: "oauth", capabilities: chat, oauthVerificationUri: "https://auth.openai.com/codex/device" },
  { id: "openai", name: "OpenAI (API key)", kind: "openai-compatible", auth: "api_key", endpoint: "https://api.openai.com/v1", modelsEndpoint: "https://api.openai.com/v1/models", capabilities: chatVision },
  { id: "anthropic", name: "Anthropic", kind: "native", auth: "api_key", endpoint: "https://api.anthropic.com/v1", modelsEndpoint: "https://api.anthropic.com/v1/models", capabilities: chatVision },
  { id: "gemini", name: "Google Gemini", kind: "native", auth: "api_key", endpoint: "https://generativelanguage.googleapis.com/v1beta", modelsEndpoint: "https://generativelanguage.googleapis.com/v1beta/models", capabilities: chatVisionResearch },
  { id: "xai-oauth", name: "xAI (OAuth)", kind: "openai-compatible", auth: "oauth", endpoint: "https://api.x.ai/v1", modelsEndpoint: "https://api.x.ai/v1/models", capabilities: chatVisionResearch, oauthVerificationUri: "https://accounts.x.ai/oauth2/device" },
  { id: "xai", name: "xAI (API key)", kind: "openai-compatible", auth: "api_key", endpoint: "https://api.x.ai/v1", modelsEndpoint: "https://api.x.ai/v1/models", capabilities: chatVisionResearch },
  { id: "openrouter", name: "OpenRouter", kind: "openai-compatible", auth: "api_key", endpoint: "https://openrouter.ai/api/v1", modelsEndpoint: "https://openrouter.ai/api/v1/models", capabilities: chatVisionResearch },
  { id: "deepseek", name: "DeepSeek", kind: "openai-compatible", auth: "api_key", endpoint: "https://api.deepseek.com/v1", modelsEndpoint: "https://api.deepseek.com/v1/models", capabilities: chatResearch },
  { id: "mistral", name: "Mistral", kind: "openai-compatible", auth: "api_key", endpoint: "https://api.mistral.ai/v1", modelsEndpoint: "https://api.mistral.ai/v1/models", capabilities: chatVision },
  { id: "groq", name: "Groq", kind: "openai-compatible", auth: "api_key", endpoint: "https://api.groq.com/openai/v1", modelsEndpoint: "https://api.groq.com/openai/v1/models", capabilities: chatVision },
  { id: "qwen", name: "Qwen", kind: "openai-compatible", auth: "api_key", endpoint: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", modelsEndpoint: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models", capabilities: chatVision },
  { id: "huggingface", name: "Hugging Face", kind: "openai-compatible", auth: "api_key", endpoint: "https://router.huggingface.co/v1", modelsEndpoint: "https://router.huggingface.co/v1/models", capabilities: chatVision },
  { id: "zai", name: "Z.ai", kind: "openai-compatible", auth: "api_key", endpoint: "https://api.z.ai/api/coding/paas/v4", modelsEndpoint: "https://api.z.ai/api/coding/paas/v4/models", capabilities: chatVision },
  { id: "moonshot", name: "Moonshot AI", kind: "openai-compatible", auth: "api_key", endpoint: "https://api.moonshot.ai/v1", modelsEndpoint: "https://api.moonshot.ai/v1/models", capabilities: chatVision },
  { id: "minimax", name: "MiniMax", kind: "openai-compatible", auth: "api_key", endpoint: "https://api.minimax.io/v1", modelsEndpoint: "https://api.minimax.io/v1/models", capabilities: chatVision },
  { id: "cerebras", name: "Cerebras", kind: "openai-compatible", auth: "api_key", endpoint: "https://api.cerebras.ai/v1", modelsEndpoint: "https://api.cerebras.ai/v1/models", capabilities: chat },
  { id: "ollama", name: "Ollama", kind: "local", auth: "none", endpoint: "http://127.0.0.1:11434/v1", modelsEndpoint: "http://127.0.0.1:11434/v1/models", capabilities: chatVision },
  { id: "vllm", name: "vLLM", kind: "local", auth: "none", endpoint: "http://127.0.0.1:8000/v1", modelsEndpoint: "http://127.0.0.1:8000/v1/models", capabilities: chatVision },
  { id: "lmstudio", name: "LM Studio", kind: "local", auth: "none", endpoint: "http://127.0.0.1:1234/v1", modelsEndpoint: "http://127.0.0.1:1234/v1/models", capabilities: chatVision },
  { id: "llamacpp", name: "llama.cpp", kind: "local", auth: "none", endpoint: "http://127.0.0.1:8080/v1", modelsEndpoint: "http://127.0.0.1:8080/v1/models", capabilities: chatVision },
] as const;

export function getAiProvider(providerId: string): AiProviderDefinition | null {
  return AI_PROVIDER_REGISTRY.find((provider) => provider.id === providerId) ?? null;
}

export function listAiProviders(capability?: AiCapability): AiProviderDefinition[] {
  return AI_PROVIDER_REGISTRY.filter((provider) => !capability || provider.capabilities.includes(capability));
}
