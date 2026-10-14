# BizTrack Malawi - Stage 2: Design Proposal

**Version:** 0.2 (owner review decisions incorporated)
**Status:** Awaiting approval. No implementation before approval.
**Implements:** Requirements v1.0 (docs/requirements.md)

---

## 1. Technology summary

Static PWA. Plain HTML/CSS/JS, no framework, no build step. IndexedDB for
storage, service worker for offline launch. Nothing else.

## 2. Data model

### 2.1 Storage rule: integer tambala

All amounts are stored as **integers in tambala** (1 kwacha = 100 tambala).
MK85,000.50 becomes `85000050`. Floats are never used for money. Conversion
happens exactly twice: at input (string -> integer) and at display
(integer -> formatted string). Both use string/safe-integer math only.

### 2.2 IndexedDB stores

**transactions** (keyPath: `id`, autoIncrement false)
```
{
  id: string            // UUID, generated locally
  type: 'cash_sale' | 'credit_sale' | 'expense' | 'payment'
  amountT: integer      // tambala
  categoryId: string    // expense only
  customerId: string    // credit_sale and payment only
  date: string          // local date, YYYY-MM-DD
  note: string          // optional
  createdAt: number
  updatedAt: number
}
Indexes: date, type, customerId, categoryId
```

**customers**
```
{ id: string, name: string, createdAt: number }
Index: name (unique, case-insensitive)
```

**categories** (expense categories)
```
{ id: string, name: string, builtin: boolean }
Defaults: Stock purchase, Transport, Utilities, Salaries, Rent, Other
```

Derived figures (totals, outstanding balances) are always **computed** from
transactions, never stored. One source of truth.

## 3. Screens

### 3.1 Dashboard
- Today's sales (cash + credit), today's expenses, net cash movement today
  (cash sales - expenses), total outstanding customer debts.
- Each figure labeled as cash movement where applicable, with explicit
  "This is money movement, not profit" note (NFR-4).
- Bottom navigation bar: Dashboard | + Add | List | Reports.

### 3.2 Add Transaction
- Segmented control first: Cash sale / Credit sale / Expense.
- Amount field: numeric keypad, MK prefix, accepts up to 2 decimals.
- Fields shown adapt to type: credit sale adds customer (with autocomplete of
  existing names), expense adds category (with "+ Add category" inline).
- Date defaults to today; editable; future dates blocked entirely (today is the latest allowed).
- Note (optional).
- Double-tap protection: Save button disables until write completes.

### 3.3 Transactions list
- Newest first, grouped by day, each row: type badge, amount, category or
  customer, note snippet. Filters: type and date range. Free-text search
  across note, customer, category.
- Tap row -> edit; delete behind a confirm dialog.

### 3.4 Reports
- Week picker (defaults to current week, Mon-Sun).
- Totals: sales (cash/credit split), expenses, payments received, new debts.
- CSV export (download via blob; works offline): full transaction list for the week, followed by totals rows at the end.

## 4. Calculations (exact definitions)

| Figure | Definition |
|--------|------------|
| Sales (day) | sum(amountT) of cash_sale + credit_sale on that date |
| Expenses (day) | sum(amountT) of expense on that date |
| Cash movement (day) | cash_sale sum - expense sum on that date |
| Outstanding per customer | sum(credit_sale) - sum(payment), per customerId |
| Total outstanding | sum over customers of per-customer outstanding (if positive) |

Reports use the same formulas over a date range. One calculation module feeds
dashboard, list, and reports; no per-screen re-implementations.

## 5. Validation rules

- Amount: required, > 0, at most 2 decimals, <= MK999,999,999.99; parsed from
  the raw string digit-by-digit (no parseFloat on user input).
- Credit sale: customer name required, 1-40 chars; duplicates merged by
  case-insensitive match (suggest existing customer).
- Expense: category required.
- Date: required, never in the future (today is the latest), no earlier than 1 year ago.
- Payment: customer required; amount may exceed outstanding (overpayment
  allowed, shown as "advance").

## 6. Failure cases and edge behavior

| Case | Behavior |
|------|----------|
| Double-tap Save | Button disabled during write; id generated once |
| IndexedDB unavailable / storage full | Error banner; entry kept in-memory draft and retried |
| Deleting a category in use | Blocked; only unused categories deletable |
| Deleting a customer with outstanding balance | Blocked while outstanding != 0 |
| Overpayment | Allowed; outstanding shows negative, displayed as advance |
| Midnight rollover with app open | "Today" computed at read time, not at launch |
| Empty state (no transactions) | Friendly guidance on Dashboard and list |
| Corrupted/missing record fields | Row skipped in totals, counted in a data health check on Reports |

## 7. Security stance

- No network calls at runtime except the Cloudflare host serving the app itself.
- No eval, no third-party scripts, no analytics in v1.
- Service worker caches app shell only; data never leaves IndexedDB.

## 8. Owner review decisions (2026-10-14)

| Question | Decision |
|----------|----------|
| Future dates? | **Blocked entirely.** Today is the latest allowed date; no +1 day allowance. |
| Deleting a credit sale transaction? | **Customer record (name) stays; only the transaction figure is deleted.** Customers are never auto-deleted. |
| CSV scope? | **Full transaction list for the week, with totals at the end.** |

---
*Prepared by the AI agent for owner review. Implementation begins only after approval.*
