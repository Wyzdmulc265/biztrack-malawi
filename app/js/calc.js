// BizTrack Malawi - calculation module (design v1.0, section 4)
// ONE source of financial truth. Dashboard, list and Reports all call these
// functions. Totals are always computed from transactions, never stored.
// All arithmetic is integer tambala - no floats.
'use strict';

// Totals for a single local date (YYYY-MM-DD).
// sales = cash + credit sales. cashMovement = cash sales + payments - expenses (FR-8 v1.1:
// credit sales are sales but NOT cash received).
function totalsForRange(txs, startISO, endISO) {
  let cashSales = 0, creditSales = 0, expenses = 0, payments = 0;
  for (const t of txs) {
    if (t.date < startISO || t.date > endISO) continue;
    if (t.type === 'cash_sale') cashSales += t.amountT;
    else if (t.type === 'credit_sale') creditSales += t.amountT;
    else if (t.type === 'expense') expenses += t.amountT;
    else if (t.type === 'payment') payments += t.amountT;
  }
  return {
    cashSales,
    creditSales,
    sales: cashSales + creditSales,
    expenses,
    payments,
    // FR-8 (v1.1): credit sales are NOT cash received; payments ARE.
    cashMovement: cashSales + payments - expenses
  };
}

// Totals for a single local date (YYYY-MM-DD).
function totalsForDate(txs, date) {
  return totalsForRange(txs, date, date);
}

// Outstanding balance per customer = credit sales - payments received.
// Negative = the customer has paid more than owed (an advance, design 5).
function outstandingByCustomer(txs) {
  const out = {};
  for (const t of txs) {
    if (!t.customerId) continue;
    if (!(t.customerId in out)) out[t.customerId] = 0;
    if (t.type === 'credit_sale') out[t.customerId] += t.amountT;
    else if (t.type === 'payment') out[t.customerId] -= t.amountT;
  }
  return out;
}

// Total outstanding debts owed TO the business (advances excluded).
function totalOutstanding(txs) {
  const out = outstandingByCustomer(txs);
  let total = 0;
  for (const id in out) if (out[id] > 0) total += out[id];
  return total;
}
