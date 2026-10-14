# BizTrack Malawi - Stage 1: Requirements Document

**Version:** 0.1 (draft for owner review)
**Status:** Awaiting approval
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
| FR-2 | Validate input: amount must be a positive whole number of kwacha; type and date required; date defaults to today | Invalid input is rejected with a clear message; no bad data is stored |
| FR-3 | A credit sale requires a customer name and is recorded against that customer | Credit sale appears in the customer's outstanding balance |
| FR-4 | Record a payment received from a customer; it reduces that customer's outstanding balance | Paying 20,000 against 35,000 total leaves 15,000 outstanding |
| FR-5 | Transactions list, newest first, searchable by text, filterable by type and date | Owner can find a specific transaction within 10 seconds |
| FR-6 | Edit or delete a transaction, with confirmation; summaries recalculate | Editing an amount updates all affected figures immediately |
| FR-7 | Dashboard shows today's totals: sales, expenses, net cash movement, total outstanding customer balances | Figures match the transactions recorded for that date |
| FR-8 | Credit sales are counted as sales but NOT as cash received | Cash movement excludes credit sales; outstanding balances include them |
| FR-9 | Weekly report: totals for sales, expenses, stock purchases, debts incurred, payments received; exportable as CSV | Exported file opens correctly in Excel/LibreOffice |
| FR-10 | The application works fully offline, including adding a first transaction with no connectivity | All FR-1 to FR-9 pass with airplane mode on |

## 6. Non-functional requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Mobile-first: usable one-handed on a low-end Android; tap targets >= 44px |
| NFR-2 | Dashboard renders in under 2 seconds on a mid-range phone |
| NFR-3 | All data stays on the device. No network transmission of transaction data in v1. |
| NFR-4 | The app must never present cash movement as profit. Where a figure could be misread as profit, label it explicitly as cash movement and note that it is not profit. |
| NFR-5 | Amounts are whole Malawi Kwacha (no tambala decimals); formatted with thousands separators (e.g. MK85,000) |
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

## 8. Open questions for owner review

1. Should the expense categories be a fixed list (stock purchase, transport, utilities, salaries, other) or user-editable? **Draft proposal: fixed list in v1, "other" as catch-all.**
2. Should a cash sale be able to reference a customer (e.g. for a returning customer paying cash)? **Draft proposal: no in v1; keep entry minimal.**
3. Confirm: currency formatting with commas (MK85,000) matches local habit?

---
*Prepared by the AI agent for owner review. No implementation begins until this document is approved.*
