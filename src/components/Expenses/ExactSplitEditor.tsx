import type { PersonId, Person } from '../../types';
import { rupeesToMinor, formatMinor } from '../../lib/money';
import { validateExactSplit } from '../../lib/validation';

interface Props {
  totalAmountMinor: number;
  participants: Person[];
  values: Record<PersonId, string>;
  onChange: (personId: PersonId, rawValue: string) => void;
}

export function ExactSplitEditor({ totalAmountMinor, participants, values, onChange }: Props) {
  const exactAmountsMinor: Record<PersonId, number> = {};
  for (const p of participants) {
    exactAmountsMinor[p.id] = rupeesToMinor(parseFloat(values[p.id] || '0') || 0);
  }
  const result = validateExactSplit(
    totalAmountMinor,
    exactAmountsMinor,
    participants.map((p) => p.id),
  );

  return (
    <div className="split-editor">
      {participants.map((p) => (
        <label key={p.id} className="split-editor-row">
          <span>{p.name}</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={values[p.id] ?? ''}
            onChange={(e) => onChange(p.id, e.target.value)}
            placeholder="0.00"
          />
        </label>
      ))}
      <p className={`split-total ${result.valid ? 'ok' : 'error'}`}>
        {result.valid
          ? `Total: ${formatMinor(totalAmountMinor)} ✓`
          : result.message}
      </p>
    </div>
  );
}
