/**
 * All amounts in application state are integer minor units (rupees x 100).
 *
 * Nothing in this module (or in the split calculation it feeds) uses floating
 * point arithmetic on money. Parsing goes straight from the decimal *string* to
 * integers, because `Math.round(parseFloat(x) * 100)` is not exact: 2.675 * 100
 * evaluates to 267.4999... and rounds to 267, a cent short.
 */

/**
 * Upper bound on a single expense, in minor units (Rs. 10,000,000,000.00).
 *
 * The split calculator computes `totalMinor * weight` as an intermediate, where
 * weight is at most 10000 (basis points). This ceiling keeps that product below
 * Number.MAX_SAFE_INTEGER (9.007e15) with several orders of magnitude to spare,
 * so integer arithmetic stays exact.
 */
export const MAX_AMOUNT_MINOR = 1_000_000_000_000;

export interface ParseResult {
  ok: boolean;
  minor?: number;
  error?: string;
}

const AMOUNT_PATTERN = /^-?\d+(\.\d+)?$/;

/**
 * Parses a decimal rupee string into integer minor units, exactly.
 *
 * Rejects more than 2 decimal places rather than silently rounding away
 * sub-cent precision the user typed (an `<input step="0.01">` does not stop
 * someone entering "0.006").
 */
export function parseAmountToMinor(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'Enter an amount.' };
  if (!AMOUNT_PATTERN.test(trimmed)) return { ok: false, error: 'Enter a valid number.' };

  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [whole, fraction = ''] = unsigned.split('.');

  if (fraction.length > 2) {
    return { ok: false, error: 'Amounts can have at most 2 decimal places.' };
  }

  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor)) return { ok: false, error: 'Amount is too large.' };
  if (minor > MAX_AMOUNT_MINOR) return { ok: false, error: 'Amount is too large.' };

  return { ok: true, minor: negative ? -minor : minor };
}

/** Percentages are stored as integer basis points: 10000 bp = 100%. */
export const BP_TOTAL = 10_000;

const PERCENT_PATTERN = /^\d+(\.\d+)?$/;

/**
 * Parses a percentage string into integer basis points, exactly.
 *
 * Storing basis points instead of floats is what lets the split validator
 * require an exact sum of 10000 - a float comparison against 100 would need an
 * epsilon, and any epsilon lets a split that doesn't quite add up through, at
 * which point the allocator would silently renormalize it to the full amount.
 */
export function parsePercentToBp(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'Enter a percentage.' };
  if (!PERCENT_PATTERN.test(trimmed)) return { ok: false, error: 'Enter a valid percentage.' };

  const [whole, fraction = ''] = trimmed.split('.');
  if (fraction.length > 2) {
    return { ok: false, error: 'Percentages can have at most 2 decimal places.' };
  }

  const bp = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(bp)) return { ok: false, error: 'Percentage is too large.' };

  return { ok: true, minor: bp };
}

export function bpToPercentString(bp: number): string {
  const sign = bp < 0 ? '-' : '';
  const abs = Math.abs(bp);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** Formats minor units as a decimal rupee string, e.g. 333334 -> "3333.34". */
export function minorToRupeeString(minor: number): string {
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

export function formatMinor(minor: number): string {
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  const whole = Math.floor(abs / 100);
  const cents = String(abs % 100).padStart(2, '0');
  return `${sign}Rs. ${whole.toLocaleString('en-US')}.${cents}`;
}
