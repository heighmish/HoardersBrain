declare const positiveIntBrand: unique symbol;
declare const nonNegativeIntBrand: unique symbol;
declare const nonNegativeNumberBrand: unique symbol;

export type PositiveInt = number & { readonly [positiveIntBrand]: true };
export type NonNegativeInt = number & { readonly [nonNegativeIntBrand]: true };
export type NonNegativeNumber = number & {
  readonly [nonNegativeNumberBrand]: true;
};

export const ZERO = 0 as NonNegativeNumber;

/** Strict parse: whole number >= 1, or null when blank or invalid. */
export const parsePositiveInt = (raw: string): PositiveInt | null => {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return null;
  }
  return parsed as PositiveInt;
};

/** Clamped integer in [1, max] with fallback 1 for live stack/quantity controls. */
export const parseClampedPositiveInt = (
  raw: string,
  max?: number,
): PositiveInt => {
  const parsed = Number.parseInt(raw, 10);
  const base = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
  if (max !== undefined && Number.isFinite(max) && max >= 1) {
    const upper = Math.floor(max);
    return (base > upper ? upper : base) as PositiveInt;
  }
  return base as PositiveInt;
};

/** Whole number >= 0, defaulting to 0 when blank or invalid. */
export const parseNonNegativeInt = (raw: string): NonNegativeInt => {
  const parsed = Number.parseInt(raw, 10);
  return (
    Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  ) as NonNegativeInt;
};

/** Coerce a numeric value (e.g. from DB or arithmetic) into NonNegativeInt. */
export const toNonNegativeInt = (value: number): NonNegativeInt =>
  (Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0) as NonNegativeInt;

/** Strict optional decimal >= 0, or null when blank or invalid. */
export const parseOptionalNonNegative = (
  raw: string,
): NonNegativeNumber | null => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed as NonNegativeNumber;
};

/** Decimal >= 0, defaulting to 0 when blank or invalid. */
export const parseNonNegative = (raw: string): NonNegativeNumber =>
  parseOptionalNonNegative(raw) ?? ZERO;

/** Coerce a computed number (e.g. unitValue * qty) into NonNegativeNumber. */
export const toNonNegative = (value: number): NonNegativeNumber =>
  (Number.isFinite(value) && value > 0 ? value : 0) as NonNegativeNumber;

/** Format a decimal to at most 2 places without trailing zeros. */
export const formatDecimal = (value: number): string =>
  String(Number(value.toFixed(2)));

/** Step an integer text field within [min, max] and return the next text. */
export const stepIntText = (
  raw: string,
  delta: number,
  bounds: { min: number; max?: number },
): string => {
  const parsed = Number.parseInt(raw, 10);
  const current = Number.isFinite(parsed) ? parsed : bounds.min;
  const next = current + delta;
  const lower = next < bounds.min ? bounds.min : next;
  const clamped =
    bounds.max !== undefined && bounds.max >= bounds.min && lower > bounds.max
      ? bounds.max
      : lower;
  return String(clamped);
};

/** Step a decimal text field with a lower bound and return formatted text. */
export const stepDecimalText = (
  raw: string,
  delta: number,
  min = 0,
): string => {
  const parsed = Number.parseFloat(raw);
  const current = Number.isFinite(parsed) ? parsed : min;
  const next = current + delta;
  return formatDecimal(next < min ? min : next);
};
