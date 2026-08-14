export type Tab = 'people' | 'expenses' | 'balances' | 'settleup';

const TABS: { id: Tab; step: string; label: string }[] = [
  { id: 'people', step: '1.', label: 'People' },
  { id: 'expenses', step: '2.', label: 'Expenses' },
  { id: 'balances', step: '3.', label: 'Balances' },
  { id: 'settleup', step: '4.', label: 'Settle Up' },
];

export function TabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="tab-bar" aria-label="Steps">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`tab-button ${active === t.id ? 'active' : ''}`}
          aria-current={active === t.id ? 'page' : undefined}
          onClick={() => onChange(t.id)}
        >
          {/* Step numbers are an ordering hint, not information - dropped on
              narrow screens so all four tabs fit without clipping. */}
          <span className="tab-step">{t.step}</span> {t.label}
        </button>
      ))}
    </nav>
  );
}
