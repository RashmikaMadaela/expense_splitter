import type { PersonId, SplitShare, SplitType } from '../types';

export interface ComputeSharesInput {
  totalAmountMinor: number;
  splitType: SplitType;
  /** Order matters: for 'equal' splits this order is also the remainder tie-break order. */
  participantIds: PersonId[];
  /** Required for splitType 'exact'. Values are integer minor units, already summing to totalAmountMinor. */
  exactAmountsMinor?: Record<PersonId, number>;
  /** Required for splitType 'percentage'. Values sum to ~100. */
  percentages?: Record<PersonId, number>;
}

/**
 * Largest-Remainder (Hamilton apportionment) method: distributes totalMinor across
 * participants proportional to `weights`, guaranteeing the returned shares sum to
 * exactly totalMinor. Leftover minor units go to whoever was rounded down the most,
 * tie-broken by participant order — this is what makes an equal 3-way split of a
 * non-divisible amount give the extra unit(s) to the earliest participant(s) in the list.
 */
function distributeByWeights(
  totalMinor: number,
  participantIds: PersonId[],
  weights: number[],
): number[] {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight <= 0) {
    throw new Error('Split weights must sum to a positive number');
  }

  const rawShares = weights.map((w) => (totalMinor * w) / totalWeight);
  const floorShares = rawShares.map((s) => Math.floor(s));
  const distributed = floorShares.reduce((a, b) => a + b, 0);
  let remainder = totalMinor - distributed;

  const order = participantIds
    .map((_, i) => i)
    .sort((a, b) => {
      const fracDiff = rawShares[b] - floorShares[b] - (rawShares[a] - floorShares[a]);
      if (fracDiff !== 0) return fracDiff;
      return a - b;
    });

  const finalShares = [...floorShares];
  for (let k = 0; k < order.length && remainder > 0; k++) {
    finalShares[order[k]] += 1;
    remainder -= 1;
  }

  return finalShares;
}

export function computeShares(input: ComputeSharesInput): SplitShare[] {
  const { totalAmountMinor, splitType, participantIds } = input;

  if (participantIds.length === 0) {
    throw new Error('An expense must have at least one participant');
  }

  if (splitType === 'equal') {
    const weights = participantIds.map(() => 1);
    const amounts = distributeByWeights(totalAmountMinor, participantIds, weights);
    return participantIds.map((personId, i) => ({ personId, amountMinor: amounts[i] }));
  }

  if (splitType === 'percentage') {
    if (!input.percentages) throw new Error('Percentages are required for a percentage split');
    const weights = participantIds.map((id) => input.percentages![id] ?? 0);
    const amounts = distributeByWeights(totalAmountMinor, participantIds, weights);
    return participantIds.map((personId, i) => ({ personId, amountMinor: amounts[i] }));
  }

  if (splitType === 'exact') {
    if (!input.exactAmountsMinor) throw new Error('Exact amounts are required for an exact split');
    return participantIds.map((personId) => ({
      personId,
      amountMinor: input.exactAmountsMinor![personId] ?? 0,
    }));
  }

  throw new Error(`Unknown split type: ${splitType satisfies never}`);
}
