import { useMemo } from 'react';
import { useAppState } from '../../state/AppContext';
import { computeBalances } from '../../lib/balances';
import { formatMinor } from '../../lib/money';

export function BalancesView() {
  const { people, expenses } = useAppState();
  const balances = useMemo(() => computeBalances(people, expenses), [people, expenses]);

  if (people.length === 0) {
    return <p className="empty-state">Add people to see balances.</p>;
  }

  return (
    <section className="panel">
      <h2>Balances</h2>
      <ul className="balances-list">
        {people.map((p) => {
          const balance = balances[p.id];
          const status = balance > 0 ? 'is owed' : balance < 0 ? 'owes' : 'is settled up';
          const cls = balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'neutral';
          return (
            <li key={p.id} className="balance-row">
              <span>{p.name}</span>
              <span className={`balance-amount ${cls}`}>
                {status} {balance !== 0 && formatMinor(Math.abs(balance))}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
