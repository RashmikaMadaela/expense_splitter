import type { PersonId, SplitShare, SplitType } from '../types';
import { MAX_AMOUNT_MINOR } from './money';

export interface ComputeSharesInput {
  totalAmountMinor: number;
  splitType: SplitType;
  /** Order matters: used as the base ordering for remainder distribution. */
  participantIds: PersonId[];
  /** Required for splitType 'exact'. Integer minor units. */
  exactAmountsMinor?: Record<PersonId, number>;
  /** Required for splitType 'percentage'. Integer basis points, summing to 10000. */
  percentagesBp?: Record<PersonId, number>;
  /**
   * Expense id. Hashed to rotate which participant absorbs the leftover minor
   * unit, so the same person doesn't eat the extra cent on every single split.
   */
  rotationSeed?: string;
}

/** FNV-1a. Any stable string->int hash works; this one is short and dependency-free. */
function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * Largest-Remainder (Hamilton apportionment), in exact integer arithmetic.
 *
 * Distributes `totalMinor` across participants in proportion to `weights`,
 * guaranteeing the shares sum to exactly `totalMinor`. Every participant gets
 * floor(total * weight / totalWeight); the leftover minor units go to whoever
 * was rounded down the most.
 *
 * There is deliberately no floating point here. Computing shares as
 * `total * w / totalWeight` in floats and comparing fractional parts gives a
 * different participant the extra cent roughly once in every 13,000 splits,
 * because the float fraction is not the true remainder. Integer division plus
 * `%` gives the exact remainder, so the ordering is exactly right and fully
 * deterministic. Requires integer weights, which is why percentages are stored
 * as basis points rather than decimals.
 */
function distributeByWeights(
  totalMinor: number,
  participantIds: PersonId[],
  weights: number[],
  rotationSeed?: string,
): number[] {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight <= 0) {
    throw new Error('Split weights must sum to a positive number');
  }
  if (weights.some((w) => w < 0)) {
    throw new Error('Split weights must not be negative');
  }
  if (totalMinor < 0) {
    throw new Error('Split total must not be negative');
  }
  if (totalMinor > MAX_AMOUNT_MINOR) {
    throw new Error('Split total exceeds the maximum supported amount');
  }

  const n = participantIds.length;
  const shares: number[] = new Array(n);
  const remainders: number[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const numerator = totalMinor * weights[i];
    const rem = numerator % totalWeight;
    remainders[i] = rem;
    shares[i] = (numerator - rem) / totalWeight;
  }

  let leftover = totalMinor - shares.reduce((a, b) => a + b, 0);

  // Rotate the base ordering so the leftover unit doesn't always land on the
  // same participant. Applied only as the tie-break: a larger true remainder
  // always outranks rotation, so proportional splits stay correct and only
  // genuine ties (every equal split) actually rotate.
  const offset = rotationSeed ? hashSeed(rotationSeed) % n : 0;
  const rotatedRank = (i: number) => (i - offset + n * 2) % n;

  const order = participantIds
    .map((_, i) => i)
    .sort((a, b) => remainders[b] - remainders[a] || rotatedRank(a) - rotatedRank(b));

  for (let k = 0; k < order.length && leftover > 0; k++) {
    shares[order[k]] += 1;
    leftover -= 1;
  }

  return shares;
}

export function computeShares(input: ComputeSharesInput): SplitShare[] {
  const { totalAmountMinor, splitType, participantIds, rotationSeed } = input;

  if (participantIds.length === 0) {
    throw new Error('An expense must have at least one participant');
  }
  if (new Set(participantIds).size !== participantIds.length) {
    throw new Error('An expense must not list the same participant twice');
  }

  if (splitType === 'equal') {
    const weights = participantIds.map(() => 1);
    const amounts = distributeByWeights(totalAmountMinor, participantIds, weights, rotationSeed);
    return participantIds.map((personId, i) => ({ personId, amountMinor: amounts[i] }));
  }

  if (splitType === 'percentage') {
    if (!input.percentagesBp) throw new Error('Percentages are required for a percentage split');
    const weights = participantIds.map((id) => input.percentagesBp![id] ?? 0);
    const amounts = distributeByWeights(totalAmountMinor, participantIds, weights, rotationSeed);
    return participantIds.map((personId, i) => ({ personId, amountMinor: amounts[i] }));
  }

  if (splitType === 'exact') {
    if (!input.exactAmountsMinor) throw new Error('Exact amounts are required for an exact split');
    // No apportionment: the user's literal entries are the shares. Validation
    // is what guarantees they sum to the total.
    return participantIds.map((personId) => ({
      personId,
      amountMinor: input.exactAmountsMinor![personId] ?? 0,
    }));
  }

  throw new Error(`Unknown split type: ${splitType satisfies never}`);
}
