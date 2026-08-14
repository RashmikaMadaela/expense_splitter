import type { AppState, Expense, ExpenseId } from '../types';

export type Action =
  | { type: 'ADD_PERSON'; name: string }
  | { type: 'ADD_EXPENSE'; expense: Expense }
  | { type: 'UPDATE_EXPENSE'; expense: Expense }
  | { type: 'DELETE_EXPENSE'; expenseId: ExpenseId }
  | { type: 'LOAD_STATE'; state: AppState };

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_PERSON': {
      const name = action.name.trim();
      if (!name) return state;
      return {
        ...state,
        people: [...state.people, { id: crypto.randomUUID(), name, createdAt: Date.now() }],
      };
    }

    case 'ADD_EXPENSE': {
      return { ...state, expenses: [...state.expenses, action.expense] };
    }

    case 'UPDATE_EXPENSE': {
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
