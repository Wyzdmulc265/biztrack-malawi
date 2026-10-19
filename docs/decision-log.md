# Decision Log

| # | Date | Decision | Rationale | Approved by |
|---|------|----------|------------|-------------|
| 1 | 2026-10-14 | Target problem: SME financial records / cash flow management | Documented Malawian SME challenge; strong demo value | Owner |
| 2 | 2026-10-14 | MVP scope: 4 screens (Dashboard, Add Transaction, Transactions, Reports) | Small, reliable first version | Owner |
| 3 | 2026-10-14 | Mobile-friendly web app | Matches shop-owner usage patterns | Owner |
| 4 | 2026-10-14 | Offline-first: device-only storage (IndexedDB) in v1, sync deferred | Real Malawian connectivity constraint; simpler security story | Owner |
| 5 | 2026-10-14 | Static PWA: plain HTML/CSS/JS, no framework, no build step | Fewer dependencies; readable; no running costs | Owner |
| 6 | 2026-10-14 | Host outside Base44: GitHub repo + Cloudflare Pages (free tiers) | Zero cost; commit history as documentation evidence | Owner |
| 7 | 2026-10-14 | Hosting: Cloudflare Pages (not GitHub Pages) | Free tier deploys private repos; preview URLs for branch reviews | Owner |
| 8 | 2026-10-14 | Branch workflow: `develop` for agent work, `main` protected for owner merge | Human approval gate enforced at merge time, not just chat time | Owner |
| 9 | 2026-10-14 | Expense categories user-editable; defaults shipped; add flow reachable from entry screen | Owner decision at requirements review |
| 10 | 2026-10-14 | No customer names on cash sales | Owner decision; keep cash entry minimal |
| 11 | 2026-10-14 | Tambala (2 decimal places) supported, not whole-kwacha-only | Owner decision; mobile money amounts include tambala |
| 12 | 2026-10-14 | Requirements document locked as v1.0 | Owner approval gate passed | Owner |
| 13 | 2026-10-14 | Future dates blocked entirely; today is latest allowed | Owner decision at design review |
| 14 | 2026-10-14 | Deleting credit sale keeps customer record; only transaction removed | Owner decision at design review |
| 15 | 2026-10-14 | Weekly CSV = full transaction list + totals rows at end | Owner decision at design review |
| 16 | 2026-10-14 | Design document locked as v1.0 | Owner approval gate passed | Owner |
| 17 | 2026-10-14 | Cash movement redefined: cash sales + credit-sale payments - expenses (payments are cash received) | Owner decision; FR-8/design amended, docs to v1.1 |


## D18 - Cashflow terminology (2026-10-19)
App-wide relabel to cashflow terms: inflow (cash sales + debt received), outflow
(money out + supplier payments), net cashflow. "Expense" -> "Money out" (internal
type string unchanged; includes purchases). Owner-requested: the app is a cashflow
tracker, and its language should say so.

## D19 - Payables tracking (2026-10-19)
Added supplier-side mirror of debt tracking: suppliers store, credit purchase and
supplier payment types, "You owe suppliers" card with pay flow, "paid ahead" advance
handling. Closes a v1.0 gap: the app tracked receivables but not payables.

## D20 - Delete moves into edit screen (2026-10-19)
List rows no longer carry a Delete button once the UI/UX phase lands; deleting
happens from the edit screen behind the existing confirmation. Two-step intent
instead of a destructive button next to everyday taps. Owner approved.

## D21 - UI/UX direction (2026-10-19)
Light theme only (no dark mode in this release); typographic app icon; the four
proposed redesign phases are combined and built as two phases: (A) cashflow +
payables feature, (B) combined UI/UX redesign. Owner approved.
