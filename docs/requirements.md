# BizTrack Malawi - Stage 1: Requirements Document

**Version:** 1.1 (LOCKED; FR-8 amended by owner)
**Status:** Approved and locked by owner, 2026-10-14. Amended 2026-10-14 (owner): FR-8 cash movement now includes credit-sale payments.
**Date:** 2026-10-14

---

## 1. Overview

BizTrack Malawi is an offline-first financial tracker for Malawian small
businesses. It lets a shop owner record daily transactions (cash sales, credit
sales, expenses) and see simple, honest summaries of where the business's money
is.

This is v1: a minimum viable product with four screens, built as a demonstration
of AI-directed software development, documented publicly.

## 2. Target user (persona)

A grocery shop owner in Blantyre who:
- Sells to walk-in customers, paid in cash or mobile money
- Buys stock from wholesalers; pays transport and utility costs
- Sometimes sells to regular customers on credit
- Keeps records in a notebook, in their head, or not at all
- Uses a low-to-mid range Android phone; has intermittent mobile data
- Has no accounting software, no accountant, and no accounting training

Assumptions for the demonstration scenario only; not claims about every shop.

## 3. Problem statement

Shop owners cannot easily answer: How much did I sell today? How much did I
spend? How much should be in the cash box? Who still owes me? Can I restock
tomorrow? Without these answers, businesses make sales yet still run short of
cash. The problem is not accounting knowledge; it is the absence of an easy way
to capture transactions and turn them into useful information.

## 4. Scope

**In scope (v1):**
- Recording cash sales, credit sales, and expenses
- Tracking customer debts and payments
- Today's financial summary (dashboard)
- Searchable transaction history
- Weekly report with CSV export
- Editable expense categories (sensible defaults provided)
- Full offline operation; data stays on the device

**Out of scope (v1, revisited later):**
- Cloud sync, accounts/login, multi-device use
- Inventory/stock levels or cost-of-goods-sold accounting
- Tax calculations or compliance features
- Supplier credit tracking
- Profit calculation (see requirement NFR-4)

## 5. Functional requirements

| ID | Requirement | Testable acceptance criterion |
|----|-------------|-------------------------------|
| FR-1 | Record a transaction with type (cash sale, credit sale, expense), amount, category, date, optional note | A cash sale can be recorded in under 30 seconds on a phone |
| FR-2 | Validate input: amount must be a positive number with at most two decimal places (kwacha and tambala); type and date required; date defaults to today | Invalid input is rejected with a clear message; no bad data is stored; amounts with more than two decimals are rejected |
| FR-3 | A credit sale requires a customer name and is recorded against that customer | Credit sale appears in the customer's outstanding balance |
| FR-4 | Record a payment received from a customer; it reduces that customer's outstanding balance | Paying MK20,000.00 against MK35,000.00 total leaves MK15,000.00 outstanding |
| FR-5 | Transactions list, newest first, searchable by text, filterable by type and date | Owner can find a specific transaction within 10 seconds |
| FR-6 | Edit or delete a transaction, with confirmation; summaries recalculate | Editing an amount updates all affected figures immediately |
| FR-7 | Dashboard shows today's totals: sales, expenses, net cash movement, total outstanding customer balances | Figures match the transactions recorded for that date |
| FR-8 | Credit sales are counted as sales but NOT as cash received. Payments received against credit sales ARE counted as cash received on the day the payment happens | Cash movement = cash sales + debt payments received - expenses; outstanding balances reflect both |
| FR-9 | Weekly report: totals for sales, expenses, stock purchases, debts incurred, payments received; exportable as CSV | Exported file opens correctly in Excel/LibreOffice |
| FR-10 | The application works fully offline, including adding a first transaction with no connectivity | All FR-1 to FR-9 pass with airplane mode on |
| FR-11 | The expense category list is user-editable: the owner can add new categories; default categories are provided; the editing flow must be discoverable from the transaction entry screen | Owner can add a category (e.g. "Packaging") and immediately use it for a new expense |

## 6. Non-functional requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Mobile-first: usable one-handed on a low-end Android; tap targets >= 44px |
| NFR-2 | Dashboard renders in under 2 seconds on a mid-range phone |
| NFR-3 | All data stays on the device. No network transmission of transaction data in v1. |
| NFR-4 | The app must never present cash movement as profit. Where a figure could be misread as profit, label it explicitly as cash movement and note that it is not profit. |
| NFR-5 | Amounts are in Malawi Kwacha with tambala supported (up to two decimal places), because mobile money transactions include tambala. Formatted with thousands separators: MK85,000.50 |
| NFR-6 | Dates are local to the device; "today" means the device's local date |
| NFR-7 | Installable as a home-screen app (PWA); launches offline via service worker |
| NFR-8 | English interface in v1; Chichewa localisation deferred |

## 7. Success criteria (v1 acceptance)

1. A shop owner can record a cash sale in under 30 seconds.
2. The owner can view today's recorded transactions and totals.
3. The owner can identify customers with outstanding balances and record payments.
4. Everything above works in airplane mode, from first launch.
5. A weekly report can be exported as CSV.
6. No figure displayed anywhere misrepresents cash movement as profit.
7. The owner can add an expense category without leaving the entry flow.

## 8. Owner review decisions (2026-10-14)

| Question | Decision |
|----------|----------|
| Expense categories fixed or editable? | **Editable** - user can add categories; defaults provided; editing flow visible from the entry screen |
| Customer names on cash sales? | **No** - cash sales stay minimal, no name field |
| Tambala decimals? | **Included** - two decimal places supported, driven by mobile money amounts |

---
This document is locked as v1.0. Changes require a new version and explicit owner approval.


---

## v1.2 Amendment (2026-10-19, owner-approved)

The app is a **cashflow tracker**. Terminology now follows cashflow terms throughout:

- **FR-10:** The dashboard and reports use **inflow** (cash sales + debt received),
  **outflow** (money out + supplier payments), and **net cashflow**. "Expense" is
  renamed **Money out** (stock purchases, bills, any spending). Credit sales and
  credit purchases move no cash and never appear in inflow/outflow.
- **FR-11 (payables tracking):** The owner can record **credit purchases**
  (bought on credit, creates a payable) and **supplier payments** (cash paid to a
  supplier), view per-supplier balances on a "You owe suppliers" dashboard card,
  and overpayment shows as "paid ahead" - mirroring the customer receivables flow.
- **FR-12:** The transactions list and CSV use a unified **Party** column
  (customer or supplier) and the six transaction types.
- Existing data is unchanged; recorded "expense" transactions display as Money out.


---

## v1.3 Amendment (2026-10-19, owner-approved)

- **D22 - Dashboard cards:** Net cashflow is a hero card with a 7-day trend strip
  (CSS-only bars). Inflow/outflow and the two debt totals render as card pairs in
  a 2-column grid, with cash-in (green) and cash-out (red-brown) accent edges.
- **Validation rules (all owner-approved):**
  - **V1:** Debt received and supplier payments are only accepted for existing
    customers/suppliers. New parties are created by credit sales / credit
    purchases - the transaction where the debt begins.
  - **V2:** Overpayments warn and require confirmation ("will be recorded as paid ahead").
  - **V3:** Duplicate entries (same type, amount, party, date within 60s) ask before saving.
  - **V4:** Single entries above MK1,000,000 ask for confirmation.
  - **V5:** Dates older than a week show a notice (never a block).
  - **V6:** Changing a transaction's type during edit requires confirmation.
  - **V7:** Names are trimmed, whitespace-collapsed, and all-numeric names rejected.
