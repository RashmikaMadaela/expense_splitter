import { describe, it, expect } from 'vitest';
import { appReducer } from '../appReducer';
import { computeBalances } from '../../lib/balances';
import type { AppState, Expense } from '../../types';

const dinner: Expense = {
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

const baseState: AppState = {
  people: [
    { id: 'alice', name: 'Alice', createdAt: 0 },
    { id: 'bob', name: 'Bob', createdAt: 0 },
    { id: 'carol', name: 'Carol', createdAt: 0 },
  ],
  expenses: [dinner],
};

describe('ADD_PERSON', () => {
  it('adds a trimmed name', () => {
    const next = appReducer({ people: [], expenses: [] }, { type: 'ADD_PERSON', name: '  Alice ' });
    expect(next.people).toHaveLength(1);
    expect(next.people[0].name).toBe('Alice');
  });

  it('ignores an empty name', () => {
    const state = { people: [], expenses: [] };
    expect(appReducer(state, { type: 'ADD_PERSON', name: '   ' })).toBe(state);
  });

  it('rejects a duplicate name regardless of case', () => {
    const next = appReducer(baseState, { type: 'ADD_PERSON', name: 'alice' });
    expect(next).toBe(baseState);
  });
});

describe('RENAME_PERSON', () => {
  it('renames without touching ids, so balances still resolve', () => {
    const before = computeBalances(baseState.people, baseState.expenses);
    const next = appReducer(baseState, { type: 'RENAME_PERSON', personId: 'alice', name: 'Alicia' });

    expect(next.people.find((p) => p.id === 'alice')!.name).toBe('Alicia');
    expect(computeBalances(next.people, next.expenses)).toEqual(before);
  });

  it('allows a person to keep their own name', () => {
    const next = appReducer(baseState, { type: 'RENAME_PERSON', personId: 'alice', name: 'Alice' });
    expect(next.people.find((p) => p.id === 'alice')!.name).toBe('Alice');
  });

  it('rejects renaming onto another person\'s name', () => {
    expect(appReducer(baseState, { type: 'RENAME_PERSON', personId: 'alice', name: 'Bob' })).toBe(
      baseState,
    );
  });

  it('rejects an empty name', () => {
    expect(appReducer(baseState, { type: 'RENAME_PERSON', personId: 'alice', name: '  ' })).toBe(
      baseState,
    );
  });
});

describe('REMOVE_PERSON', () => {
  it('removes someone not referenced by any expense', () => {
    const next = appReducer(baseState, { type: 'REMOVE_PERSON', personId: 'carol' });
    expect(next.people.map((p) => p.id)).toEqual(['alice', 'bob']);
  });

  it('refuses to remove someone still referenced, leaving state untouched', () => {
    expect(appReducer(baseState, { type: 'REMOVE_PERSON', personId: 'alice' })).toBe(baseState);
    expect(appReducer(baseState, { type: 'REMOVE_PERSON', personId: 'bob' })).toBe(baseState);
  });

  it('allows removal once the blocking expense is deleted', () => {
    const cleared = appReducer(baseState, { type: 'DELETE_EXPENSE', expenseId: 'e1' });
    const next = appReducer(cleared, { type: 'REMOVE_PERSON', personId: 'alice' });
    expect(next.people.map((p) => p.id)).toEqual(['bob', 'carol']);
  });
});

describe('CLEAR_ALL', () => {
  it('empties both people and expenses', () => {
    const next = appReducer(baseState, { type: 'CLEAR_ALL' });
    expect(next).toEqual({ people: [], expenses: [] });
  });

  it('is safe to run on already-empty state', () => {
    expect(appReducer({ people: [], expenses: [] }, { type: 'CLEAR_ALL' })).toEqual({
      people: [],
      expenses: [],
    });
  });

  it('leaves no balances behind', () => {
    const next = appReducer(baseState, { type: 'CLEAR_ALL' });
    expect(computeBalances(next.people, next.expenses)).toEqual({});
  });
});

describe('expense invariant guard', () => {
  it('throws when shares do not account for the total', () => {
    const bad = { ...dinner, id: 'e2', shares: [{ personId: 'alice', amountMinor: 400 }] };
    expect(() => appReducer(baseState, { type: 'ADD_EXPENSE', expense: bad })).toThrow(
      /Invariant violation/,
    );
  });
});
