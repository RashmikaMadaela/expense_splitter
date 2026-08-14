import { describe, it, expect } from 'vitest';
import { computeShares } from '../splitCalculator';

const sum = (shares: { amountMinor: number }[]) => shares.reduce((a, s) => a + s.amountMinor, 0);

describe('computeShares - equal split', () => {
  it('splits evenly divisible amounts exactly', () => {
    const shares = computeShares({
      totalAmountMinor: 1_200_000, // Rs 12,000
      splitType: 'equal',
      participantIds: ['alice', 'bob', 'carol', 'dave'],
    });
    expect(shares.map((s) => s.amountMinor)).toEqual([300_000, 300_000, 300_000, 300_000]);
    expect(sum(shares)).toBe(1_200_000);
  });

  it('distributes an indivisible amount so it still totals exactly', () => {
    // Rs 100 / 3 -> 3333.33, 3333.33, 3333.34
    const shares = computeShares({
      totalAmountMinor: 10_000,
      splitType: 'equal',
      participantIds: ['alice', 'bob', 'carol'],
    });
    expect(sum(shares)).toBe(10_000);
    expect(shares.map((s) => s.amountMinor).sort()).toEqual([3333, 3333, 3334]);
  });

  it('gives the leftover to the first participant when unseeded', () => {
    const shares = computeShares({
      totalAmountMinor: 10_000,
      splitType: 'equal',
      participantIds: ['alice', 'bob', 'carol'],
    });
    expect(shares.map((s) => s.amountMinor)).toEqual([3334, 3333, 3333]);
  });

  it('handles a single participant taking the full amount', () => {
    const shares = computeShares({
      totalAmountMinor: 5000,
      splitType: 'equal',
      participantIds: ['alice'],
    });
    expect(shares).toEqual([{ personId: 'alice', amountMinor: 5000 }]);
  });

  it('handles remainder = n-1', () => {
    const shares = computeShares({
      totalAmountMinor: 11,
      splitType: 'equal',
      participantIds: ['a', 'b', 'c', 'd'],
    });
    expect(sum(shares)).toBe(11);
    expect(shares.map((s) => s.amountMinor)).toEqual([3, 3, 3, 2]);
  });
});

describe('computeShares - remainder rotation', () => {
  it('is deterministic for a given seed', () => {
    const run = () =>
      computeShares({
        totalAmountMinor: 10_000,
        splitType: 'equal',
        participantIds: ['alice', 'bob', 'carol'],
        rotationSeed: 'expense-1',
      });
    expect(run()).toEqual(run());
  });

  it('still totals exactly regardless of seed', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const shares = computeShares({
        totalAmountMinor: 10_000,
        splitType: 'equal',
        participantIds: ['alice', 'bob', 'carol'],
        rotationSeed: seed,
      });
      expect(sum(shares)).toBe(10_000);
    }
  });

  it('does not always hand the leftover to the same participant', () => {
    const winners = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const shares = computeShares({
        totalAmountMinor: 10_000,
        splitType: 'equal',
        participantIds: ['alice', 'bob', 'carol'],
        rotationSeed: `expense-${i}`,
      });
      const max = Math.max(...shares.map((s) => s.amountMinor));
      winners.add(shares.find((s) => s.amountMinor === max)!.personId);
    }
    expect(winners.size).toBeGreaterThan(1);
  });
});

