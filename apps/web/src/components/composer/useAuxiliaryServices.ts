"use client";

import { useCallback, useEffect, useState } from "react";

import type { AuxiliaryServiceStatus } from "@/lib/server/auxiliaryServices";

export function useAuxiliaryServices() {
  const [services, setServices] = useState<AuxiliaryServiceStatus[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/settings/auxiliary");
      const payload = (await response.json()) as { services?: AuxiliaryServiceStatus[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to load auxiliary services.");
      setServices(payload.services ?? []);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Failed to load auxiliary services.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setInput = useCallback((serviceId: string, value: string) => {
    setInputs((current) => ({ ...current, [serviceId]: value }));
  }, []);

  const save = useCallback(async (serviceId: string) => {
    const value = inputs[serviceId]?.trim();
    if (!value) return;
    setSavingId(serviceId);
    try {
      const response = await fetch("/api/settings/auxiliary", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKeys: { [serviceId]: value } }),
      });
      const payload = (await response.json()) as { services?: AuxiliaryServiceStatus[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to save API key.");
      setServices(payload.services ?? []);
      setInputs((current) => ({ ...current, [serviceId]: "" }));
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Failed to save API key.");
    } finally {
      setSavingId(null);
    }
  }, [inputs]);

  return { services, inputs, loading, savingId, error, setInput, save, reload: load };
}
