import type { PersonId } from '../types';
import { formatMinor } from './money';

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

const PERCENTAGE_EPSILON = 0.01;

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

export function validatePercentageSplit(
  percentages: Record<PersonId, number>,
  participantIds: PersonId[],
): ValidationResult {
  const sum = participantIds.reduce((acc, id) => acc + (percentages[id] ?? 0), 0);
  if (Math.abs(sum - 100) <= PERCENTAGE_EPSILON) return { valid: true };

  return {
    valid: false,
    message: `Percentages total ${sum.toFixed(2)}%, need 100%`,
  };
}
