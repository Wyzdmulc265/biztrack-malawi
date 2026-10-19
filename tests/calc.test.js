// BizTrack Malawi - Stage 4 independent test suite
// Tests the SHIPPED modules (app/js/money.js + app/js/calc.js).
// Every expected value below was hand-computed from docs/requirements.md v1.1
// and docs/design.md v1.1 BEFORE running the code. No expected value is
// derived from the implementation under test.
// Run: node tests/calc.test.js  (exits non-zero on any failure)
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src =
  fs.readFileSync(path.join(__dirname, '..', 'app', 'js', 'money.js'), 'utf8') +
  '\n' +
  fs.readFileSync(path.join(__dirname, '..', 'app', 'js', 'calc.js'), 'utf8');
const ctx = vm.createContext({});
vm.runInContext(src, ctx);
const { parseAmountT, formatMK, totalsForRange, totalsForDate, outstandingByCustomer, totalOutstanding, cashflowForRange, payablesBySupplier, totalPayable } = ctx;

let pass = 0, fail = 0;
function eq(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name + ' -> got ' + a + ', expected ' + e); }
}

console.log('--- money: parseAmountT ---');
eq('plain kwacha "20" -> 2000T', parseAmountT('20'), { ok: true, amountT: 2000 });
eq('one decimal "20.5" -> 2050T', parseAmountT('20.5'), { ok: true, amountT: 2050 });
eq('two decimals "20.50" -> 2050T', parseAmountT('20.50'), { ok: true, amountT: 2050 });
eq('tambala only "0.99" -> 99T', parseAmountT('0.99'), { ok: true, amountT: 99 });
eq('thousands comma "1,500" -> 150000T', parseAmountT('1,500'), { ok: true, amountT: 150000 });
eq('leading plus "+250" -> 25000T', parseAmountT('+250'), { ok: true, amountT: 25000 });
eq('surrounding spaces " 12.75 "', parseAmountT(' 12.75 '), { ok: true, amountT: 1275 });
eq('three decimals "0.995" rejected', parseAmountT('0.995'), { ok: false, error: 'Maximum 2 decimal places (tambala)' });
eq('empty string rejected', parseAmountT(''), { ok: false, error: 'Amount is required' });
eq('letters "abc" rejected', parseAmountT('abc'), { ok: false, error: 'Enter a valid amount in kwacha' });
eq('negative "-5" rejected', parseAmountT('-5'), { ok: false, error: 'Enter a valid amount in kwacha' });
eq('zero "0" rejected', parseAmountT('0'), { ok: false, error: 'Amount must be greater than zero' });
eq('"0.00" rejected', parseAmountT('0.00'), { ok: false, error: 'Amount must be greater than zero' });
eq('max allowed "999999999.99"', parseAmountT('999999999.99'), { ok: true, amountT: 99999999999 });
eq('above max "1000000000.00" rejected', parseAmountT('1000000000.00'), { ok: false, error: 'Amount is too large' });

console.log('--- money: formatMK ---');
eq('formatMK(0)', formatMK(0), 'MK0.00');
eq('formatMK(5) -> five tambala', formatMK(5), 'MK0.05');
eq('formatMK(99)', formatMK(99), 'MK0.99');
eq('formatMK(12345678)', formatMK(12345678), 'MK123,456.78');
eq('formatMK(-1500000)', formatMK(-1500000), '-MK15,000.00');
eq('formatMK(MAX_AMOUNT_T)', formatMK(99999999999), 'MK999,999,999.99');

// Hand-built week scenario: Mon 2026-10-12 .. Sun 2026-10-18, plus two
// out-of-range transactions for boundary isolation.
const TXS = [
  { type: 'cash_sale',    amountT: 125000,  date: '2026-10-12' },
  { type: 'expense',      amountT: 35050,   date: '2026-10-12' },
  { type: 'credit_sale',  amountT: 800000,  date: '2026-10-13', customerId: 'A' },
  { type: 'cash_sale',    amountT: 9999,    date: '2026-10-13' },
  { type: 'payment',      amountT: 500000,  date: '2026-10-14', customerId: 'A' },
  { type: 'credit_sale',  amountT: 200000,  date: '2026-10-14', customerId: 'B' },
  { type: 'cash_sale',    amountT: 1000000, date: '2026-10-15' },
  { type: 'expense',      amountT: 75000,   date: '2026-10-15' },
  { type: 'payment',      amountT: 900000,  date: '2026-10-16', customerId: 'A' },
  { type: 'payment',      amountT: 150000,  date: '2026-10-17', customerId: 'B' },
  { type: 'cash_sale',    amountT: 42025,   date: '2026-10-18' },
  { type: 'cash_sale',    amountT: 100000,  date: '2026-10-19' }, // next Monday: OUT
  { type: 'cash_sale',    amountT: 55500,   date: '2026-10-11' }  // previous Sunday: OUT
];
// Hand-computed expectations (integer tambala):
//   cash in week: 125000+9999+1000000+42025 = 1177024  (MK11,770.24)
//   credit in week: 800000+200000 = 1000000             (MK10,000.00)
//   sales = 2177024                                     (MK21,770.24)
//   expenses = 35050+75000 = 110050                     (MK1,100.50)
//   payments = 500000+900000+150000 = 1550000           (MK15,500.00)
//   cash movement = 1177024+1550000-110050 = 2616974   (MK26,169.74)

