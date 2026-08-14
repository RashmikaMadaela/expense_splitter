export type PersonId = string;
export type ExpenseId = string;

export interface Person {
  id: PersonId;
  name: string;
  createdAt: number;
}

export type SplitType = 'equal' | 'exact' | 'percentage';

export interface SplitShare {
  personId: PersonId;
  amountMinor: number;
}

export interface Expense {
  id: ExpenseId;
  description: string;
  totalAmountMinor: number;
  paidBy: PersonId;
  participantIds: PersonId[];
  splitType: SplitType;
  shares: SplitShare[];
  /** Only present for splitType 'exact'; preserves the user's literal entries for editing. */
  rawExactInputsMinor?: Record<PersonId, number>;
  /** Only present for splitType 'percentage'; integer basis points (10000 = 100%). */
  rawPercentageBp?: Record<PersonId, number>;
  createdAt: number;
  updatedAt: number;
}

export interface AppState {
  people: Person[];
  expenses: Expense[];
}
