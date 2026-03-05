export type OpenRouterCreditInfo = {
  available: boolean;
  remainingUsd: number | null;
  usageUsd: number | null;
  limitUsd: number | null;
  isFreeTier: boolean;
  label: string;
  checkedAt: string;
};

function parseNumberish(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) {
    return input;
  }
  if (typeof input === "string") {
    const value = Number(input.trim());
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

export async function fetchOpenRouterCredit(apiKey: string): Promise<OpenRouterCreditInfo> {
  const checkedAt = new Date().toISOString();
  if (!apiKey || apiKey.trim().length === 0) {
    return {
      available: false,
      remainingUsd: null,
      usageUsd: null,
      limitUsd: null,
      isFreeTier: false,
      label: "OpenRouter credit: unavailable (no API key)",
      checkedAt,
    };
  }

  const response = await fetch("https://openrouter.ai/api/v1/key", {
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
    },
  });

  if (!response.ok) {
    return {
      available: false,
      remainingUsd: null,
      usageUsd: null,
      limitUsd: null,
      isFreeTier: false,
      label: `OpenRouter credit: unavailable (${response.status})`,
      checkedAt,
    };
  }

  const payload = (await response.json()) as {
    data?: {
      limit?: number | string | null;
      usage?: number | string | null;
      limit_remaining?: number | string | null;
      is_free_tier?: boolean;
    };
  };

  const limit = parseNumberish(payload.data?.limit);
  const usage = parseNumberish(payload.data?.usage);
  const directRemaining = parseNumberish(payload.data?.limit_remaining);
  const remaining =
    directRemaining !== null
      ? directRemaining
      : limit !== null && usage !== null
        ? Math.max(0, limit - usage)
        : null;
  const isFreeTier = Boolean(payload.data?.is_free_tier);

  let label: string;
  if (remaining !== null) {
    label = `OpenRouter credit remaining: $${remaining.toFixed(2)}`;
  } else if (limit !== null && usage !== null) {
    label = `OpenRouter usage: $${usage.toFixed(2)} / $${limit.toFixed(2)}`;
  } else if (usage !== null) {
    label = `OpenRouter usage: $${usage.toFixed(2)} (limit unavailable)`;
  } else if (isFreeTier) {
    label = "OpenRouter credit: free tier";
  } else {
    label = "OpenRouter credit: unavailable";
  }

  return {
    available: remaining !== null || usage !== null || isFreeTier,
    remainingUsd: remaining,
    usageUsd: usage,
    limitUsd: limit,
    isFreeTier,
    label,
    checkedAt,
  };
}
