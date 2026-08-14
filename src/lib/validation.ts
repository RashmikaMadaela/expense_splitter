import type { PersonId } from '../types';
import { BP_TOTAL, bpToPercentString, formatMinor } from './money';

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function validateExactSplit(
  totalAmountMinor: number,
  exactAmountsMinor: Record<PersonId, number>,
  participantIds: PersonId[],
): ValidationResult {
  const sum = participantIds.reduce((acc, id) => acc + (exactAmountsMinor[id] ?? 0), 0);
  if (sum === totalAmountMinor) return { valid: true };

  const diff = totalAmountMinor - sum;
  const direction = diff > 0 ? 'short' : 'over';
  return {
    valid: false,
    message: `Shares total ${formatMinor(sum)}, expense is ${formatMinor(totalAmountMinor)} (${direction} by ${formatMinor(Math.abs(diff))})`,
  };
}

/**
 * Percentages must sum to exactly 100%.
 *
 * Because they're stored as integer basis points this is an exact integer
 * comparison, with no epsilon. That matters: allowing a near-miss (say 99.99%)
 * would let it through to the allocator, which apportions by relative weight
 * and would quietly scale the split back up to the full expense amount - the
 * user would be charged 100% while believing they'd entered 99.99%.
 */
export function validatePercentageSplit(
  percentagesBp: Record<PersonId, number>,
  participantIds: PersonId[],
): ValidationResult {
  const sum = participantIds.reduce((acc, id) => acc + (percentagesBp[id] ?? 0), 0);
  if (sum === BP_TOTAL) return { valid: true };

  const diff = BP_TOTAL - sum;
  const direction = diff > 0 ? 'short' : 'over';
  return {
    valid: false,
    message: `Percentages total ${bpToPercentString(sum)}%, need 100% (${direction} by ${bpToPercentString(Math.abs(diff))}%)`,
  };
}
