export type Tab = 'people' | 'expenses' | 'balances' | 'settleup';

const TABS: { id: Tab; label: string }[] = [
  { id: 'people', label: '1. People' },
  { id: 'expenses', label: '2. Expenses' },
  { id: 'balances', label: '3. Balances' },
  { id: 'settleup', label: '4. Settle Up' },
];

export function TabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="tab-bar">
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`tab-button ${active === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
