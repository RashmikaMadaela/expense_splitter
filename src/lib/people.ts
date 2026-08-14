import type { Expense, Person, PersonId } from '../types';

/**
 * Whether any expense still refers to this person - as the payer, as a
 * participant, or in the stored shares.
 *
 * Removing someone who is still referenced would orphan those references and
 * leave shares that no longer correspond to anyone in the group, so this is the
 * rule that makes person deletion safe to offer at all. Shared between the UI
 * (which disables the button) and the reducer (which refuses the action), so
 * the two cannot drift apart.
 */
export function isPersonReferenced(expenses: Expense[], personId: PersonId): boolean {
  return expenses.some(
    (e) =>
      e.paidBy === personId ||
      e.participantIds.includes(personId) ||
      e.shares.some((s) => s.personId === personId),
  );
}

/** How many expenses involve this person, for explaining why removal is blocked. */
export function countPersonExpenses(expenses: Expense[], personId: PersonId): number {
  return expenses.filter(
    (e) =>
      e.paidBy === personId ||
      e.participantIds.includes(personId) ||
      e.shares.some((s) => s.personId === personId),
  ).length;
}

/**
 * Names are compared case-insensitively and trimmed.
 *
 * Two people called "Alice" are indistinguishable in the payer dropdown, the
 * participant checkboxes, the balances list and every settlement line, so
 * duplicates are rejected rather than silently accepted.
 */
export function isDuplicateName(
  people: Person[],
  name: string,
  excludeId?: PersonId,
): boolean {
  const normalised = name.trim().toLocaleLowerCase();
  if (!normalised) return false;
  return people.some(
    (p) => p.id !== excludeId && p.name.trim().toLocaleLowerCase() === normalised,
  );
}
