import { useState } from 'react';
import type { Expense } from '../../types';
import { useAppState, useAppDispatch } from '../../state/AppContext';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseList } from './ExpenseList';

export function ExpensesTab() {
  const { people, expenses } = useAppState();
  const dispatch = useAppDispatch();
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  // Bumped on every successful submit so the form remounts (and clears its fields)
  // even when adding consecutive new expenses, not just when entering/leaving edit mode.
  const [formKey, setFormKey] = useState(0);

  return (
    <section>
      <ExpenseForm
        key={editingExpense?.id ?? `new-${formKey}`}
        editingExpense={editingExpense}
        onDone={() => {
          setEditingExpense(undefined);
          setFormKey((k) => k + 1);
        }}
      />
      <div className="panel">
        <h2>Expenses</h2>
        <ExpenseList
          expenses={expenses}
          people={people}
          onEdit={setEditingExpense}
          onDelete={(expenseId) => dispatch({ type: 'DELETE_EXPENSE', expenseId })}
        />
      </div>
    </section>
  );
}
