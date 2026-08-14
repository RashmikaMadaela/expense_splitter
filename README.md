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
- **Money stored as integer minor units (paisa/cents, rupees × 100) everywhere in state.** This is the core rounding strategy: JS floating-point arithmetic on decimal rupee values drifts (e.g. repeated `x * 0.3333`), which is exactly the failure mode the brief calls out. By keeping every stored and computed amount an integer, every sum is exact by construction.
- **Rounding remainder distribution — Largest-Remainder (Hamilton apportionment) method.** For Equal and Percentage splits, each participant's raw share is computed, floored, and the leftover minor units (the "extra cent(s)") are handed out one at a time to whoever was rounded down the most, tie-broken by the order participants were selected in. For a plain equal split this reduces to "the first N participants in split order absorb the extra rupee-cent," which is the exact behavior the brief's Rs. 100 / 3-way example expects. For Exact splits, no algorithm runs at all — the user's literally-entered amounts become the shares, since the brief's own walkthrough example shows the user manually assigning the extra cent (Dave gets 3333.34, not 3333.33).
- **Both bonus split types were built** (Exact Amount *and* Percentage), not just one of the two required — this covers both variants of the brief's walkthrough scenario.
- **Balances are always fully recomputed from source data** (people + expenses), never incrementally patched. This trades a small amount of performance (irrelevant at this scale) for eliminating an entire class of drift bugs when an expense is edited or deleted.
- **Settle Up uses a greedy "largest creditor vs. largest debtor" heuristic**, not an exhaustively optimal solver. It repeatedly matches the biggest positive balance against the biggest negative balance until everyone is at zero. This always produces at most N−1 transactions for N people (a real minimization vs. the full pairwise-debt list) and matches the brief's acceptance scenario exactly. True global-minimum transaction count is NP-hard in general (related to subset-sum/bin-packing); greedy is the standard, expected approach for an app like this and is not guaranteed optimal in every pathological case, but is optimal or near-optimal for all normal group-expense scenarios.
- **Mismatched splits (bonus) are blocked at save time, not auto-adjusted or silently allowed.** For Exact splits, entered amounts must sum to the expense total exactly. For Percentage splits, entered percentages must sum to 100 within a ±0.01 tolerance (to allow values like 33.33/33.33/33.34). This was the simplest of the reasonable options (block vs. auto-adjust vs. warn-only) and keeps the source of truth unambiguous — the user always knows exactly what they entered.
- **No person deletion.** The brief only asks for *adding* people to a group; removing someone who's already referenced in existing expenses raises data-integrity questions (reassign their shares? block deletion? orphan the reference?) that aren't specified. Rather than half-implement this, it's left out — see "Left incomplete" below.
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

This scenario is also captured as an automated test in `src/lib/__tests__/balances.test.ts` and `src/lib/__tests__/settleUp.test.ts`.

## What I'd do differently / build next with more time

- **Person deletion / reassignment** — with a clear spec on what should happen to their existing expense shares (block deletion while referenced, vs. a reassignment flow).
- **Multi-currency support** — the money layer is already isolated behind `src/lib/money.ts`, so this is a contained change, but the brief explicitly scopes to LKR only.
- **Auto-adjust option for mismatched splits** — e.g. a "distribute the remainder for me" button for Exact/Percentage splits, instead of only blocking with an error.
- **Expense-level notes/categories/dates** — kept the data model minimal since the brief prioritizes split/settle-up correctness over feature breadth.
- **Component tests** — the test suite is intentionally scoped to the three pure-logic modules (`splitCalculator`, `balances`, `settleUp`), since that's where correctness actually lives; UI interaction tests (React Testing Library) were left out to keep the time budget on the math, though the app was manually verified end-to-end in a real browser against the acceptance scenario.

## What's left incomplete, and why

- **Person deletion** (see above) — deliberately out of scope rather than half-built, since the brief doesn't specify the intended behavior for expenses referencing a deleted person.
- **UI polish** — styling is minimal and functional per the brief's explicit guidance ("a correct, plain-looking app beats a beautiful one with wrong balances").
- Everything else in the brief's core requirements and the rounding/settle-up "must handle" section is implemented and tested.