describe('computeShares - percentage split (basis points)', () => {
  it('applies largest-remainder distribution for uneven percentages', () => {
    // Rs 10,000 at 40/30/30
    const shares = computeShares({
      totalAmountMinor: 1_000_000,
      splitType: 'percentage',
      participantIds: ['alice', 'bob', 'dave'],
      percentagesBp: { alice: 4000, bob: 3000, dave: 3000 },
    });
    expect(sum(shares)).toBe(1_000_000);
    expect(shares.map((s) => s.amountMinor)).toEqual([400_000, 300_000, 300_000]);
  });

  it('totals exactly for percentages that do not divide cleanly', () => {
    const shares = computeShares({
      totalAmountMinor: 100,
      splitType: 'percentage',
      participantIds: ['a', 'b', 'c'],
      percentagesBp: { a: 3333, b: 3333, c: 3334 },
    });
    expect(sum(shares)).toBe(100);
  });

  it('ranks by true remainder, not rotation', () => {
    // c has the largest fractional remainder and must win it regardless of seed.
    for (const seed of ['x', 'y', 'z', 'seed-4', 'seed-5']) {
      const shares = computeShares({
        totalAmountMinor: 1000,
        splitType: 'percentage',
        participantIds: ['a', 'b', 'c'],
        percentagesBp: { a: 3000, b: 3000, c: 4000 },
        rotationSeed: seed,
      });
      expect(sum(shares)).toBe(1000);
      expect(shares[2].amountMinor).toBe(400);
    }
  });
});

describe('computeShares - exact split', () => {
  it('passes through user-entered amounts unchanged', () => {
    const shares = computeShares({
      totalAmountMinor: 1_000_000,
      splitType: 'exact',
      participantIds: ['alice', 'bob', 'dave'],
      exactAmountsMinor: { alice: 333_333, bob: 333_333, dave: 333_334 },
    });
    expect(shares.map((s) => s.amountMinor)).toEqual([333_333, 333_333, 333_334]);
    expect(sum(shares)).toBe(1_000_000);
  });

  it('never re-derives - a removed participant is simply absent', () => {
    const shares = computeShares({
      totalAmountMinor: 1_000_000,
      splitType: 'exact',
      participantIds: ['alice', 'bob'],
      exactAmountsMinor: { alice: 400_000, bob: 400_000 },
    });
    expect(sum(shares)).toBe(800_000); // validation is what rejects this
  });
});

describe('computeShares - guards', () => {
  it('throws when there are no participants', () => {
    expect(() =>
      computeShares({ totalAmountMinor: 1000, splitType: 'equal', participantIds: [] }),
    ).toThrow();
  });

  it('throws on a duplicated participant', () => {
    expect(() =>
      computeShares({ totalAmountMinor: 1000, splitType: 'equal', participantIds: ['a', 'a'] }),
    ).toThrow(/twice/);
  });

  it('throws above the supported amount ceiling', () => {
    expect(() =>
      computeShares({
        totalAmountMinor: 1_000_000_000_001,
        splitType: 'equal',
        participantIds: ['a', 'b'],
      }),
    ).toThrow(/maximum/);
  });
});

describe('computeShares - fuzz (integer arithmetic regression net)', () => {
  it('always totals exactly, with no negative share, across random splits', () => {
    let seed = 12345;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };

    for (let t = 0; t < 20_000; t++) {
      const n = 1 + rand(10);
      const participantIds = Array.from({ length: n }, (_, i) => `p${i}`);
      const total = 1 + rand(100_000_000);

      const equal = computeShares({
        totalAmountMinor: total,
        splitType: 'equal',
        participantIds,
        rotationSeed: `seed-${t}`,
      });
      expect(sum(equal)).toBe(total);
      expect(equal.every((s) => s.amountMinor >= 0)).toBe(true);

      // Percentages that sum to exactly 10000 bp.
      const bp: Record<string, number> = {};
      let left = 10_000;
      for (let i = 0; i < n - 1; i++) {
        const take = rand(Math.max(1, Math.floor(left / 2) + 1));
        bp[participantIds[i]] = take;
        left -= take;
      }
      bp[participantIds[n - 1]] = left;

      const pct = computeShares({
        totalAmountMinor: total,
        splitType: 'percentage',
        participantIds,
        percentagesBp: bp,
        rotationSeed: `seed-${t}`,
      });
      expect(sum(pct)).toBe(total);
      expect(pct.every((s) => s.amountMinor >= 0)).toBe(true);
    }
  });
});
