import type { AppState, Expense, ExpenseId } from '../types';
import { checkExpenseInvariants } from '../lib/invariants';
import { randomId } from '../lib/id';

export type Action =
  | { type: 'ADD_PERSON'; name: string }
  | { type: 'ADD_EXPENSE'; expense: Expense }
  | { type: 'UPDATE_EXPENSE'; expense: Expense }
  | { type: 'DELETE_EXPENSE'; expenseId: ExpenseId }
  | { type: 'LOAD_STATE'; state: AppState };

/**
 * An expense reaching the reducer with shares that don't account for its total
 * is a programmer error, not bad user input - the form validates before
 * dispatching. Throw rather than storing it, so it can't quietly corrupt every
 * balance downstream.
 */
function assertValidExpense(expense: Expense): void {
  const error = checkExpenseInvariants(expense);
  if (error) throw new Error(`Invariant violation: ${error}`);
}

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_PERSON': {
      const name = action.name.trim();
      if (!name) return state;
      return {
        ...state,
        people: [...state.people, { id: randomId(), name, createdAt: Date.now() }],
      };
    }

    case 'ADD_EXPENSE': {
      assertValidExpense(action.expense);
      return { ...state, expenses: [...state.expenses, action.expense] };
    }

    case 'UPDATE_EXPENSE': {
      assertValidExpense(action.expense);
      return {
        ...state,
        expenses: state.expenses.map((e) => (e.id === action.expense.id ? action.expense : e)),
      };
    }

    case 'DELETE_EXPENSE': {
      return { ...state, expenses: state.expenses.filter((e) => e.id !== action.expenseId) };
    }

    case 'LOAD_STATE': {
      return action.state;
    }

    default:
      return state;
  }
}
