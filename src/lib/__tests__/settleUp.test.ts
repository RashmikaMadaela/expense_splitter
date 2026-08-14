import { describe, it, expect } from 'vitest';
import { computeSettlement } from '../settleUp';

describe('computeSettlement - spec acceptance scenario', () => {
  const balances = {
    alice: 566_667,
    bob: -933_333,
    carol: 700_000,
    dave: -333_334,
  };

  it('produces exactly 3 transactions, not a full pairwise list', () => {
    const transactions = computeSettlement(balances);
    expect(transactions).toHaveLength(3);
  });

  it('matches the hand-worked greedy trace', () => {
    const transactions = computeSettlement(balances);
    expect(transactions).toEqual([
      { from: 'bob', to: 'carol', amountMinor: 700_000 },
      { from: 'dave', to: 'alice', amountMinor: 333_334 },
      { from: 'bob', to: 'alice', amountMinor: 233_333 },
    ]);
  });

  it('never exceeds N-1 transactions for N people', () => {
    const transactions = computeSettlement(balances);
    expect(transactions.length).toBeLessThanOrEqual(Object.keys(balances).length - 1);
  });

  it('reconstructs each person\'s original balance from their transactions', () => {
    const transactions = computeSettlement(balances);
    const net: Record<string, number> = { alice: 0, bob: 0, carol: 0, dave: 0 };
    for (const t of transactions) {
      net[t.from] -= t.amountMinor;
      net[t.to] += t.amountMinor;
    }
    expect(net).toEqual(balances);
  });
});

describe('computeSettlement - edge cases', () => {
  it('returns no transactions when everyone is already settled', () => {
    expect(computeSettlement({ alice: 0, bob: 0 })).toEqual([]);
  });

  it('produces exactly one transaction for a two-person imbalance', () => {
    const transactions = computeSettlement({ alice: 500, bob: -500 });
    expect(transactions).toEqual([{ from: 'bob', to: 'alice', amountMinor: 500 }]);
  });

  it('never emits a zero-amount transaction', () => {
    const transactions = computeSettlement({ alice: 566_667, bob: -933_333, carol: 700_000, dave: -333_334 });
    expect(transactions.every((t) => t.amountMinor > 0)).toBe(true);
  });
});
