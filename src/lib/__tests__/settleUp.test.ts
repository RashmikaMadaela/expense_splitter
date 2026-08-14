import { describe, it, expect } from 'vitest';
import { computeSettlement, EXACT_SOLVER_MAX_PEOPLE } from '../settleUp';

/**
 * Independent oracle: the classic recursive "optimal account balancing" search.
 *
 * Deliberately a different algorithm from the bitmask zero-sum partition the
 * implementation uses - testing the DP against itself would prove nothing.
 */
function bruteForceMinTransactions(values: number[]): number {
  const arr = values.filter((v) => v !== 0);

  function solve(start: number): number {
    while (start < arr.length && arr[start] === 0) start++;
    if (start === arr.length) return 0;

    let best = Infinity;
    for (let i = start + 1; i < arr.length; i++) {
      if (arr[i] * arr[start] < 0) {
        arr[i] += arr[start];
        best = Math.min(best, 1 + solve(start + 1));
        arr[i] -= arr[start];
      }
    }
    return best;
  }

  return solve(0);
}

function makeRng(seed: number) {
  let s = seed;
  return (n: number) => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s % n;
  };
}

function randomBalances(rand: (n: number) => number, maxPeople: number) {
  const n = 2 + rand(maxPeople - 1);
  const vals: number[] = [];
  for (let i = 0; i < n - 1; i++) vals.push(rand(21) - 10);
  vals.push(-vals.reduce((a, b) => a + b, 0));
  return vals.filter((v) => v !== 0);
}

function toRecord(vals: number[]): Record<string, number> {
  return Object.fromEntries(vals.map((v, i) => [`p${i}`, v]));
}

describe('computeSettlement - spec acceptance scenario', () => {
  const balances = {
    alice: 566_667,
    bob: -933_333,
    carol: 700_000,
    dave: -333_334,
  };

  it('produces exactly 3 transactions, not a full pairwise list', () => {
    expect(computeSettlement(balances)).toHaveLength(3);
  });

  it('matches the documented trace', () => {
    expect(computeSettlement(balances)).toEqual([
      { from: 'bob', to: 'carol', amountMinor: 700_000 },
      { from: 'dave', to: 'alice', amountMinor: 333_334 },
      { from: 'bob', to: 'alice', amountMinor: 233_333 },
    ]);
  });

  it('is the provable minimum', () => {
    expect(computeSettlement(balances).length).toBe(
      bruteForceMinTransactions(Object.values(balances)),
    );
  });
});

describe('computeSettlement - edge cases', () => {
  it('returns no transactions when everyone is already settled', () => {
    expect(computeSettlement({ alice: 0, bob: 0 })).toEqual([]);
  });

  it('handles an empty group', () => {
    expect(computeSettlement({})).toEqual([]);
  });

  it('produces exactly one transaction for a two-person imbalance', () => {
    expect(computeSettlement({ alice: 500, bob: -500 })).toEqual([
      { from: 'bob', to: 'alice', amountMinor: 500 },
    ]);
  });

  it('throws if balances do not sum to zero', () => {
    expect(() => computeSettlement({ alice: 100, bob: -50 })).toThrow(/sum to zero/);
  });

  it('settles amounts beyond the 32-bit range', () => {
    // Rs 25,000,000 - past the Int32 ceiling of Rs 21,474,836.47.
    const balances = { alice: 2_500_000_000, bob: -1_200_000_000, carol: -1_300_000_000 };
    const tx = computeSettlement(balances);
    const net: Record<string, number> = { alice: 0, bob: 0, carol: 0 };
    for (const t of tx) {
      net[t.from] -= t.amountMinor;
      net[t.to] += t.amountMinor;
    }
    expect(net).toEqual(balances);
    expect(tx.length).toBe(2);
  });
});

describe('computeSettlement - determinism', () => {
  it('does not depend on the order people were added', () => {
    const a = computeSettlement({ alice: 566_667, bob: -933_333, carol: 700_000, dave: -333_334 });
    const b = computeSettlement({ dave: -333_334, carol: 700_000, bob: -933_333, alice: 566_667 });
    expect(a).toEqual(b);
  });

  it('returns identical output for repeated calls', () => {
    const input = { a: 300, b: -100, c: -200 };
    expect(computeSettlement(input)).toEqual(computeSettlement(input));
  });
});

describe('computeSettlement - properties over random instances', () => {
  const rand = makeRng(98765);

  it('is optimal, reconstructs balances, and emits no zero-amount transactions', () => {
    for (let t = 0; t < 3000; t++) {
      const vals = randomBalances(rand, 8);
      if (vals.length < 2) continue;

      const balances = toRecord(vals);
      const tx = computeSettlement(balances);

      // reconstructs every balance exactly
      const net: Record<string, number> = {};
      for (const key of Object.keys(balances)) net[key] = 0;
      for (const t2 of tx) {
        net[t2.from] -= t2.amountMinor;
        net[t2.to] += t2.amountMinor;
      }
      expect(net).toEqual(balances);

      expect(tx.every((t2) => t2.amountMinor > 0)).toBe(true);
      expect(tx.every((t2) => t2.from !== t2.to)).toBe(true);
      expect(tx.length).toBeLessThanOrEqual(vals.length - 1);
      expect(tx.length).toBe(bruteForceMinTransactions(vals));
    }
  });
});

describe('computeSettlement - heuristic fallback beyond the exact threshold', () => {
  const rand = makeRng(24680);

  it('still settles correctly for groups larger than the exact solver bound', () => {
    for (let t = 0; t < 200; t++) {
      const n = EXACT_SOLVER_MAX_PEOPLE + 2 + rand(4);
      const vals: number[] = [];
      for (let i = 0; i < n - 1; i++) vals.push(rand(2001) - 1000);
      vals.push(-vals.reduce((a, b) => a + b, 0));
      const nonZero = vals.filter((v) => v !== 0);
      if (nonZero.length < 2) continue;

      const balances = toRecord(nonZero);
      const tx = computeSettlement(balances);

      const net: Record<string, number> = {};
      for (const key of Object.keys(balances)) net[key] = 0;
      for (const t2 of tx) {
        net[t2.from] -= t2.amountMinor;
        net[t2.to] += t2.amountMinor;
      }
      expect(net).toEqual(balances);
      expect(tx.every((t2) => t2.amountMinor > 0)).toBe(true);
      expect(tx.length).toBeLessThanOrEqual(nonZero.length - 1);
    }
  });
});