console.log('--- calc: weekly totals (FR-9) ---');
const w = totalsForRange(TXS, '2026-10-12', '2026-10-18');
eq('week cash sales', w.cashSales, 1177024);
eq('week credit sales', w.creditSales, 1000000);
eq('week total sales (cash + credit, FR-5)', w.sales, 2177024);
eq('week expenses', w.expenses, 110050);
eq('week payments received', w.payments, 1550000);
eq('week cash movement = cash + payments - expenses (FR-8 v1.1 / D17)', w.cashMovement, 2616974);

console.log('--- calc: date totals + boundary isolation ---');
const d = totalsForDate(TXS, '2026-10-12');
eq('10-12 cash sales', d.cashSales, 125000);
eq('10-12 expenses', d.expenses, 35050);
eq('10-12 cash movement', d.cashMovement, 89950);
const before = totalsForDate(TXS, '2026-10-11');
eq('boundary: Sunday before week excluded', before.sales, 55500);
const after = totalsForDate(TXS, '2026-10-19');
eq('boundary: Monday after week excluded', after.sales, 100000);
eq('range includes end date (10-18)', totalsForRange(TXS, '2026-10-18', '2026-10-18').cashSales, 42025);

console.log('--- calc: customer balances (FR-4) ---');
// A: 800000 credit - (500000+900000) payments = -600000 -> advance of MK6,000 (design 6)
// B: 200000 credit - 150000 payment = 50000 -> owes MK500
const out = outstandingByCustomer(TXS);
eq('customer A overpaid -> advance', out.A, -600000);
eq('customer B owes', out.B, 50000);
eq('total outstanding excludes advances', totalOutstanding(TXS), 50000);

// FR-4 acceptance example straight from requirements v1.0:
// MK35,000 credit sale, MK20,000 payment -> customer owes MK15,000
const fr4 = outstandingByCustomer([
  { type: 'credit_sale', amountT: 3500000, date: '2026-10-14', customerId: 'X' },
  { type: 'payment', amountT: 2000000, date: '2026-10-15', customerId: 'X' }
]);
eq('FR-4 requirements example: owes MK15,000', fr4.X, 1500000);

// Payment with no prior credit (direct advance) must not inflate outstanding
eq('payment-only customer excluded from totals', totalOutstanding([
  { type: 'payment', amountT: 700000, date: '2026-10-14', customerId: 'C' }
]), 0);

console.log('--- calc: empty database ---');
const z = totalsForRange([], '2026-10-12', '2026-10-18');
eq('empty db -> all zeros', [z.sales, z.expenses, z.payments, z.cashMovement], [0, 0, 0, 0]);
eq('empty db -> no outstanding', totalOutstanding([]), 0);

// Hand-computed v1.2 scenario (all tambala):
//   inflow  = cash sale 100000 + debt received 500000 = 600000
//   outflow = money out 35050 + supplier payment 75000 = 110050
//   net cashflow = 489950
//   credit sale 800000 and credit purchase 200000 move NO cash
//   supplier S: owed 200000 - paid 75000 = 125000 payable
//   supplier T: purchase 300000 - paid 350000 = -50000 (advance)
//   total payable = 125000 (advance excluded)
const TX2 = [
  { type: 'cash_sale', amountT: 100000, date: '2026-10-13' },
  { type: 'credit_sale', amountT: 800000, date: '2026-10-13', customerId: 'A' },
  { type: 'payment', amountT: 500000, date: '2026-10-14', customerId: 'A' },
  { type: 'expense', amountT: 35050, date: '2026-10-15' },
  { type: 'supplier_payment', amountT: 75000, date: '2026-10-16', supplierId: 'S' },
  { type: 'credit_purchase', amountT: 200000, date: '2026-10-17', supplierId: 'S' }
];
console.log('--- calc v1.2: cashflow view (D18) ---');
const cf = cashflowForRange(TX2, '2026-10-12', '2026-10-18');
eq('v1.2 inflow = cash sales + debt received', cf.inflow, 600000);
eq('v1.2 outflow = money out + supplier payments', cf.outflow, 110050);
eq('v1.2 net cashflow', cf.netCashflow, 489950);
eq('v1.2 credit sale is NOT inflow (receivable, not cash)', cf.inflow, 600000);
eq('v1.2 credit purchase is NOT outflow (payable, not cash)', cf.outflow, 110050);
eq('v1.2 customer balance still works (800000 - 500000)', outstandingByCustomer(TX2).A, 300000);

console.log('--- calc v1.2: payables (D19) ---');
const TX3 = TX2.concat([
  { type: 'credit_purchase', amountT: 300000, date: '2026-10-13', supplierId: 'T' },
  { type: 'supplier_payment', amountT: 350000, date: '2026-10-14', supplierId: 'T' }
]);
const pb = payablesBySupplier(TX3);
eq('supplier S balance: owes 125000', pb.S, 125000);
eq('supplier T overpaid -> advance of 50000', pb.T, -50000);
eq('total payable excludes supplier advances', totalPayable(TX3), 125000);
eq('payable-only supplier with no purchases excluded', totalPayable([
  { type: 'supplier_payment', amountT: 700000, date: '2026-10-14', supplierId: 'U' }
]), 0);
eq('empty db -> no payables', [totalPayable([])], [0]);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail > 0) process.exit(1);
