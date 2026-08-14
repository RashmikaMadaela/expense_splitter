import { describe, it, expect } from 'vitest';
import { computeBalances } from '../balances';
import { computeShares } from '../splitCalculator';
import type { Expense, Person } from '../../types';

const people: Person[] = [
  { id: 'alice', name: 'Alice', createdAt: 0 },
  { id: 'bob', name: 'Bob', createdAt: 0 },
  { id: 'carol', name: 'Carol', createdAt: 0 },
  { id: 'dave', name: 'Dave', createdAt: 0 },
];

function makeExpense(partial: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'shares'>): Expense {
  const shares = computeShares({
    totalAmountMinor: partial.totalAmountMinor,
    splitType: partial.splitType,
    participantIds: partial.participantIds,
    exactAmountsMinor: partial.rawExactInputsMinor,
    percentages: partial.rawPercentages,
  });
  return { ...partial, id: crypto.randomUUID(), createdAt: 0, updatedAt: 0, shares };
}

describe('computeBalances - spec acceptance scenario', () => {
  const expenses: Expense[] = [
    makeExpense({
      description: 'Dinner',
      totalAmountMinor: 1_200_000,
      paidBy: 'alice',
      participantIds: ['alice', 'bob', 'carol', 'dave'],
      splitType: 'equal',
    }),
    makeExpense({
      description: 'Hotel',
      totalAmountMinor: 1_000_000,
      paidBy: 'carol',
      participantIds: ['alice', 'bob', 'dave'],
      splitType: 'exact',
      rawExactInputsMinor: { alice: 333_333, bob: 333_333, dave: 333_334 },
    }),
    makeExpense({
      description: 'Gas',
      totalAmountMinor: 600_000,
      paidBy: 'dave',
      participantIds: ['dave', 'bob'],
      splitType: 'equal',
    }),
  ];

  it('produces the hand-verified final balances', () => {
    const balances = computeBalances(people, expenses);
    expect(balances.alice).toBe(566_667);
    expect(balances.bob).toBe(-933_333);
    expect(balances.carol).toBe(700_000);
    expect(balances.dave).toBe(-333_334);
  });

  it('sums to exactly zero', () => {
    const balances = computeBalances(people, expenses);
    const total = Object.values(balances).reduce((a, b) => a + b, 0);
    expect(total).toBe(0);
  });
});

describe('computeBalances - edge cases', () => {
  it('returns all-zero balances when there are no expenses', () => {
    const balances = computeBalances(people, []);
    expect(Object.values(balances).every((b) => b === 0)).toBe(true);
  });

  it('leaves a person uninvolved in any expense at zero', () => {
    const expenses: Expense[] = [
      makeExpense({
        description: 'Coffee',
        totalAmountMinor: 1000,
        paidBy: 'alice',
        participantIds: ['alice', 'bob'],
        splitType: 'equal',
      }),
    ];
    const balances = computeBalances(people, expenses);
    expect(balances.carol).toBe(0);
    expect(balances.dave).toBe(0);
  });
});
