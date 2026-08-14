import type { AppState } from '../types';

const STORAGE_KEY = 'expense-splitter/state';
const SCHEMA_VERSION = 1;

interface StoredPayload {
  version: number;
  people: AppState['people'];
  expenses: AppState['expenses'];
}

export const emptyState: AppState = { people: [], expenses: [] };

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;

    const parsed = JSON.parse(raw) as StoredPayload;
    if (parsed.version !== SCHEMA_VERSION) return emptyState;

    return { people: parsed.people, expenses: parsed.expenses };
  } catch {
    return emptyState;
  }
}

export function saveState(state: AppState): void {
  const payload: StoredPayload = { version: SCHEMA_VERSION, ...state };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
