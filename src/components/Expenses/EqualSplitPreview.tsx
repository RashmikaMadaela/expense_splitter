import type { Person } from '../../types';
import { computeShares } from '../../lib/splitCalculator';
import { formatMinor } from '../../lib/money';

export function EqualSplitPreview({
  totalAmountMinor,
  participants,
  rotationSeed,
}: {
  totalAmountMinor: number;
  participants: Person[];
  rotationSeed: string;
}) {
  if (participants.length === 0 || totalAmountMinor <= 0) {
    return <p className="empty-state">Select participants and an amount to preview the split.</p>;
  }

  const shares = computeShares({
    totalAmountMinor,
    splitType: 'equal',
    participantIds: participants.map((p) => p.id),
    rotationSeed,
  });

  const base = Math.min(...shares.map((s) => s.amountMinor));
  const hasRemainder = shares.some((s) => s.amountMinor !== base);

  return (
    <div className="split-editor">
      {participants.map((p, i) => (
        <div key={p.id} className="split-editor-row">
          <span>{p.name}</span>
          <span>{formatMinor(shares[i].amountMinor)}</span>
        </div>
      ))}
      {hasRemainder && (
        <p className="split-note">
          This amount doesn&rsquo;t divide evenly. The leftover is assigned so the shares still add
          up to exactly {formatMinor(totalAmountMinor)}.
        </p>
      )}
    </div>
  );
}
