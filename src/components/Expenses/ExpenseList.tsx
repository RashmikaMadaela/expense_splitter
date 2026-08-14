import type { Expense, Person } from '../../types';
import { formatMinor } from '../../lib/money';

interface Props {
  expenses: Expense[];
  people: Person[];
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
}

const SPLIT_LABEL: Record<Expense['splitType'], string> = {
  equal: 'Equal',
  exact: 'Exact',
  percentage: 'Percentage',
};

export function ExpenseList({ expenses, people, onEdit, onDelete }: Props) {
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? 'Unknown';

  if (expenses.length === 0) {
    return <p className="empty-state">No expenses logged yet.</p>;
  }

  return (
    <ul className="expense-list">
      {[...expenses].reverse().map((expense) => (
        <li key={expense.id} className="expense-row">
          <div className="expense-info">
            <strong>{expense.description}</strong>
            <span className="badge">{SPLIT_LABEL[expense.splitType]}</span>
            <div className="expense-meta">
              {formatMinor(expense.totalAmountMinor)} paid by {nameOf(expense.paidBy)}, split
              between {expense.participantIds.map(nameOf).join(', ')}
            </div>
          </div>
          <div className="expense-actions">
            <button type="button" onClick={() => onEdit(expense)}>
              Edit
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => {
                if (confirm(`Delete "${expense.description}"?`)) onDelete(expense.id);
              }}
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
