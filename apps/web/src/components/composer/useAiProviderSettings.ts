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
  }, [providerIds]);

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
      setNotice(`Models reloaded for ${providers.find((provider) => provider.id === providerId)?.name ?? providerId}.`);
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

  const openOAuthLogin = useCallback((provider: AiProviderStatus) => {
    const verificationUri = response?.providers.find((item) => item.id === provider.id)?.id === provider.id
      ? (provider.id === "xai-oauth" ? "https://accounts.x.ai/oauth2/device" : "")
      : "";
    if (!verificationUri) {
      setNotice(`${provider.name} OAuth login is not available in this build.`);
      return;
    }
    window.open(verificationUri, "mfcv-ai-oauth", "noopener,noreferrer");
    setNotice(`Complete ${provider.name} login in the opened window, then reload this provider.`);
  }, [response]);

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
    roles: AI_ROLES,
  };
}
