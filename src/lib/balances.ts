import type { Expense, Person, PersonId } from '../types';

/**
 * Net balance per person, always recomputed in full from the expense log.
 *
 * Never patched incrementally: recomputing from source means an edit or delete
 * cannot leave balances subtly out of step with the expenses that produced
 * them. Positive = owed money, negative = owes the group.
 *
 * Ids not present in `people` are ignored rather than accumulated. Writing
 * `balances[unknownId] += n` would evaluate `undefined + n` to NaN *and* add a
 * phantom key, so a single bad reference (from hand-edited or corrupted
 * storage) would turn every balance and the settlement into NaN. Storage
 * validation is the real defence; this keeps the blast radius at zero either
 * way.
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
    if (expense.paidBy in balances) {
      balances[expense.paidBy] += expense.totalAmountMinor;
    }
    for (const share of expense.shares) {
      if (share.personId in balances) {
        balances[share.personId] -= share.amountMinor;
      }
    }
  }

  return balances;
}

/** Total logged across all expenses, in minor units. */
export function computeTotalSpent(expenses: Expense[]): number {
  return expenses.reduce((acc, e) => acc + e.totalAmountMinor, 0);
}

/**
 * How many payments a naive "everyone settles directly with whoever paid"
 * approach would need, after netting each pair off against each other.
 *
 * Only used to show what the settle-up optimisation actually buys.
 */
export function countNaivePairwiseDebts(expenses: Expense[]): number {
  const pairs = new Map<string, number>();

  for (const expense of expenses) {
    for (const share of expense.shares) {
      if (share.personId === expense.paidBy) continue;

      // Canonical key per unordered pair, with the sign tracking direction.
      const [a, b] =
        share.personId < expense.paidBy
          ? [share.personId, expense.paidBy]
          : [expense.paidBy, share.personId];
      const sign = share.personId < expense.paidBy ? 1 : -1;
      const key = `${a}|${b}`;
      pairs.set(key, (pairs.get(key) ?? 0) + sign * share.amountMinor);
    }
  }

  let count = 0;
  for (const net of pairs.values()) if (net !== 0) count += 1;
  return count;
}
