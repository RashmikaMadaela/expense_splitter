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
    expect(shares).toEqual([
      { personId: 'alice', amountMinor: 300_000 },
      { personId: 'bob', amountMinor: 300_000 },
      { personId: 'carol', amountMinor: 300_000 },
      { personId: 'dave', amountMinor: 300_000 },
    ]);
    expect(sum(shares)).toBe(1_200_000);
  });

  it('distributes the remainder to the earliest participants in split order', () => {
    // Rs 100 / 3 people -> 3333, 3333, 3334 in minor units (10000 / 3)
    const shares = computeShares({
      totalAmountMinor: 10_000,
      splitType: 'equal',
      participantIds: ['alice', 'bob', 'carol'],
    });
    expect(sum(shares)).toBe(10_000);
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
    // 11 minor units across 4 people -> 3,3,3,2 style distribution, remainder 3
    const shares = computeShares({
      totalAmountMinor: 11,
      splitType: 'equal',
      participantIds: ['a', 'b', 'c', 'd'],
    });
    expect(sum(shares)).toBe(11);
    expect(shares.map((s) => s.amountMinor)).toEqual([3, 3, 3, 2]);
  });
});

describe('computeShares - percentage split', () => {
  it('applies largest-remainder distribution for uneven percentages', () => {
    // Rs 10,000 at 40/30/30 among Alice, Bob, Dave
    const shares = computeShares({
      totalAmountMinor: 1_000_000,
      splitType: 'percentage',
      participantIds: ['alice', 'bob', 'dave'],
      percentages: { alice: 40, bob: 30, dave: 30 },
    });
    expect(sum(shares)).toBe(1_000_000);
    expect(shares).toEqual([
      { personId: 'alice', amountMinor: 400_000 },
      { personId: 'bob', amountMinor: 300_000 },
      { personId: 'dave', amountMinor: 300_000 },
    ]);
  });

  it('breaks ties deterministically by participant order', () => {
    // 100 minor units split 3 ways equally by percentage (33.33/33.33/33.34-ish weights)
    const shares = computeShares({
      totalAmountMinor: 100,
      splitType: 'percentage',
      participantIds: ['a', 'b', 'c'],
      percentages: { a: 33.33, b: 33.33, c: 33.34 },
    });
    expect(sum(shares)).toBe(100);
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
    expect(shares).toEqual([
      { personId: 'alice', amountMinor: 333_333 },
      { personId: 'bob', amountMinor: 333_333 },
      { personId: 'dave', amountMinor: 333_334 },
    ]);
    expect(sum(shares)).toBe(1_000_000);
  });

  it('does not re-derive or override a mismatched sum (validation is a separate concern)', () => {
    const shares = computeShares({
      totalAmountMinor: 1_000_000,
      splitType: 'exact',
      participantIds: ['alice', 'bob'],
      exactAmountsMinor: { alice: 400_000, bob: 400_000 },
    });
    expect(sum(shares)).toBe(800_000);
  });
});

describe('computeShares - edge cases', () => {
  it('throws when there are no participants', () => {
    expect(() =>
      computeShares({ totalAmountMinor: 1000, splitType: 'equal', participantIds: [] }),
    ).toThrow();
  });
});
