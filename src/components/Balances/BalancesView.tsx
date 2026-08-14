import { useMemo } from 'react';
import { useAppState } from '../../state/AppContext';
import { computeBalances, computeTotalSpent } from '../../lib/balances';
import { formatMinor } from '../../lib/money';

export function BalancesView({ onNavigate }: { onNavigate: (tab: 'people' | 'expenses') => void }) {
  const { people, expenses } = useAppState();
  const balances = useMemo(() => computeBalances(people, expenses), [people, expenses]);

  if (people.length === 0) {
    return (
      <section className="panel">
        <h2>Balances</h2>
        <p className="empty-state">Add people to see balances.</p>
        <button type="button" onClick={() => onNavigate('people')}>
          Add people
        </button>
      </section>
    );
  }

  if (expenses.length === 0) {
    return (
      <section className="panel">
        <h2>Balances</h2>
        <p className="empty-state">No expenses yet, so everyone is even.</p>
        <button type="button" onClick={() => onNavigate('expenses')}>
          Log an expense
        </button>
      </section>
    );
  }

  const total = computeTotalSpent(expenses);
  const perPerson = Math.round(total / people.length);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Balances</h2>
        <span className="count-chip">
          {formatMinor(total)} total &middot; {formatMinor(perPerson)} per person
        </span>
      </div>
      <ul className="balances-list">
        {people.map((p) => {
          const balance = balances[p.id];
          const cls = balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'neutral';
          return (
            <li key={p.id} className="balance-row">
              <span className="balance-name">{p.name}</span>
              <span className={`balance-amount ${cls}`}>
                {balance === 0 ? (
                  'settled up'
                ) : (
                  <>
                    <span className="balance-label">{balance > 0 ? 'is owed' : 'owes'}</span>{' '}
                    <span className="amount">{formatMinor(Math.abs(balance))}</span>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
