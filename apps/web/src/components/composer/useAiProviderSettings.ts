"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  AiModel,
  AiProviderStatus,
  AiRole,
  AiRoleBinding,
  AiSettingsResponse,
} from "@/lib/server/aiProviderTypes";

export type AiProviderBlock = {
  providerId: string;
  modelId: string;
  roles: AiRole[];
};

const AI_ROLES: readonly AiRole[] = [
  "assistant",
  "analysis",
  "research",
  "vision",
  "translation",
  "field-rewrite",
  "image-generation",
];

function uniqueProviderIds(response: AiSettingsResponse): string[] {
  const configuredProviderIds = new Set(
    response.providers.filter((provider) => provider.configured).map((provider) => provider.id),
  );
  return [
    ...new Set(
      AI_ROLES.map((role) => response.roles[role]?.providerId)
        .filter((providerId): providerId is string => Boolean(providerId))
        .filter((providerId) => configuredProviderIds.has(providerId)),
    ),
  ];
}

function modelForProvider(response: AiSettingsResponse, providerId: string): string {
  const role = AI_ROLES.find((candidate) => response.roles[candidate]?.providerId === providerId);
  return role ? response.roles[role].modelId : response.models.find((model) => model.providerId === providerId)?.id ?? "";
}

export function useAiProviderSettings() {
  const [response, setResponse] = useState<AiSettingsResponse | null>(null);
  const [providerIds, setProviderIds] = useState<string[]>([]);
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [selectedRoles, setSelectedRoles] = useState<Record<string, AiRole[]>>({});
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reloadingProviderId, setReloadingProviderId] = useState<string | null>(null);
  const [oauthCode, setOauthCode] = useState<{ providerId: string; value: string } | null>(null);
  const [oauthCodeCopiedProviderId, setOauthCodeCopiedProviderId] = useState<string | null>(null);
  const [oauthActionProviderId, setOauthActionProviderId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const applyResponse = useCallback((next: AiSettingsResponse, preserveProviderIds: string[] = []) => {
    setResponse(next);
    const nextProviderIds = [...new Set([...preserveProviderIds, ...uniqueProviderIds(next)])];
    setProviderIds(nextProviderIds);
    setSelectedModels((current) => {
      const updated = { ...current };
      for (const providerId of nextProviderIds) {
        updated[providerId] = modelForProvider(next, providerId) || updated[providerId] || "";
      }
      return updated;
    });
    setSelectedRoles((current) => {
      const updated = { ...current };
      for (const providerId of nextProviderIds) {
        updated[providerId] = AI_ROLES.filter((role) => next.roles[role]?.providerId === providerId);
      }
      return updated;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const result = await fetch("/api/settings/ai");
        const payload = (await result.json()) as AiSettingsResponse & { error?: string };
        if (!result.ok || payload.error) throw new Error(payload.error ?? "Failed to load AI settings.");
        if (!cancelled) applyResponse(payload, []);
      } catch (error) {
        if (!cancelled) setNotice(error instanceof Error ? error.message : "Failed to load AI settings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [applyResponse]);

  const providers = response?.providers ?? [];
  const models = response?.models ?? [];

  const blocks = useMemo<AiProviderBlock[]>(
    () => providerIds.map((providerId) => ({
      providerId,
      modelId: selectedModels[providerId] ?? "",
      roles: selectedRoles[providerId] ?? [],
    })),
    [providerIds, selectedModels, selectedRoles],
  );

  const addProvider = useCallback((providerId: string) => {
    if (!providerId || providerIds.includes(providerId)) return;
    setProviderIds((current) => [...current, providerId]);
    setSelectedModels((current) => ({ ...current, [providerId]: "" }));
    setSelectedRoles((current) => ({ ...current, [providerId]: [] }));
    setNotice("");
  }, [providerIds]);

  const removeProvider = useCallback((providerId: string) => {
    if (AI_ROLES.some((role) => response?.roles[role]?.providerId === providerId)) return;
    setProviderIds((current) => current.filter((id) => id !== providerId));
  }, [response]);

  const reloadProvider = useCallback(async (providerId: string) => {
    setReloadingProviderId(providerId);
    setNotice("");
    try {
      const result = await fetch(`/api/settings/ai?providers=${encodeURIComponent(providerId)}&refresh=1`);
      const payload = (await result.json()) as AiSettingsResponse & { error?: string };
      if (!result.ok || payload.error) throw new Error(payload.error ?? "Failed to reload models.");
      applyResponse(payload, [...providerIds, providerId]);
      if (payload.models.some((model) => model.providerId === providerId)) {
        setNotice(`Models reloaded for ${providers.find((provider) => provider.id === providerId)?.name ?? providerId}.`);
      } else {
        setNotice("");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to reload models.");
    } finally {
      setReloadingProviderId(null);
    }
  }, [applyResponse, providerIds, providers]);

  const saveApiKey = useCallback(async (providerId: string) => {
    const apiKey = apiKeyInputs[providerId]?.trim() ?? "";
    if (!apiKey) return;
    setSaving(true);
    setNotice("");
    try {
      const result = await fetch("/api/settings/ai", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKeys: { [providerId]: apiKey } }),
      });
      const payload = (await result.json()) as AiSettingsResponse & { error?: string };
      if (!result.ok || payload.error) throw new Error(payload.error ?? "Failed to save API key.");
      setApiKeyInputs((current) => ({ ...current, [providerId]: "" }));
      applyResponse(payload, providerIds);
      setNotice("API key saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to save API key.");
    } finally {
      setSaving(false);
    }
  }, [apiKeyInputs, applyResponse, providerIds]);

  const saveRoles = useCallback(async () => {
    const roles: Partial<Record<AiRole, AiRoleBinding>> = {};
    for (const block of blocks) {
      if (!block.modelId) continue;
      for (const role of block.roles) roles[role] = { providerId: block.providerId, modelId: block.modelId };
    }
    setSaving(true);
    setNotice("");
    try {
      const result = await fetch("/api/settings/ai", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roles }),
      });
      const payload = (await result.json()) as AiSettingsResponse & { error?: string };
      if (!result.ok || payload.error) throw new Error(payload.error ?? "Failed to save role assignments.");
      applyResponse(payload, providerIds);
      setNotice("Role assignments saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Failed to save role assignments.");
    } finally {
      setSaving(false);
    }
  }, [applyResponse, blocks, providerIds]);

  const setModel = useCallback((providerId: string, modelId: string) => {
    setSelectedModels((current) => ({ ...current, [providerId]: modelId }));
  }, []);

  const toggleRole = useCallback((providerId: string, role: AiRole) => {
    setSelectedRoles((current) => {
      const roles = current[providerId] ?? [];
      return { ...current, [providerId]: roles.includes(role) ? roles.filter((item) => item !== role) : [...roles, role] };
    });
  }, []);

  const refreshSettings = useCallback(async (preserveProviderIds: string[] = providerIds) => {
    const result = await fetch("/api/settings/ai");
    const payload = (await result.json()) as AiSettingsResponse & { error?: string };
    if (!result.ok || payload.error) throw new Error(payload.error ?? "Failed to refresh AI providers.");
    applyResponse(payload, preserveProviderIds);
  }, [applyResponse, providerIds]);

  const copyTextToClipboard = useCallback(async (value: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      const input = document.createElement("textarea");
      input.value = value;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand("copy");
      input.remove();
      return copied;
    }
  }, []);

  const copyOAuthCode = useCallback(async (providerId: string, value: string): Promise<boolean> => {
    const copied = await copyTextToClipboard(value);
    if (copied) {
      setOauthCodeCopiedProviderId(providerId);
      window.setTimeout(() => setOauthCodeCopiedProviderId((current) => current === providerId ? null : current), 1000);
    }
    return copied;
  }, [copyTextToClipboard]);

  const waitForCodexOAuth = useCallback(async (sessionId: string, popup: Window | null, interval: number) => {
    const attempts = Math.ceil((15 * 60) / Math.max(5, interval));
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, Math.max(5, interval) * 1000));
      const result = await fetch("/api/settings/ai/oauth/openai-codex/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const payload = (await result.json()) as { status?: "pending" | "connected"; expiresAt?: string; error?: string };
      if (!result.ok || payload.error) throw new Error(payload.error ?? "OpenAI Codex login failed.");
      if (payload.status !== "connected") continue;
      if (popup && !popup.closed) popup.close();
      setOauthCode(null);
      await refreshSettings();
      setOauthActionProviderId(null);
      setNotice("OpenAI Codex connected.");
      return;
    }
    throw new Error("OpenAI Codex login expired. Start login again.");
  }, [refreshSettings]);

  const openOAuthLogin = useCallback(async (provider: AiProviderStatus) => {
    const popup = window.open("about:blank", "mfcv-ai-oauth", "popup,width=520,height=720");
    if (!popup) {
      setNotice("The OAuth window was blocked. Allow pop-ups for this site and try again.");
      return;
    }
    setOauthActionProviderId(provider.id);

    try {
      if (provider.id === "openai-codex") {
        const result = await fetch("/api/settings/ai/oauth/openai-codex/start", { method: "POST" });
        const payload = (await result.json()) as { sessionId?: string; verificationUri?: string; userCode?: string; interval?: number; error?: string };
        if (!result.ok || !payload.sessionId || !payload.verificationUri || !payload.userCode) {
          throw new Error(payload.error ?? "OpenAI Codex OAuth login could not start.");
        }
        popup.location.assign(payload.verificationUri);
        setOauthCode({ providerId: provider.id, value: payload.userCode });
        const copied = await copyTextToClipboard(payload.userCode);
        setNotice(copied ? "Login code copied to the clipboard. Complete login in the opened window." : "Copy the login code shown below into the opened window.");
        void waitForCodexOAuth(payload.sessionId, popup, payload.interval ?? 5).catch((error: unknown) => {
          setOauthActionProviderId(null);
          setNotice(error instanceof Error ? error.message : "OpenAI Codex login failed.");
        });
        return;
      }

      const verificationUri = response?.providers.find((item) => item.id === provider.id)?.id === provider.id
        ? provider.oauthVerificationUri
        : undefined;
      if (!verificationUri) {
        popup.close();
        setOauthActionProviderId(null);
        setNotice(`${provider.name} OAuth login is not available in this build.`);
        return;
      }
      popup.location.assign(verificationUri);
      setOauthActionProviderId(null);
      setNotice(`Complete ${provider.name} login in the opened window, then reload this provider.`);
    } catch (error) {
      popup.close();
      setOauthActionProviderId(null);
      setNotice(error instanceof Error ? error.message : `${provider.name} OAuth login could not start.`);
    }
  }, [copyTextToClipboard, response, waitForCodexOAuth]);

  const disconnectOAuth = useCallback(async (provider: AiProviderStatus) => {
    setOauthActionProviderId(provider.id);
    setNotice("");
    try {
      const result = await fetch(`/api/settings/ai/oauth/${provider.id}/disconnect`, { method: "POST" });
      const payload = (await result.json()) as { error?: string };
      if (!result.ok || payload.error) throw new Error(payload.error ?? `${provider.name} disconnect failed.`);
      await refreshSettings();
      setNotice(`${provider.name} disconnected.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : `${provider.name} disconnect failed.`);
    } finally {
      setOauthActionProviderId(null);
    }
  }, [refreshSettings]);

  return {
    aiSettings: response,
    providers,
    models,
    blocks,
    loading,
    saving,
    notice,
    reloadingProviderId,
    apiKeyInputs,
    setApiKeyInput: (providerId: string, value: string) => setApiKeyInputs((current) => ({ ...current, [providerId]: value })),
    addProvider,
    removeProvider,
    reloadProvider,
    saveApiKey,
    saveRoles,
    setModel,
    toggleRole,
    openOAuthLogin,
    disconnectOAuth,
    oauthCode,
    copyOAuthCode,
    oauthCodeCopiedProviderId,
    oauthActionProviderId,
    roles: AI_ROLES,
  };
}
