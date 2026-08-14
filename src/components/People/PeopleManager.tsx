import { useState } from 'react';
import { useAppState, useAppDispatch } from '../../state/AppContext';

export function PeopleManager() {
  const { people } = useAppState();
  const dispatch = useAppDispatch();
  const [name, setName] = useState('');

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    dispatch({ type: 'ADD_PERSON', name });
    setName('');
  }

  return (
    <section className="panel">
      <h2>People</h2>
      <form className="inline-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Person's name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit">Add person</button>
      </form>

      {people.length === 0 ? (
        <p className="empty-state">No one added yet. Add at least 2 people to start logging expenses.</p>
      ) : (
        <ul className="people-list">
          {people.map((p) => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
