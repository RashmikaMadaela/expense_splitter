import { useEffect, useRef, useState } from 'react';
import type { Expense } from '../../types';
import { useAppState, useAppDispatch } from '../../state/AppContext';
import { computeTotalSpent } from '../../lib/balances';
import { formatMinor } from '../../lib/money';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseList } from './ExpenseList';

export function ExpensesTab({ onNavigate }: { onNavigate: (tab: 'people') => void }) {
  const { people, expenses } = useAppState();
  const dispatch = useAppDispatch();
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  // Bumped on every successful submit so the form remounts (and clears its
  // fields) even when adding consecutive new expenses, not just when
  // entering/leaving edit mode.
  const [formKey, setFormKey] = useState(0);

  const formRef = useRef<HTMLDivElement>(null);

  // The form sits above the list, so switching into edit mode changes it
  // off-screen and looks like nothing happened. Bring it into view, highlight
  // it, and put the cursor in the first field.
  useEffect(() => {
    if (!editingExpense || !formRef.current) return;

    formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const description = formRef.current.querySelector<HTMLInputElement>('input[type="text"]');
    description?.focus();
  }, [editingExpense]);

  if (people.length < 2) {
    return (
      <section className="panel">
        <h2>Expenses</h2>
        <p className="empty-state">You need at least 2 people before logging an expense.</p>
        <button type="button" onClick={() => onNavigate('people')}>
          Add people
        </button>
      </section>
    );
  }

  return (
    <section>
      <div ref={formRef} className={editingExpense ? 'editing-target' : undefined}>
        <ExpenseForm
          key={editingExpense?.id ?? `new-${formKey}`}
          editingExpense={editingExpense}
          onDone={() => {
            setEditingExpense(undefined);
            setFormKey((k) => k + 1);
          }}
        />
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Expenses</h2>
          {expenses.length > 0 && (
            <span className="count-chip">
              {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'} &middot;{' '}
              {formatMinor(computeTotalSpent(expenses))} total
            </span>
          )}
        </div>
        <ExpenseList
          expenses={expenses}
          people={people}
          editingId={editingExpense?.id}
          onEdit={setEditingExpense}
          onDelete={(expenseId) => {
            dispatch({ type: 'DELETE_EXPENSE', expenseId });
            if (editingExpense?.id === expenseId) setEditingExpense(undefined);
          }}
        />
      </div>
    </section>
  );
}
