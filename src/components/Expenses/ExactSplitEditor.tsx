import type { PersonId, Person } from '../../types';
import { parseAmountToMinor, formatMinor } from '../../lib/money';
import { validateExactSplit } from '../../lib/validation';

interface Props {
  totalAmountMinor: number;
  participants: Person[];
  values: Record<PersonId, string>;
  onChange: (personId: PersonId, rawValue: string) => void;
}

export function ExactSplitEditor({ totalAmountMinor, participants, values, onChange }: Props) {
  const exactAmountsMinor: Record<PersonId, number> = {};
  let parseError: string | null = null;

  for (const p of participants) {
    const raw = values[p.id]?.trim();
    if (!raw) {
      exactAmountsMinor[p.id] = 0;
      continue;
    }
    const parsed = parseAmountToMinor(raw);
    if (!parsed.ok) {
      parseError ??= parsed.error!;
      exactAmountsMinor[p.id] = 0;
    } else {
      exactAmountsMinor[p.id] = parsed.minor!;
    }
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
            type="text"
            inputMode="decimal"
            value={values[p.id] ?? ''}
            onChange={(e) => onChange(p.id, e.target.value)}
            placeholder="0.00"
          />
        </label>
      ))}
      <p className={`split-total ${!parseError && result.valid ? 'ok' : 'error'}`}>
        {parseError ?? (result.valid ? `Total: ${formatMinor(totalAmountMinor)} ✓` : result.message)}
      </p>
    </div>
  );
}
