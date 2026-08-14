import { useState } from 'react';
import type { Expense, PersonId, SplitType } from '../../types';
import { useAppState, useAppDispatch } from '../../state/AppContext';
import { parseAmountToMinor, parsePercentToBp, minorToRupeeString, bpToPercentString } from '../../lib/money';
import { computeShares } from '../../lib/splitCalculator';
import { validateExactSplit, validatePercentageSplit } from '../../lib/validation';
import { randomId } from '../../lib/id';
import { EqualSplitPreview } from './EqualSplitPreview';
import { ExactSplitEditor } from './ExactSplitEditor';
import { PercentageSplitEditor } from './PercentageSplitEditor';

interface Props {
  editingExpense?: Expense;
  onDone: () => void;
}

export function ExpenseForm({ editingExpense, onDone }: Props) {
  const { people } = useAppState();
  const dispatch = useAppDispatch();

  // Fixed for the life of the form. The id seeds remainder rotation, so the
  // live preview has to use the same one the saved expense will, or the
  // preview could show a different person absorbing the leftover cent.
  const [expenseId] = useState(() => editingExpense?.id ?? randomId());

  const [description, setDescription] = useState(editingExpense?.description ?? '');
  const [amount, setAmount] = useState(
    editingExpense ? minorToRupeeString(editingExpense.totalAmountMinor) : '',
  );
  const [paidBy, setPaidBy] = useState<PersonId>(editingExpense?.paidBy ?? people[0]?.id ?? '');
  const [participantIds, setParticipantIds] = useState<PersonId[]>(
    editingExpense?.participantIds ?? people.map((p) => p.id),
  );
  const [splitType, setSplitType] = useState<SplitType>(editingExpense?.splitType ?? 'equal');
  const [exactValues, setExactValues] = useState<Record<PersonId, string>>(() =>
    Object.fromEntries(
      Object.entries(editingExpense?.rawExactInputsMinor ?? {}).map(([id, m]) => [
        id,
        minorToRupeeString(m),
      ]),
    ),
  );
  const [percentValues, setPercentValues] = useState<Record<PersonId, string>>(() =>
    Object.fromEntries(
      Object.entries(editingExpense?.rawPercentageBp ?? {}).map(([id, bp]) => [
        id,
        bpToPercentString(bp),
      ]),
    ),
  );
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = parseAmountToMinor(amount);
  const totalAmountMinor = parsedAmount.ok ? parsedAmount.minor! : 0;
  const participants = people.filter((p) => participantIds.includes(p.id));

  function toggleParticipant(id: PersonId) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!description.trim()) return setError('Enter a description.');
    if (!parsedAmount.ok) return setError(parsedAmount.error!);
    if (totalAmountMinor <= 0) return setError('Enter an amount greater than zero.');
    if (!paidBy) return setError('Choose who paid.');
    if (participantIds.length === 0) return setError('Select at least one participant.');

    let shares;
    let rawExactInputsMinor: Record<PersonId, number> | undefined;
    let rawPercentageBp: Record<PersonId, number> | undefined;

    if (splitType === 'exact') {
      rawExactInputsMinor = {};
      for (const id of participantIds) {
        const parsed = parseAmountToMinor(exactValues[id] ?? '0');
        if (!parsed.ok) return setError(parsed.error!);
        rawExactInputsMinor[id] = parsed.minor!;
      }
      const result = validateExactSplit(totalAmountMinor, rawExactInputsMinor, participantIds);
      if (!result.valid) return setError(result.message ?? 'Exact amounts do not add up.');
      shares = computeShares({
        totalAmountMinor,
        splitType,
        participantIds,
        exactAmountsMinor: rawExactInputsMinor,
      });
    } else if (splitType === 'percentage') {
      rawPercentageBp = {};
      for (const id of participantIds) {
        const parsed = parsePercentToBp(percentValues[id] ?? '0');
        if (!parsed.ok) return setError(parsed.error!);
        rawPercentageBp[id] = parsed.minor!;
      }
      const result = validatePercentageSplit(rawPercentageBp, participantIds);
      if (!result.valid) return setError(result.message ?? 'Percentages do not add up.');
      shares = computeShares({
        totalAmountMinor,
        splitType,
        participantIds,
        percentagesBp: rawPercentageBp,
        rotationSeed: expenseId,
      });
    } else {
      shares = computeShares({
        totalAmountMinor,
        splitType,
        participantIds,
        rotationSeed: expenseId,
      });
    }

    const now = Date.now();
    const expense: Expense = {
      id: expenseId,
      description: description.trim(),
      totalAmountMinor,
      paidBy,
      participantIds,
      splitType,
      shares,
      rawExactInputsMinor,
      rawPercentageBp,
      createdAt: editingExpense?.createdAt ?? now,
      updatedAt: now,
    };

    dispatch({ type: editingExpense ? 'UPDATE_EXPENSE' : 'ADD_EXPENSE', expense });
    onDone();
  }

  if (people.length < 2) {
    return <p className="empty-state">Add at least 2 people before logging an expense.</p>;
  }

  return (
    <form className="expense-form panel" onSubmit={handleSubmit}>
      <h2>{editingExpense ? 'Edit expense' : 'Log an expense'}</h2>

      <label className="form-row">
        <span>Description</span>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Dinner, hotel, gas..."
        />
      </label>

      <label className="form-row">
        <span>Amount (Rs.)</span>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />
        {amount.trim() !== '' && !parsedAmount.ok && (
          <span className="field-error">{parsedAmount.error}</span>
        )}
      </label>

      <label className="form-row">
        <span>Paid by</span>
        <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="form-row">
        <legend>Split between</legend>
        {people.map((p) => (
          <label key={p.id} className="checkbox-row">
            <input
              type="checkbox"
              checked={participantIds.includes(p.id)}
              onChange={() => toggleParticipant(p.id)}
            />
            {p.name}
          </label>
        ))}
      </fieldset>

      <fieldset className="form-row">
        <legend>Split type</legend>
        {(['equal', 'exact', 'percentage'] as SplitType[]).map((type) => (
          <label key={type} className="checkbox-row">
            <input
              type="radio"
              name="splitType"
              checked={splitType === type}
              onChange={() => setSplitType(type)}
            />
            {type === 'equal' ? 'Equal' : type === 'exact' ? 'Exact amount' : 'Percentage'}
          </label>
        ))}
      </fieldset>

      {splitType === 'equal' && (
        <EqualSplitPreview
          totalAmountMinor={totalAmountMinor}
          participants={participants}
          rotationSeed={expenseId}
        />
      )}
      {splitType === 'exact' && (
        <ExactSplitEditor
          totalAmountMinor={totalAmountMinor}
          participants={participants}
          values={exactValues}
          onChange={(id, v) => setExactValues((prev) => ({ ...prev, [id]: v }))}
        />
      )}
      {splitType === 'percentage' && (
        <PercentageSplitEditor
          participants={participants}
          values={percentValues}
          onChange={(id, v) => setPercentValues((prev) => ({ ...prev, [id]: v }))}
        />
      )}

      {error && <p className="split-total error">{error}</p>}

      <div className="form-actions">
        <button type="submit">{editingExpense ? 'Save changes' : 'Add expense'}</button>
        {editingExpense && (
          <button type="button" className="secondary" onClick={onDone}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
