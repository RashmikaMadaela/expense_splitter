import { useState } from 'react';
import type { Expense, Person } from '../../types';
import { formatMinor } from '../../lib/money';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface Props {
  expenses: Expense[];
  people: Person[];
  editingId?: string;
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
}

const SPLIT_LABEL: Record<Expense['splitType'], string> = {
  equal: 'Equal',
  exact: 'Exact',
  percentage: 'Percentage',
};

export function ExpenseList({ expenses, people, editingId, onEdit, onDelete }: Props) {
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? 'Unknown';

  if (expenses.length === 0) {
    return <p className="empty-state">No expenses logged yet.</p>;
  }

  return (
    <>
      <ul className="expense-list">
        {[...expenses].reverse().map((expense) => (
          <li
            key={expense.id}
            className={`expense-row ${editingId === expense.id ? 'is-editing' : ''}`}
          >
            <div className="expense-info">
              <div className="expense-title">
                <strong>{expense.description}</strong>
                <span className="badge">{SPLIT_LABEL[expense.splitType]}</span>
                {editingId === expense.id && <span className="badge editing">Editing</span>}
              </div>
              <div className="expense-meta">
                <span className="amount">{formatMinor(expense.totalAmountMinor)}</span> paid by{' '}
                {nameOf(expense.paidBy)}
              </div>
              <div className="expense-meta">
                Split between {expense.participantIds.map(nameOf).join(', ')}
              </div>
            </div>
            <div className="expense-actions">
              <button type="button" className="secondary" onClick={() => onEdit(expense)}>
                Edit
              </button>
              <button type="button" className="danger" onClick={() => setPendingDelete(expense)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this expense?"
        message={
          pendingDelete
            ? `"${pendingDelete.description}" (${formatMinor(pendingDelete.totalAmountMinor)}) will be removed and all balances recalculated.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
