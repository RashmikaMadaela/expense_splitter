# Expense Splitter

A small single-session app for splitting shared trip expenses (LKR) and figuring out who owes whom, with a minimized "Settle Up" transaction list.

## How to run

Requires Node.js 18+.

```bash
npm install
npm run dev       # starts the app at http://localhost:5173
```

Other scripts:

```bash
npm run test      # run the unit test suite (Vitest)
npm run build     # type-check + production build
```

There is no backend and no login — everything runs client-side and persists to your browser's `localStorage`.

## Assumptions

- **Persistence: `localStorage`.** The brief frames this as a single-session tool with no accounts, so a lightweight browser-persisted store was chosen over a database or backend — it survives a page refresh but stays entirely local, letting the time budget go toward the split/settle-up logic instead of infrastructure.
- **Currency: LKR only**, displayed as `Rs. 1,234.56`. No multi-currency support.
- **Money stored as integer minor units (paisa/cents, rupees × 100) everywhere in state, with no floating-point arithmetic anywhere in the money path.** This is the core rounding strategy: JS floating-point arithmetic on decimal rupee values drifts (e.g. repeated `x * 0.3333`), which is exactly the failure mode the brief calls out. Amounts are parsed from their decimal *string* straight to integers rather than via `Math.round(parseFloat(x) * 100)` — the latter is not exact (`2.675 * 100` is `267.4999…`, which rounds to `267`, a cent short). Inputs with more than 2 decimal places are rejected rather than silently rounded.
- **Rounding remainder distribution — Largest-Remainder (Hamilton apportionment) method, in exact integer arithmetic.** Each participant gets `floor(total × weight / totalWeight)`, computed by integer division, and the leftover minor units go to whoever was rounded down the most — ranked by the true integer remainder (`%`), not a float fraction. For Exact splits no algorithm runs at all: the user's literally-entered amounts become the shares, since the brief's own walkthrough shows the user manually assigning the extra cent (Dave gets 3333.34, not 3333.33).
- **The leftover cent rotates between expenses.** Which participant absorbs an indivisible remainder is seeded from the expense id, so the same person doesn't pay it on every single equal split. It's applied only as a tie-break — a larger true remainder always outranks rotation — so proportional splits stay correct, and it's deterministic, so the same expense always allocates the same way.
- **Percentages stored as integer basis points** (10000 bp = 100%), required to sum to exactly 100%. A float tolerance (say ±0.01) would accept a split summing to 99.99%, which the allocator — apportioning by relative weight — would then quietly scale back up to the full expense amount, charging the user 100% while they believed they'd entered 99.99%. Integer basis points make it an exact comparison with no epsilon.
- **Both bonus split types were built** (Exact Amount *and* Percentage), not just one of the two required — this covers both variants of the brief's walkthrough scenario.
- **Balances are always fully recomputed from source data** (people + expenses), never incrementally patched. This trades a small amount of performance (irrelevant at this scale) for eliminating an entire class of drift bugs when an expense is edited or deleted.
- **Settle Up is solved exactly, not greedily.** The minimum number of payments for N people is exactly `N − k`, where `k` is the largest number of disjoint zero-sum groups the balances can be partitioned into: each group needs `|group| − 1` payments and can't do better, because a maximal partition leaves no proper zero-sum subset inside any group. The app maximises `k` with a bitmask DP over subsets, then settles within each group. This is bounded at **16 people with a nonzero balance** (measured worst case 23ms; n=18 is 149ms, n=20 is 2.1s), falling back to a greedy heuristic above that — note the bound counts people with a *nonzero net balance*, not group size, so a large trip where most people come out even still gets the exact answer. Minimising transaction count in general is NP-hard (it embeds subset-sum), which is why the exact path is bounded at all.

  The common greedy heuristic — repeatedly match the biggest creditor with the biggest debtor — is genuinely not optimal: brute-forced against the true minimum over 200,000 random instances, it was suboptimal in **5.74%** of cases, by up to 2 extra transactions. Stripping exactly-cancelling pairs first brings that to 1.75%, and the exact solver to 0%. The Settle Up screen shows what this buys (e.g. "would take 6 payments, this needs 3").
