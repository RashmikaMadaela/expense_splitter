import type { PersonId, Person } from '../../types';
import { validatePercentageSplit } from '../../lib/validation';

interface Props {
  participants: Person[];
  values: Record<PersonId, string>;
  onChange: (personId: PersonId, rawValue: string) => void;
}

export function PercentageSplitEditor({ participants, values, onChange }: Props) {
  const percentages: Record<PersonId, number> = {};
  for (const p of participants) {
    percentages[p.id] = parseFloat(values[p.id] || '0') || 0;
  }
  const result = validatePercentageSplit(
    percentages,
    participants.map((p) => p.id),
  );
  const sum = participants.reduce((acc, p) => acc + percentages[p.id], 0);

  return (
    <div className="split-editor">
      {participants.map((p) => (
        <label key={p.id} className="split-editor-row">
          <span>{p.name}</span>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={values[p.id] ?? ''}
            onChange={(e) => onChange(p.id, e.target.value)}
            placeholder="0"
          />
          <span className="unit">%</span>
        </label>
      ))}
      <p className={`split-total ${result.valid ? 'ok' : 'error'}`}>
        {result.valid ? `Total: ${sum.toFixed(2)}% ✓` : result.message}
      </p>
    </div>
  );
}
