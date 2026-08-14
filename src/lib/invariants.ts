import type { AppState, Expense } from '../types';

/**
 * The invariant everything else depends on: an expense's shares must account
 * for exactly its total, across exactly its participants.
 *
 * If this ever breaks, balances stop summing to zero and the settle-up solver
 * is handed an unsolvable problem. Checking it at the boundaries means a bug in
 * any future split type surfaces at the point of the write, instead of showing
 * up later as money that doesn't reconcile.
 */
export function checkExpenseInvariants(expense: Expense): string | null {
  const { id, totalAmountMinor, shares, participantIds } = expense;

  if (!Number.isSafeInteger(totalAmountMinor) || totalAmountMinor <= 0) {
    return `Expense ${id}: total must be a positive integer amount`;
  }

  if (shares.some((s) => !Number.isSafeInteger(s.amountMinor))) {
    return `Expense ${id}: every share must be an integer amount`;
  }

  const sum = shares.reduce((acc, s) => acc + s.amountMinor, 0);
  if (sum !== totalAmountMinor) {
    return `Expense ${id}: shares sum to ${sum} but total is ${totalAmountMinor}`;
  }

  const shareIds = shares.map((s) => s.personId);
  if (new Set(shareIds).size !== shareIds.length) {
    return `Expense ${id}: duplicate participant in shares`;
  }

  const participants = new Set(participantIds);
  if (shareIds.length !== participants.size || shareIds.some((pid) => !participants.has(pid))) {
    return `Expense ${id}: shares do not match the participant list`;
  }

  return null;
}

/**
 * Validates state arriving from localStorage, which is untrusted input - it can
 * be hand-edited, or left behind by an older build. Returns an error string
 * rather than throwing so the caller can fall back to empty state.
 */
export function checkLoadedState(state: unknown): string | null {
  if (typeof state !== 'object' || state === null) return 'State is not an object';

  const { people, expenses } = state as Partial<AppState>;
  if (!Array.isArray(people) || !Array.isArray(expenses)) {
    return 'State is missing people or expenses';
  }

  const ids = new Set<string>();
  for (const person of people) {
    if (typeof person?.id !== 'string' || typeof person?.name !== 'string') {
      return 'Malformed person entry';
    }
    if (ids.has(person.id)) return `Duplicate person id ${person.id}`;
    ids.add(person.id);
  }

  for (const expense of expenses) {
    if (typeof expense?.id !== 'string' || !Array.isArray(expense?.shares)) {
      return 'Malformed expense entry';
    }
    if (!ids.has(expense.paidBy)) {
      return `Expense ${expense.id} references unknown payer ${expense.paidBy}`;
    }
    for (const share of expense.shares) {
      if (!ids.has(share?.personId)) {
        return `Expense ${expense.id} references unknown participant`;
      }
    }
    const error = checkExpenseInvariants(expense);
    if (error) return error;
  }

  return null;
}
