import { describe, it, expect } from 'vitest';
import { checkExpenseInvariants, checkLoadedState } from '../invariants';
import { validateExactSplit, validatePercentageSplit } from '../validation';
import type { Expense } from '../../types';

const validExpense: Expense = {
  id: 'e1',
  description: 'Dinner',
  totalAmountMinor: 1000,
  paidBy: 'alice',
  participantIds: ['alice', 'bob'],
  splitType: 'equal',
  shares: [
    { personId: 'alice', amountMinor: 500 },
    { personId: 'bob', amountMinor: 500 },
  ],
  createdAt: 0,
  updatedAt: 0,
};

describe('checkExpenseInvariants', () => {
  it('accepts a well-formed expense', () => {
    expect(checkExpenseInvariants(validExpense)).toBeNull();
  });

  it('rejects shares that do not sum to the total', () => {
    const bad = { ...validExpense, shares: [{ personId: 'alice', amountMinor: 400 }] };
    expect(checkExpenseInvariants(bad)).toMatch(/sum to/);
  });

  it('rejects shares that do not match the participant list', () => {
    const bad = {
      ...validExpense,
      shares: [
        { personId: 'alice', amountMinor: 500 },
        { personId: 'carol', amountMinor: 500 },
      ],
    };
    expect(checkExpenseInvariants(bad)).toMatch(/participant list/);
  });

  it('rejects a duplicated participant in shares', () => {
    const bad = {
      ...validExpense,
      participantIds: ['alice'],
      shares: [
        { personId: 'alice', amountMinor: 500 },
        { personId: 'alice', amountMinor: 500 },
      ],
    };
    expect(checkExpenseInvariants(bad)).toMatch(/[Dd]uplicate/);
  });

  it('rejects non-integer and non-positive totals', () => {
    expect(checkExpenseInvariants({ ...validExpense, totalAmountMinor: 0 })).toMatch(/positive/);
    expect(checkExpenseInvariants({ ...validExpense, totalAmountMinor: 10.5 })).toMatch(/positive/);
  });
});

describe('checkLoadedState', () => {
  const good = {
    people: [
      { id: 'alice', name: 'Alice', createdAt: 0 },
      { id: 'bob', name: 'Bob', createdAt: 0 },
    ],
    expenses: [validExpense],
  };

  it('accepts well-formed state', () => {
    expect(checkLoadedState(good)).toBeNull();
  });

  it('rejects non-objects and missing collections', () => {
    expect(checkLoadedState(null)).toBeTruthy();
    expect(checkLoadedState('nope')).toBeTruthy();
    expect(checkLoadedState({ people: [] })).toBeTruthy();
  });

  it('rejects an expense referencing an unknown payer', () => {
    const bad = { ...good, expenses: [{ ...validExpense, paidBy: 'ghost' }] };
    expect(checkLoadedState(bad)).toMatch(/unknown payer/);
  });

  it('rejects an expense referencing an unknown participant', () => {
    const bad = {
      ...good,
      expenses: [
        {
          ...validExpense,
          participantIds: ['alice', 'ghost'],
          shares: [
            { personId: 'alice', amountMinor: 500 },
            { personId: 'ghost', amountMinor: 500 },
          ],
        },
      ],
    };
    expect(checkLoadedState(bad)).toMatch(/unknown participant/);
  });

  it('rejects tampered share amounts', () => {
    const bad = {
      ...good,
      expenses: [
        {
          ...validExpense,
          shares: [
            { personId: 'alice', amountMinor: 900 },
            { personId: 'bob', amountMinor: 500 },
          ],
        },
      ],
    };
    expect(checkLoadedState(bad)).toMatch(/sum to/);
  });

  it('rejects duplicate person ids', () => {
    const bad = { ...good, people: [...good.people, good.people[0]] };
    expect(checkLoadedState(bad)).toMatch(/[Dd]uplicate/);
  });
});

describe('split validation', () => {
  it('accepts percentages summing to exactly 100%', () => {
    expect(validatePercentageSplit({ a: 3333, b: 3333, c: 3334 }, ['a', 'b', 'c']).valid).toBe(true);
  });

  it('rejects 99.99% instead of silently renormalising it to the full amount', () => {
    const result = validatePercentageSplit({ a: 3333, b: 3333, c: 3333 }, ['a', 'b', 'c']);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/99\.99/);
  });

  it('rejects 100.01%', () => {
    expect(validatePercentageSplit({ a: 5000, b: 5001 }, ['a', 'b']).valid).toBe(false);
  });

  it('accepts exact amounts that sum to the total and rejects those that do not', () => {
    expect(
      validateExactSplit(1_000_000, { a: 333_333, b: 333_333, c: 333_334 }, ['a', 'b', 'c']).valid,
    ).toBe(true);
    expect(validateExactSplit(1_000_000, { a: 400_000, b: 400_000 }, ['a', 'b']).valid).toBe(false);
  });
});
