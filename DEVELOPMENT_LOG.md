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

---

# Phase 2 — Algorithmic hardening

Phase 1 was correct on the brief's scenario. Phase 2 asked a harder question: is it correct in general, and is "minimum transactions" actually minimum? Work happened on `feat/algorithmic-hardening`.

## 7. Checking the review before acting on it

A code review of Phase 1 proposed several changes. Rather than implement them on trust, each claim got checked against the code or brute-forced. Two did not survive:

- **"Greedy misses cases like Alice +100 / Bob −100 / Carol +50 / Dave −50."** Greedy returns 2 payments there, which is already optimal — sorting both sides descending happens to align the exact matches. The *concern* was sound, the example wasn't.
- **"Removing a participant from an exact split may fall through to largest-remainder."** It doesn't. The submit path iterates `participantIds`, so a removed person is excluded from the sum, validation blocks the mismatch, and `exact` has its own branch in `computeShares` that never reaches the apportionment code.

The underlying concerns were still worth acting on, which is why the prepass and invariant work stayed in. But the specific claims were wrong, and implementing them as stated would have added code for non-problems.

**Greedy really is suboptimal, though.** Brute-forced against the true minimum over 200,000 random instances: suboptimal in **5.74%** of cases, by up to 2 extra transactions. So the conclusion held even though the example didn't.

## 8. Independent audit — the interesting finds

Checking the review's list meant reading the algorithms closely, which turned up five more issues it hadn't raised.

**The split calculator did its core arithmetic in floating point.** `distributeByWeights` computed each share as `total * weight / totalWeight` in floats and compared float fractional parts to decide who absorbed the leftover cent — inside the one module whose entire premise is that money never touches floats. The float fraction isn't the true remainder, so the extra cent landed on the wrong participant about once in 13,000 splits (31 cases per 400,000). Notably the `sum === total` invariant *never* broke across 400,000 trials, so this was a fairness defect rather than a money leak — the kind of thing that passes every test you'd think to write. Fixed by integer division plus `%` for the exact remainder, which needs integer weights, which is what made basis points a prerequisite rather than just a nice idea.

**`Int32Array` in the new exact solver would have overflowed** — caught while designing it, before writing it. Int32 caps at Rs. 21,474,836.47; a larger group total wraps silently negative and produces wrong groupings. Float64 holds integers exactly to 2^53.

**`computeBalances` turned everything into `NaN`** if an expense referenced an unknown person id: `balances[unknownId] += n` evaluates `undefined + n` to `NaN` *and* adds a phantom key, so one bad reference poisons every balance, the zero-sum check and the settlement, surfacing as "Rs. NaN".

**`Math.round(parseFloat(x) * 100)` isn't exact** — `2.675 * 100` is `267.4999…`, rounding to 267. And `step="0.01"` doesn't stop anyone typing `0.006`, which was silently accepted as 1 minor unit.

**`crypto.randomUUID()` is undefined outside a secure context** — over plain `http://` on a LAN, which is a realistic way to use this on an actual trip, adding a person would throw.

## 9. Making settle-up provably optimal

The key realisation: minimum payments for n people is exactly `n − k`, where `k` is the largest number of disjoint zero-sum groups the balances partition into. Each group needs `|group| − 1` payments and can't beat that, because a maximal partition leaves no proper zero-sum subset inside any group. So maximise `k` (bitmask DP over subsets), then settle greedily *within* each group — greedy is provably optimal there.

Bounded at 16 nonzero balances by measurement, not guesswork: worst case 23ms at n=16, 149ms at n=18, 2.1s at n=20. The bound counts *nonzero balances*, not group size, so a 30-person trip where most people come out even still gets the exact answer.

Exact-pair stripping runs first. It was verified safe over 118,000 instances (zero cases where it reduced the achievable `k`) and pays off twice — it shrinks the DP's search space, and it takes the >16 fallback from 5.74% to 1.75% suboptimal.

Testing this needed care: validating the DP against itself would prove nothing. The oracle is the recursive optimal-account-balancing search — a deliberately different algorithm — run across 3,000 random instances.

## 10. What stayed the same

Every optimisation had to leave correct output untouched, so that was the primary regression check. The acceptance scenario is unaffected by all of it, and for verifiable reasons rather than luck:

- **Rotation** doesn't change it — all three expenses either divide evenly (12,000/4 and 6,000/2) or are exact splits, so no remainder ever arises.
- **The exact solver** doesn't change it — those balances have no proper zero-sum subset, so `k=1`, one group of four, same 3 payments.
- **The personId tie-break** doesn't change it — no two balances tie.

Confirmed in a real browser after the rewrite: same balances, same 3-payment trace, now annotated "6 payments → 3, provable minimum."

## 11. Final checks

- `npm run test` — 65/65 passing across 5 suites, including the oracle and fuzz tests.
- `npx tsc --noEmit` and `npm run build` — clean.
- Browser regression: acceptance scenario byte-identical to Phase 1; 99.99% percentage split rejected; 3-decimal amount rejected with inline feedback; rotation spread the extra cent across Alice, Bob and Carol over 6 identical splits; hand-corrupted `localStorage` fell back to empty state with no "Rs. NaN" anywhere; zero console errors.
