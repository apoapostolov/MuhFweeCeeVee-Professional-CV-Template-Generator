export const PRINT_TEXT_SCALE_DEFAULT = 100;
export const PRINT_TEXT_SCALE_STEP = 5;
export const PRINT_TEXT_SCALE_MIN = 50;
export const PRINT_TEXT_SCALE_MAX = 200;

export function clampPrintTextScale(value: number): number {
  if (!Number.isFinite(value)) {
    return PRINT_TEXT_SCALE_DEFAULT;
  }
  const rounded = Math.round(value);
  return Math.max(PRINT_TEXT_SCALE_MIN, Math.min(PRINT_TEXT_SCALE_MAX, rounded));
}

export function readStoredPrintTextScale(raw: string | null): number {
  if (!raw) {
    return PRINT_TEXT_SCALE_DEFAULT;
  }
  return clampPrintTextScale(Number(raw));
}