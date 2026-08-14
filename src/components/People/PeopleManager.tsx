import { useState } from 'react';
import { useAppState, useAppDispatch } from '../../state/AppContext';
import { countPersonExpenses, isDuplicateName, isPersonReferenced } from '../../lib/people';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { PersonId } from '../../types';

export function PeopleManager({ onNavigate }: { onNavigate: (tab: 'expenses') => void }) {
  const { people, expenses } = useAppState();
  const dispatch = useAppDispatch();

  const [name, setName] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<PersonId | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setAddError('Enter a name.');
    if (isDuplicateName(people, trimmed)) {
      return setAddError(`${trimmed} is already in this group.`);
    }
    dispatch({ type: 'ADD_PERSON', name: trimmed });
    setName('');
    setAddError(null);
  }

  function startEditing(personId: PersonId, current: string) {
    setEditingId(personId);
    setEditingName(current);
    setEditError(null);
  }

  function saveEditing(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) return setEditError('Enter a name.');
    if (isDuplicateName(people, trimmed, editingId)) {
      return setEditError(`${trimmed} is already in this group.`);
    }
    dispatch({ type: 'RENAME_PERSON', personId: editingId, name: trimmed });
    setEditingId(null);
    setEditError(null);
  }

  const hasData = people.length > 0 || expenses.length > 0;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>People</h2>
        {people.length > 0 && (
          <span className="count-chip">
            {people.length} {people.length === 1 ? 'person' : 'people'}
          </span>
        )}
      </div>

      <form className="inline-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Person's name"
          value={name}
          aria-label="Person's name"
          onChange={(e) => {
            setName(e.target.value);
            setAddError(null);
          }}
        />
        <button type="submit">Add person</button>
      </form>
      {addError && (
        <p className="field-error" role="alert">
          {addError}
        </p>
      )}

      {people.length === 0 ? (
        <p className="empty-state">
          No one added yet. Add at least 2 people to start logging expenses.
        </p>
      ) : (
        <ul className="people-list">
          {people.map((p) => {
            const referenced = isPersonReferenced(expenses, p.id);
            const count = countPersonExpenses(expenses, p.id);

            if (editingId === p.id) {
              return (
                <li key={p.id} className="person-row">
                  <form className="inline-form person-edit-form" onSubmit={saveEditing}>
                    <input
                      type="text"
                      value={editingName}
                      aria-label={`Rename ${p.name}`}
                      autoFocus
                      onChange={(e) => {
                        setEditingName(e.target.value);
                        setEditError(null);
                      }}
                    />
                    <button type="submit">Save</button>
                    <button type="button" className="secondary" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </form>
                  {editError && (
                    <p className="field-error" role="alert">
                      {editError}
                    </p>
                  )}
                </li>
              );
            }

            return (
              <li key={p.id} className="person-row">
                <span className="person-name">{p.name}</span>
                <span className="person-meta">
                  {count > 0 && `${count} ${count === 1 ? 'expense' : 'expenses'}`}
                </span>
                <span className="person-actions">
                  <button type="button" className="secondary" onClick={() => startEditing(p.id, p.name)}>
                    Rename
                  </button>
                  <button
                    type="button"
                    className="danger"
                    disabled={referenced}
                    title={
                      referenced
                        ? `${p.name} is involved in ${count} ${count === 1 ? 'expense' : 'expenses'}. Delete those first.`
                        : `Remove ${p.name}`
                    }
                    onClick={() => dispatch({ type: 'REMOVE_PERSON', personId: p.id })}
                  >
                    Remove
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {people.length >= 2 && expenses.length === 0 && (
        <p className="next-step">
          Ready to go.{' '}
          <button type="button" className="link-button" onClick={() => onNavigate('expenses')}>
            Log your first expense &rarr;
          </button>
        </p>
      )}

      {hasData && (
        <div className="danger-zone">
          <div>
            <strong>Start a new group</strong>
            <p className="danger-zone-note">
              Removes all {people.length} {people.length === 1 ? 'person' : 'people'} and{' '}
              {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}. This cannot be
              undone.
            </p>
          </div>
          <button type="button" className="danger" onClick={() => setConfirmingClear(true)}>
            Clear all data
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmingClear}
        title="Clear all data?"
        message={`This permanently deletes all ${people.length} ${
          people.length === 1 ? 'person' : 'people'
        } and ${expenses.length} ${
          expenses.length === 1 ? 'expense' : 'expenses'
        }. This cannot be undone.`}
        confirmLabel="Clear everything"
        destructive
        onConfirm={() => {
          dispatch({ type: 'CLEAR_ALL' });
          setConfirmingClear(false);
          setEditingId(null);
        }}
        onCancel={() => setConfirmingClear(false)}
      />
    </section>
  );
}
