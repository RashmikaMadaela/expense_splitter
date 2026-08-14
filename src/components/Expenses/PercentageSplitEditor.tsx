import type { PersonId, Person } from '../../types';
import { parsePercentToBp, bpToPercentString } from '../../lib/money';
import { validatePercentageSplit } from '../../lib/validation';

interface Props {
  participants: Person[];
  values: Record<PersonId, string>;
  onChange: (personId: PersonId, rawValue: string) => void;
}

export function PercentageSplitEditor({ participants, values, onChange }: Props) {
  const percentagesBp: Record<PersonId, number> = {};
  let parseError: string | null = null;

  for (const p of participants) {
    const raw = values[p.id]?.trim();
    if (!raw) {
      percentagesBp[p.id] = 0;
      continue;
    }
    const parsed = parsePercentToBp(raw);
    if (!parsed.ok) {
      parseError ??= parsed.error!;
      percentagesBp[p.id] = 0;
    } else {
      percentagesBp[p.id] = parsed.minor!;
    }
  }

  const result = validatePercentageSplit(
    percentagesBp,
    participants.map((p) => p.id),
  );
  const sumBp = participants.reduce((acc, p) => acc + percentagesBp[p.id], 0);

  return (
    <div className="split-editor">
      {participants.map((p) => (
        <label key={p.id} className="split-editor-row">
          <span>{p.name}</span>
          <input
            type="text"
            inputMode="decimal"
            value={values[p.id] ?? ''}
            onChange={(e) => onChange(p.id, e.target.value)}
            placeholder="0"
          />
          <span className="unit">%</span>
        </label>
      ))}
      <p className={`split-total ${!parseError && result.valid ? 'ok' : 'error'}`}>
        {parseError ?? (result.valid ? `Total: ${bpToPercentString(sumBp)}% ✓` : result.message)}
      </p>
    </div>
  );
}
