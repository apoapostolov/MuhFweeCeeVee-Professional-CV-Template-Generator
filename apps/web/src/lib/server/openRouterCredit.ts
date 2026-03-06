export type OpenRouterCreditInfo = {
  available: boolean;
  remainingUsd: number | null;
  usageUsd: number | null;
  limitUsd: number | null;
  isFreeTier: boolean;
  label: string;
  checkedAt: string;
};

type CreditsPayload = {
  data?: {
    total_credits?: number | string | null;
    total_usage?: number | string | null;
  };
};

type KeyPayload = {
  data?: {
    limit?: number | string | null;
    usage?: number | string | null;
    limit_remaining?: number | string | null;
    is_free_tier?: boolean;
  };
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

async function fetchPrepaidCredit(apiKey: string): Promise<{
  remainingUsd: number | null;
  usageUsd: number | null;
  limitUsd: number | null;
}> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/credits", {
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
      },
    });
    if (!response.ok) {
      return {
        remainingUsd: null,
        usageUsd: null,
        limitUsd: null,
      };
    }

    const payload = (await response.json()) as CreditsPayload;

    const totalCredits = parseNumberish(payload.data?.total_credits);
    const totalUsage = parseNumberish(payload.data?.total_usage);
    if (totalCredits === null) {
      return {
        remainingUsd: null,
        usageUsd: totalUsage,
        limitUsd: null,
      };
    }

    return {
      remainingUsd: Math.max(0, totalCredits - (totalUsage ?? 0)),
      usageUsd: totalUsage,
      limitUsd: totalCredits,
    };
  } catch {
    return {
      remainingUsd: null,
      usageUsd: null,
      limitUsd: null,
    };
  }
}

async function readOpenRouterErrorMessage(response: Response): Promise<string | null> {
  try {
    const payload = (await response.json()) as {
      error?: { message?: unknown };
      message?: unknown;
    };
    const nested = payload?.error?.message;
    if (typeof nested === "string" && nested.trim().length > 0) {
      return nested.trim();
    }
    if (typeof payload?.message === "string" && payload.message.trim().length > 0) {
      return payload.message.trim();
    }
  } catch {
    // no-op
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
    const details = await readOpenRouterErrorMessage(response);
    const reason = details ? `${response.status}: ${details}` : String(response.status);
    return {
      available: false,
      remainingUsd: null,
      usageUsd: null,
      limitUsd: null,
      isFreeTier: false,
      label: `OpenRouter credit: unavailable (${reason})`,
      checkedAt,
    };
  }

  const keyPayload = (await response.json()) as KeyPayload;
  const keyLimit = parseNumberish(keyPayload.data?.limit);
  const keyUsage = parseNumberish(keyPayload.data?.usage);
  const isFreeTier = Boolean(keyPayload.data?.is_free_tier);

  // Primary metric: prepaid account balance from /credits.
  const prepaid = await fetchPrepaidCredit(apiKey);
  const remaining = prepaid.remainingUsd;
  const usage = prepaid.usageUsd ?? keyUsage;
  const limit = prepaid.limitUsd ?? keyLimit;

  let label: string;
  if (remaining !== null) {
    label = `OpenRouter prepaid remaining: $${remaining.toFixed(2)}`;
  } else if (isFreeTier) {
    label = "OpenRouter credit: free tier";
  } else {
    label = "OpenRouter prepaid remaining: unavailable";
  }

  return {
    available: remaining !== null || isFreeTier,
    remainingUsd: remaining,
    usageUsd: usage,
    limitUsd: limit,
    isFreeTier,
    label,
    checkedAt,
  };
}
