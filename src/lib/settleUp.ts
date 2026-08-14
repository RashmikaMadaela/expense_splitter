import type { PersonId } from '../types';

export interface Transaction {
  from: PersonId;
  to: PersonId;
  amountMinor: number;
}

interface Balance {
  personId: PersonId;
  remaining: number;
}

/**
 * Greedy "largest creditor vs. largest debtor" debt-simplification heuristic.
 * Produces at most N-1 transactions for N people. True global-minimum
 * transaction count is NP-hard in general (related to subset-sum/bin-packing);
 * greedy is the standard, expected approach here and matches the acceptance
 * scenario exactly.
 */
export function computeSettlement(balances: Record<PersonId, number>): Transaction[] {
  const creditors: Balance[] = [];
  const debtors: Balance[] = [];

  for (const [personId, balance] of Object.entries(balances)) {
    if (balance > 0) creditors.push({ personId, remaining: balance });
    else if (balance < 0) debtors.push({ personId, remaining: -balance });
  }

  creditors.sort((a, b) => b.remaining - a.remaining);
  debtors.sort((a, b) => b.remaining - a.remaining);

  const transactions: Transaction[] = [];

  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors[0];
    const debtor = debtors[0];
    const amount = Math.min(creditor.remaining, debtor.remaining);

    transactions.push({ from: debtor.personId, to: creditor.personId, amountMinor: amount });

    creditor.remaining -= amount;
    debtor.remaining -= amount;

    if (creditor.remaining === 0) creditors.shift();
    if (debtor.remaining === 0) debtors.shift();

    creditors.sort((a, b) => b.remaining - a.remaining);
    debtors.sort((a, b) => b.remaining - a.remaining);
  }

  return transactions;
}
