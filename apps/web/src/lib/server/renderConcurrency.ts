/**
 * Limits concurrent Playwright browser launches for PDF/PNG export.
 * Prevents trivial DoS via parallel /export/* requests.
 */

const MAX_CONCURRENT =
  Math.max(1, Number.parseInt(process.env.MFCV_EXPORT_CONCURRENCY ?? "1", 10) || 1);

let active = 0;
const waitQueue: Array<() => void> = [];

export async function withExportSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => {
      waitQueue.push(resolve);
    });
  }
  active += 1;
  try {
    return await fn();
  } finally {
    active -= 1;
    const next = waitQueue.shift();
    if (next) {
      next();
    }
  }
}

export function getExportConcurrencyState(): {
  max: number;
  active: number;
  waiting: number;
} {
  return { max: MAX_CONCURRENT, active, waiting: waitQueue.length };
}
