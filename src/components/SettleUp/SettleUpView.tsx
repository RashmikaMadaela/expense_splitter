import { useMemo } from 'react';
import { useAppState } from '../../state/AppContext';
import { computeBalances, countNaivePairwiseDebts } from '../../lib/balances';
import { computeSettlement, EXACT_SOLVER_MAX_PEOPLE } from '../../lib/settleUp';
import { formatMinor } from '../../lib/money';

export function SettleUpView() {
  const { people, expenses } = useAppState();
  const balances = useMemo(() => computeBalances(people, expenses), [people, expenses]);
  const transactions = useMemo(() => computeSettlement(balances), [balances]);
  const naiveCount = useMemo(() => countNaivePairwiseDebts(expenses), [expenses]);

  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? 'Unknown';
  const nonZero = Object.values(balances).filter((b) => b !== 0).length;
  const isExact = nonZero <= EXACT_SOLVER_MAX_PEOPLE;

  return (
    <section className="panel">
      <h2>Settle Up</h2>
      {transactions.length === 0 ? (
        <p className="empty-state">Everyone is settled up. No payments needed.</p>
      ) : (
        <>
          <p className="settlement-summary">
            Settling every debt directly would take <strong>{naiveCount} payments</strong>. This
            needs <strong>{transactions.length}</strong>.
            {isExact && ' That is the provable minimum for these balances.'}
          </p>
          <ul className="settlement-list">
            {transactions.map((t, i) => (
              <li key={i} className="settlement-row">
                <strong>{nameOf(t.from)}</strong> pays <strong>{nameOf(t.to)}</strong>
                <span className="settlement-amount">{formatMinor(t.amountMinor)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
