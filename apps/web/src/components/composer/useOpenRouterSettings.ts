"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { STORAGE_KEYS } from "./constants";
import type { OpenRouterCreditResponse, OpenRouterSettingsResponse } from "./types";
import type { OpenRouterModelOption } from "./openrouter-utils";

export function useOpenRouterSettings() {
  const [settings, setSettings] = useState<OpenRouterSettingsResponse | null>(null);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState("");
  const [creditStatus, setCreditStatus] = useState<OpenRouterCreditResponse | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [modelInput, setModelInput] = useState("openai/gpt-4o-mini");
  const [imageGenerationModelInput, setImageGenerationModelInput] = useState("");
  const [baseUrlInput, setBaseUrlInput] = useState("https://openrouter.ai/api/v1/chat/completions");
  const [modelOptions, setModelOptions] = useState<OpenRouterModelOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      setSettingsLoading(true);
      try {
        const response = await fetch("/api/settings/openrouter");
        const payload = (await response.json()) as OpenRouterSettingsResponse;
        if (cancelled) return;
        setSettings(payload);
        setModelInput(payload.model || "openai/gpt-4o-mini");
        setBaseUrlInput(payload.baseUrl || "https://openrouter.ai/api/v1/chat/completions");
        const incomingModels = (payload.models ?? []) as OpenRouterModelOption[];
        setModelOptions(incomingModels);
        try {
          const persistedImageModelId = window.localStorage.getItem(STORAGE_KEYS.imageGenerationModel) ?? "";
          const hasPersistedModel = incomingModels.some(
            (item) => item.id === persistedImageModelId && item.supportsImageGeneration,
          );
          if (hasPersistedModel) {
            setImageGenerationModelInput(persistedImageModelId);
          } else {
            setImageGenerationModelInput(
              incomingModels.find((item) => item.supportsImageGeneration)?.id ?? "",
            );
          }
        } catch {
          setImageGenerationModelInput(
            incomingModels.find((item) => item.supportsImageGeneration)?.id ?? "",
          );
        }
      } catch {
        if (!cancelled) {
          setSettings(null);
          setSettingsNotice("Failed to load OpenRouter settings.");
        }
      } finally {
        if (!cancelled) {
          setSettingsLoading(false);
        }
      }
    }
    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!imageGenerationModelInput) return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.imageGenerationModel, imageGenerationModelInput);
    } catch {
      // no-op
    }
  }, [imageGenerationModelInput]);

  useEffect(() => {
    let cancelled = false;
    async function loadCreditStatus() {
      try {
        const response = await fetch("/api/settings/openrouter/credit");
        const payload = (await response.json()) as OpenRouterCreditResponse;
        if (!cancelled) {
          setCreditStatus(payload);
        }
      } catch {
        if (!cancelled) {
          setCreditStatus({
            available: false,
            remainingUsd: null,
            usageUsd: null,
            limitUsd: null,
            isFreeTier: false,
            label: "OpenRouter credit: unavailable",
            checkedAt: new Date().toISOString(),
          });
        }
      }
    }
    void loadCreditStatus();
    const intervalId = window.setInterval(() => {
      void loadCreditStatus();
    }, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const selectedAnalysisModelOption = useMemo(
    () => modelOptions.find((item) => item.id === modelInput) ?? null,
    [modelOptions, modelInput],
  );

  const imageGenerationModelOptions = useMemo(
    () => modelOptions.filter((item) => item.supportsImageGeneration),
    [modelOptions],
  );

  const selectedImageGenerationModelOption = useMemo(
    () => imageGenerationModelOptions.find((item) => item.id === imageGenerationModelInput) ?? null,
    [imageGenerationModelInput, imageGenerationModelOptions],
  );

  const settingsTabState = useMemo<"not_configured" | "configured" | "error">(() => {
    const hasRuntimeError =
      /error|failed|invalid|unauthorized/i.test(settingsNotice) ||
      (Boolean(settings?.hasApiKey) && creditStatus?.available === false);
    if (hasRuntimeError) return "error";
    if (settings?.hasApiKey) return "configured";
    return "not_configured";
  }, [creditStatus, settings?.hasApiKey, settingsNotice]);

  const saveAiSettings = useCallback(async () => {
    setSettingsSaving(true);
    setSettingsNotice("");
    try {
      const response = await fetch("/api/settings/openrouter", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKeyInput,
          model: modelInput,
          baseUrl: baseUrlInput,
        }),
      });
      const payload = (await response.json()) as OpenRouterSettingsResponse & { error?: string };
      if (!response.ok || payload.error) {
        setSettingsNotice(payload.error ?? "Failed to save settings.");
        return;
      }
      setSettings(payload);
      setApiKeyInput("");
      const updatedModels = (payload.models ?? []) as OpenRouterModelOption[];
      setModelOptions(updatedModels);
      if (!updatedModels.some((item) => item.id === imageGenerationModelInput && item.supportsImageGeneration)) {
        setImageGenerationModelInput(
          updatedModels.find((item) => item.supportsImageGeneration)?.id ?? "",
        );
      }
      setSettingsNotice("Settings saved.");
      try {
        const creditResponse = await fetch("/api/settings/openrouter/credit");
        const creditPayload = (await creditResponse.json()) as OpenRouterCreditResponse;
        setCreditStatus(creditPayload);
      } catch {
        // credit polling will refresh
      }
    } finally {
      setSettingsSaving(false);
    }
  }, [apiKeyInput, baseUrlInput, imageGenerationModelInput, modelInput]);

  return {
    settings,
    showAiSettings,
    setShowAiSettings,
    settingsLoading,
    settingsSaving,
    settingsNotice,
    creditStatus,
    apiKeyInput,
    setApiKeyInput,
    modelInput,
    setModelInput,
    imageGenerationModelInput,
    setImageGenerationModelInput,
    baseUrlInput,
    setBaseUrlInput,
    modelOptions,
    selectedAnalysisModelOption,
    imageGenerationModelOptions,
    selectedImageGenerationModelOption,
    settingsTabState,
    saveAiSettings,
  };
}