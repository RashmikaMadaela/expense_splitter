import type { AppState } from '../types';
import { checkLoadedState } from '../lib/invariants';

const STORAGE_KEY = 'expense-splitter/state';

/**
 * v2 stores percentage splits as integer basis points rather than decimal
 * percentages. v1 payloads are discarded rather than migrated - this is a
 * single-session local tool, so there is no data worth a migration path.
 */
export const SCHEMA_VERSION = 2;

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
    if (parsed?.version !== SCHEMA_VERSION) return emptyState;

    const candidate: AppState = { people: parsed.people, expenses: parsed.expenses };

    // localStorage is untrusted: it can be hand-edited or left by an older
    // build. Start clean rather than loading state that would produce balances
    // that don't reconcile.
    const error = checkLoadedState(candidate);
    if (error) {
      console.warn(`Discarding saved state: ${error}`);
      return emptyState;
    }

    return candidate;
  } catch {
    return emptyState;
  }
}

export function saveState(state: AppState): void {
  try {
    const payload: StoredPayload = { version: SCHEMA_VERSION, ...state };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota exceeded or storage unavailable (private browsing); the app still
    // works for the current session.
  }
}
