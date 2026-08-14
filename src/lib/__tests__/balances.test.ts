import { describe, it, expect } from 'vitest';
import { computeBalances, countNaivePairwiseDebts } from '../balances';
import { computeShares } from '../splitCalculator';
import type { Expense, Person } from '../../types';

const people: Person[] = [
  { id: 'alice', name: 'Alice', createdAt: 0 },
  { id: 'bob', name: 'Bob', createdAt: 0 },
  { id: 'carol', name: 'Carol', createdAt: 0 },
  { id: 'dave', name: 'Dave', createdAt: 0 },
];

let counter = 0;
function makeExpense(partial: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'shares'>): Expense {
  const id = `expense-${counter++}`;
  const shares = computeShares({
    totalAmountMinor: partial.totalAmountMinor,
    splitType: partial.splitType,
    participantIds: partial.participantIds,
    exactAmountsMinor: partial.rawExactInputsMinor,
    percentagesBp: partial.rawPercentageBp,
    rotationSeed: id,
  });
  return { ...partial, id, createdAt: 0, updatedAt: 0, shares };
}

const acceptanceExpenses: Expense[] = [
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

describe('computeBalances - spec acceptance scenario', () => {
  it('produces the hand-verified final balances', () => {
    const balances = computeBalances(people, acceptanceExpenses);
    expect(balances.alice).toBe(566_667);
    expect(balances.bob).toBe(-933_333);
    expect(balances.carol).toBe(700_000);
    expect(balances.dave).toBe(-333_334);
  });

  it('sums to exactly zero', () => {
    const balances = computeBalances(people, acceptanceExpenses);
    expect(Object.values(balances).reduce((a, b) => a + b, 0)).toBe(0);
  });
});

describe('computeBalances - edge cases', () => {
  it('returns all-zero balances when there are no expenses', () => {
    const balances = computeBalances(people, []);
    expect(Object.values(balances).every((b) => b === 0)).toBe(true);
  });

  it('leaves a person uninvolved in any expense at zero', () => {
    const expenses = [
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

  it('ignores unknown person ids instead of producing NaN or phantom keys', () => {
    const rogue: Expense = {
      id: 'rogue',
      description: 'Corrupted',
      totalAmountMinor: 1000,
      paidBy: 'ghost',
      participantIds: ['alice', 'bob'],
      splitType: 'equal',
      shares: [
        { personId: 'alice', amountMinor: 500 },
        { personId: 'phantom', amountMinor: 500 },
      ],
      createdAt: 0,
      updatedAt: 0,
    };

    const balances = computeBalances(people, [rogue]);
    expect(Object.keys(balances).sort()).toEqual(['alice', 'bob', 'carol', 'dave']);
    expect(Object.values(balances).every((b) => Number.isFinite(b))).toBe(true);
    expect(balances.alice).toBe(-500);
  });
});

describe('countNaivePairwiseDebts', () => {
  it('counts 6 net pairwise debts for the acceptance scenario', () => {
    expect(countNaivePairwiseDebts(acceptanceExpenses)).toBe(6);
  });

  it('is zero when there are no expenses', () => {
    expect(countNaivePairwiseDebts([])).toBe(0);
  });

  it('nets opposing debts between the same pair off against each other', () => {
    const expenses = [
      makeExpense({
        description: 'A pays',
        totalAmountMinor: 1000,
        paidBy: 'alice',
        participantIds: ['bob'],
        splitType: 'equal',
      }),
      makeExpense({
        description: 'B pays back',
        totalAmountMinor: 1000,
        paidBy: 'bob',
        participantIds: ['alice'],
        splitType: 'equal',
      }),
    ];
    expect(countNaivePairwiseDebts(expenses)).toBe(0);
  });
});
