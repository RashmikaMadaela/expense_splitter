import type { Person } from '../../types';
import { computeShares } from '../../lib/splitCalculator';
import { formatMinor } from '../../lib/money';

export function EqualSplitPreview({
  totalAmountMinor,
  participants,
}: {
  totalAmountMinor: number;
  participants: Person[];
}) {
  if (participants.length === 0 || totalAmountMinor <= 0) {
    return <p className="empty-state">Select participants and an amount to preview the split.</p>;
  }

  const shares = computeShares({
    totalAmountMinor,
    splitType: 'equal',
    participantIds: participants.map((p) => p.id),
  });

  return (
    <div className="split-editor">
      {participants.map((p, i) => (
        <div key={p.id} className="split-editor-row">
          <span>{p.name}</span>
          <span>{formatMinor(shares[i].amountMinor)}</span>
        </div>
      ))}
    </div>
  );
}
