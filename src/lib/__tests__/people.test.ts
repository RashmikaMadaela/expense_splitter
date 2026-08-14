import { describe, it, expect } from 'vitest';
import { isPersonReferenced, countPersonExpenses, isDuplicateName } from '../people';
import type { Expense, Person } from '../../types';

function expense(partial: Partial<Expense>): Expense {
  return {
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
    ...partial,
  };
}

describe('isPersonReferenced', () => {
  it('detects the payer', () => {
    const e = expense({ paidBy: 'carol', participantIds: ['alice'], shares: [{ personId: 'alice', amountMinor: 1000 }] });
    expect(isPersonReferenced([e], 'carol')).toBe(true);
  });

  it('detects a participant', () => {
    expect(isPersonReferenced([expense({})], 'bob')).toBe(true);
  });

  it('detects a share holder even if not listed as a participant', () => {
    const e = expense({
      participantIds: ['alice'],
      shares: [
        { personId: 'alice', amountMinor: 500 },
        { personId: 'dave', amountMinor: 500 },
      ],
    });
    expect(isPersonReferenced([e], 'dave')).toBe(true);
  });

  it('returns false for someone uninvolved', () => {
    expect(isPersonReferenced([expense({})], 'carol')).toBe(false);
  });

  it('returns false when there are no expenses', () => {
    expect(isPersonReferenced([], 'alice')).toBe(false);
  });
});

describe('countPersonExpenses', () => {
  it('counts every expense involving the person', () => {
    const expenses = [expense({ id: 'e1' }), expense({ id: 'e2' }), expense({ id: 'e3', paidBy: 'carol', participantIds: ['carol'], shares: [{ personId: 'carol', amountMinor: 1000 }] })];
    expect(countPersonExpenses(expenses, 'alice')).toBe(2);
    expect(countPersonExpenses(expenses, 'carol')).toBe(1);
    expect(countPersonExpenses(expenses, 'zoe')).toBe(0);
  });

  it('counts an expense once even when the person is both payer and participant', () => {
    expect(countPersonExpenses([expense({})], 'alice')).toBe(1);
  });
});

describe('isDuplicateName', () => {
  const people: Person[] = [
    { id: 'a', name: 'Alice', createdAt: 0 },
    { id: 'b', name: 'Bob', createdAt: 0 },
  ];

  it('matches case-insensitively', () => {
    expect(isDuplicateName(people, 'alice')).toBe(true);
    expect(isDuplicateName(people, 'ALICE')).toBe(true);
  });

  it('ignores surrounding whitespace', () => {
    expect(isDuplicateName(people, '  Alice  ')).toBe(true);
  });

  it('allows a genuinely new name', () => {
    expect(isDuplicateName(people, 'Carol')).toBe(false);
  });

  it('excludes the person being renamed, so keeping their own name is allowed', () => {
    expect(isDuplicateName(people, 'Alice', 'a')).toBe(false);
    expect(isDuplicateName(people, 'Bob', 'a')).toBe(true);
  });

  it('treats an empty name as not a duplicate (handled by its own validation)', () => {
    expect(isDuplicateName(people, '   ')).toBe(false);
  });
});
