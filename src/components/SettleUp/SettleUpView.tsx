import { useMemo } from 'react';
import { useAppState } from '../../state/AppContext';
import { computeBalances } from '../../lib/balances';
import { computeSettlement } from '../../lib/settleUp';
import { formatMinor } from '../../lib/money';

export function SettleUpView() {
  const { people, expenses } = useAppState();
  const balances = useMemo(() => computeBalances(people, expenses), [people, expenses]);
  const transactions = useMemo(() => computeSettlement(balances), [balances]);

  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? 'Unknown';

  return (
    <section className="panel">
      <h2>Settle Up</h2>
      {transactions.length === 0 ? (
        <p className="empty-state">Everyone is settled up. No payments needed.</p>
      ) : (
        <ul className="settlement-list">
          {transactions.map((t, i) => (
            <li key={i} className="settlement-row">
              <strong>{nameOf(t.from)}</strong> pays <strong>{nameOf(t.to)}</strong>
              <span className="settlement-amount">{formatMinor(t.amountMinor)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
