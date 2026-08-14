import type { AppState, Expense, ExpenseId, PersonId } from '../types';
import { checkExpenseInvariants } from '../lib/invariants';
import { isDuplicateName, isPersonReferenced } from '../lib/people';
import { randomId } from '../lib/id';

export type Action =
  | { type: 'ADD_PERSON'; name: string }
  | { type: 'RENAME_PERSON'; personId: PersonId; name: string }
  | { type: 'REMOVE_PERSON'; personId: PersonId }
  | { type: 'ADD_EXPENSE'; expense: Expense }
  | { type: 'UPDATE_EXPENSE'; expense: Expense }
  | { type: 'DELETE_EXPENSE'; expenseId: ExpenseId }
  | { type: 'CLEAR_ALL' }
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
      if (isDuplicateName(state.people, name)) return state;
      return {
        ...state,
        people: [...state.people, { id: randomId(), name, createdAt: Date.now() }],
      };
    }

    case 'RENAME_PERSON': {
      const name = action.name.trim();
      if (!name) return state;
      if (isDuplicateName(state.people, name, action.personId)) return state;
      // Ids are stable and every reference is by id, so a rename cannot affect
      // any expense, share or balance.
      return {
        ...state,
        people: state.people.map((p) => (p.id === action.personId ? { ...p, name } : p)),
      };
    }

    case 'REMOVE_PERSON': {
      // Refuse to orphan references. The UI disables the button in this case;
      // the guard here is what guarantees it, rather than trusting the caller.
      if (isPersonReferenced(state.expenses, action.personId)) return state;
      return {
        ...state,
        people: state.people.filter((p) => p.id !== action.personId),
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

    case 'CLEAR_ALL': {
      // localStorage is rewritten by the persist effect in AppContext, so
      // resetting state here is enough to clear the saved group too.
      return { people: [], expenses: [] };
    }

    case 'LOAD_STATE': {
      return action.state;
    }

    default:
      return state;
  }
}
