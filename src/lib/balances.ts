import type { Expense, Person, PersonId } from '../types';

/**
 * Always a full recompute from source data (people + expenses), never incremental
 * patching — this avoids an entire class of drift bugs when expenses are edited or
 * deleted. Positive balance = net owed to that person; negative = they owe the group.
 */
export function computeBalances(
  people: Person[],
  expenses: Expense[],
): Record<PersonId, number> {
  const balances: Record<PersonId, number> = {};
  for (const person of people) {
    balances[person.id] = 0;
  }

  for (const expense of expenses) {
    balances[expense.paidBy] += expense.totalAmountMinor;
    for (const share of expense.shares) {
      balances[share.personId] -= share.amountMinor;
    }
  }

  return balances;
}