- **Mismatched splits (bonus) are blocked at save time, not auto-adjusted or silently allowed.** For Exact splits, entered amounts must sum to the expense total exactly; for Percentage splits, to exactly 100%. This was the simplest of the reasonable options (block vs. auto-adjust vs. warn-only) and keeps the source of truth unambiguous — the user always knows exactly what they entered.
- **Stored shares are canonical, never re-derived.** `rawExactInputsMinor` / `rawPercentageBp` exist to repopulate the edit form, but an expense's `shares` are computed once at write time and never recomputed. This means changing the split algorithm doesn't retroactively rewrite past expenses — financial history stays immutable — and the invariant check is what keeps stored shares self-consistent.
- **The share-sum invariant is enforced at both trust boundaries.** An expense whose shares don't account for its total throws at the reducer (a programmer error — the form validates first), while state loaded from `localStorage` is treated as untrusted input and discarded in favour of a clean slate if it fails validation. This matters because a single reference to an unknown person id would otherwise make every balance `NaN`.
- **Person removal is allowed only while nobody references them.** Removing someone already referenced by an expense raises data-integrity questions the brief doesn't specify (reassign their shares? orphan the reference?). Rather than pick an answer, removal is refused while any expense names the person as payer, participant or share holder — the button is disabled with the reason, and the reducer enforces it independently so the UI and the state layer can't disagree. Renaming is always allowed, because ids are stable and every reference is by id.
- **Duplicate names are rejected** (case-insensitive, trimmed). Two people called "Alice" are indistinguishable in the payer dropdown, the participant checkboxes, the balances list and every settlement line.
- **Clear all data** resets the group so the app can be reused for a new trip, behind a confirmation that states exactly what will be deleted.
- **Tech stack: React + TypeScript + Vite**, no UI kit, no external state management library (React Context + `useReducer` is sufficient for two small in-memory arrays), no router (a persistent tab bar is enough for a single-page flow). Chosen to move fastest on the actual point of the exercise — correct split/rounding/settle-up math — rather than spend time on infrastructure the brief explicitly says doesn't matter.

## Verifying the brief's acceptance scenario

Running Alice/Bob/Carol/Dave through the three expenses in the brief produces:

| Person | Balance |
|---|---|
| Alice | is owed Rs. 5,666.67 |
| Bob | owes Rs. 9,333.33 |
| Carol | is owed Rs. 7,000.00 |
| Dave | owes Rs. 3,333.34 |

Sums to exactly Rs. 0. Settle Up produces exactly 3 transactions:

- Bob pays Carol Rs. 7,000.00
- Dave pays Alice Rs. 3,333.34
- Bob pays Alice Rs. 2,333.33

This scenario is also captured as an automated test in `src/lib/__tests__/balances.test.ts` and `src/lib/__tests__/settleUp.test.ts`, which additionally assert that 3 is the *provable* minimum for these balances.

Beyond the fixed scenario, the suite includes property tests: the settle-up solver is checked against an independent brute-force oracle (the recursive optimal-account-balancing search — a deliberately different algorithm, since testing the DP against itself would prove nothing) across thousands of random instances, asserting the result is optimal, reconstructs every balance exactly, and never emits a zero-amount or self-directed payment. The split calculator is fuzzed over 20,000 random splits asserting shares always total exactly and are never negative.

## What I'd do differently / build next with more time

- **Reassigning a referenced person** — removal is currently blocked while someone is referenced; a "replace Alice with Bob across these 3 expenses" flow would handle the case where somebody was added twice under different spellings.
- **Multi-currency support** — the money layer is already isolated behind `src/lib/money.ts`, so this is a contained change, but the brief explicitly scopes to LKR only.
- **Auto-adjust option for mismatched splits** — e.g. a "distribute the remainder for me" button for Exact/Percentage splits, instead of only blocking with an error.
- **Expense-level notes/categories/dates** — kept the data model minimal since the brief prioritizes split/settle-up correctness over feature breadth.
- **Component tests** — the test suite is intentionally scoped to the pure-logic modules, since that's where correctness actually lives; UI interaction tests (React Testing Library) were left out to keep the time budget on the math, though the app was driven end-to-end in a real headless browser against the acceptance scenario and every hardening change.
- **Raise the exact-solver bound** — a smarter search (branch-and-bound, or memoising across the greedy prefix) could push past 16 nonzero balances without the 3ⁿ blow-up. Not worth it for realistic group sizes, but it's the obvious next algorithmic step.
- **Surface the rotation** — the app tells you a split didn't divide evenly, but doesn't say *who* absorbed the extra cent. A one-line "Bob covers the extra Rs. 0.01" would make the rounding policy visible rather than merely correct.

## What's left incomplete, and why

- **Removing a person who is referenced by an expense** — refused rather than half-implemented, since the brief doesn't specify what should happen to their shares. Delete the expenses first, or rename them if it was a typo.
- **No undo** — Clear all data and expense deletion are confirmed but not reversible.
- **No component tests** — logic is well covered, but the UI is verified by driving a real headless browser rather than by unit tests.
- Everything in the brief's core requirements and the rounding/settle-up "must handle" section is implemented and tested.

## Accessibility and responsiveness

Every interactive element has a visible `:focus-visible` ring and the app is fully keyboard-navigable; the confirmation dialog uses the native `<dialog>` element, so focus trapping and Esc-to-cancel come from the platform. The layout stacks below 640px with 44px touch targets and no horizontal overflow at 320px and up, and colours are defined as custom properties with a `prefers-color-scheme: dark` override.
