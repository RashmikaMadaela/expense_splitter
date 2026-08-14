import { useMemo, useState } from 'react';
import { useAppState } from '../../state/AppContext';
import { computeBalances, countNaivePairwiseDebts } from '../../lib/balances';
import { computeSettlement, EXACT_SOLVER_MAX_PEOPLE } from '../../lib/settleUp';
import { formatMinor } from '../../lib/money';

export function SettleUpView({ onNavigate }: { onNavigate: (tab: 'expenses') => void }) {
  const { people, expenses } = useAppState();
  const balances = useMemo(() => computeBalances(people, expenses), [people, expenses]);
  const transactions = useMemo(() => computeSettlement(balances), [balances]);
  const naiveCount = useMemo(() => countNaivePairwiseDebts(expenses), [expenses]);

  const [copied, setCopied] = useState(false);
  const [fallbackText, setFallbackText] = useState<string | null>(null);

  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? 'Unknown';
  const nonZero = Object.values(balances).filter((b) => b !== 0).length;
  const isExact = nonZero <= EXACT_SOLVER_MAX_PEOPLE;

  const summaryText = useMemo(
    () =>
      ['Settle up:', ...transactions.map((t) => `- ${nameOf(t.from)} pays ${nameOf(t.to)} ${formatMinor(t.amountMinor)}`)].join(
        '\n',
      ),
    [transactions, people],
  );

  async function handleCopy() {
    // navigator.clipboard is only available in a secure context, so over plain
    // http on a LAN it is undefined. Show the text to copy by hand rather than
    // failing silently.
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setFallbackText(null);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFallbackText(summaryText);
    }
  }

  if (expenses.length === 0) {
    return (
      <section className="panel">
        <h2>Settle Up</h2>
        <p className="empty-state">Log some expenses first, then come back to settle up.</p>
        <button type="button" onClick={() => onNavigate('expenses')}>
          Log an expense
        </button>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Settle Up</h2>
        {transactions.length > 0 && (
          <button type="button" className="secondary" onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy summary'}
          </button>
        )}
      </div>

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
                <span className="settlement-parties">
                  <strong>{nameOf(t.from)}</strong> pays <strong>{nameOf(t.to)}</strong>
                </span>
                <span className="settlement-amount amount">{formatMinor(t.amountMinor)}</span>
              </li>
            ))}
          </ul>

          {fallbackText && (
            <div className="copy-fallback">
              <p className="danger-zone-note">
                Copying needs a secure connection. Select and copy the text below instead.
              </p>
              <textarea readOnly rows={transactions.length + 1} value={fallbackText} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
