# Development Log

A running account of how this was built, in order, with the reasoning behind the key decisions. See `README.md` for the final assumptions list; this log is the "how we got there."

## 1. Reading the brief

Requirements: add people, log expenses with Equal + one of (Exact/Percentage) split, edit/delete with correct recalculation, running balances, and a *minimized* Settle Up screen — not a full pairwise debt list. The explicit "must handle" section is rounding: balances must reconcile to exactly Rs. 0, never drift to 99.99/100.01. That framing made it clear the split math and settle-up algorithm were the actual point of the exercise, not the UI.

Decision: built **both** Exact Amount and Percentage splits (not just one), since the brief's own walkthrough scenario has an alternate version for each and it's a small marginal cost once the underlying apportionment logic exists.

## 2. Data model and the rounding strategy

The first real decision: how to represent money. Storing rupees as JS floats and doing arithmetic on them (`10000 * 0.3333...`) is exactly the bug class the brief warns about — float drift. Instead, every amount in application state is an **integer minor unit** (rupees × 100). Conversion to/from decimal only happens at the UI input/display boundary (`src/lib/money.ts`). This guarantees every sum done in-app is exact.

For distributing a total across participants without leftover cents disappearing or appearing, used the **Largest-Remainder (Hamilton apportionment) method**: compute each participant's raw proportional share, floor it, then hand out the leftover minor units one at a time to whoever was rounded down the most, tie-broken by participant order. For an *equal* split this reduces cleanly to "the first N participants in split order absorb the extra cent," matching the brief's Rs. 100 / 3-way example. For *percentage* splits it's the standard proportional-apportionment approach. For *exact* splits, no algorithm runs at all — the user's literal entries are the shares, since the brief's own example (3333.33/3333.33/3333.34) shows the user already deciding who gets the extra cent.

Wrote `src/lib/splitCalculator.ts`, `src/lib/balances.ts`, `src/lib/settleUp.ts` and their Vitest suites before touching any UI, hand-verifying the brief's full acceptance scenario (Alice/Bob/Carol/Dave) against the expected balances (+5,666.67 / −9,333.33 / +7,000.00 / −3,333.34) and settlement (3 transactions) by hand first, then asserting those exact numbers in tests. All 20 tests passed on the first run.

**Settle Up algorithm**: greedy "largest creditor vs. largest debtor," repeatedly matched and reduced until everyone's at zero. True minimum-transaction-count is NP-hard in general; greedy is the standard, expected approach here, bounded at N−1 transactions for N people, and produces the exact 3-transaction result the brief's scenario expects.

**Balances**: always a full recompute from `people` + `expenses` via `computeBalances()`, never incremental patching. This was a deliberate simplicity choice — patching balances on every edit/delete invites drift bugs; recomputing from source data on every render (via `useMemo`) can't drift by construction, and the data volumes here are trivial so there's no performance cost.

## 3. State layer and persistence

React Context + `useReducer` (`src/state/AppContext.tsx`, `appReducer.ts`) — no external state library, since app state is just two small arrays. `localStorage` persistence (`src/state/storage.ts`) was chosen over in-memory-only or a backend/DB: it fits the brief's "single-session tool, no login" framing, survives a refresh, and needed zero infrastructure, leaving the full time budget for the algorithm work above. Payload is versioned (`{version, people, expenses}`) so a future schema change has somewhere to hook in without a rewrite, even though there's only one version so far.

## 4. UI

Four-tab flow (People → Expenses → Balances → Settle Up) matching the brief's stated flow, plain CSS, no UI kit — deliberately minimal per the brief's own guidance that a correct plain app beats a polished one with wrong balances. `ExpenseForm` handles both create and edit (an `editingExpense` prop switches the mode and pre-fills fields), with split-type-specific sub-editors (`EqualSplitPreview`, `ExactSplitEditor`, `PercentageSplitEditor`) that show a live running total/diff and block submission on mismatch (the bonus requirement) rather than silently auto-adjusting.

## 5. End-to-end verification caught a real bug

After the app built and typechecked cleanly, ran it in a real browser (headless Chromium via Playwright, driving the actual rendered page rather than testing components in isolation) through the full brief scenario. First run produced **wrong balances** for Bob and Dave, even though all 20 unit tests were green — a reminder that pure-logic tests only prove the algorithms are correct in isolation, not that the UI wires them up correctly.

Root cause: `ExpenseForm` was keyed as `editingExpense?.id ?? 'new'` in `ExpensesTab`, so React only remounted (and cleared) the form when entering/leaving *edit* mode — not after submitting a brand-new expense. Logging expense #1, then #2, then #3 back-to-back left stale field state (leftover split-type selection and per-person input values) bleeding into the next expense. The third expense in the scenario silently failed validation and was never actually saved, which shifted every downstream balance.

Fix: bumped a `formKey` counter on every successful submit (`src/components/Expenses/ExpensesTab.tsx`), so the key becomes `` `new-${formKey}` `` for fresh submissions too, forcing a real remount and a clean form each time. Re-ran the same browser scenario afterward — balances and settle-up matched the hand-verified expected values exactly, and a follow-up edit/delete pass confirmed balances recalculate correctly (edited an expense's amount → balance updated; deleted it → both people returned to settled-up).

## 6. Final checks

- `npm run test` — 20/20 passing (`splitCalculator`, `balances`, `settleUp`).
- `npx tsc -b` — clean, no type errors.
- `npm run build` — clean production build.
- Manual browser walkthrough of the full brief scenario, plus an edit/delete recalculation check — both correct.
