// BizTrack Malawi - application logic (Stage 3, feature 1: transaction entry)
'use strict';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2);
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function localISO(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

const TODAY = localISO(new Date());
const MIN_DATE = localISO(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));

// --- navigation ---
const SCREEN_TITLE = { dashboard: 'BizTrack', add: 'Add transaction', list: 'Transactions', reports: 'Reports' };
function show(name) {
  ['dashboard', 'add', 'list', 'reports'].forEach((s) => {
    $('#' + s + '-screen').hidden = s !== name;
  });
  $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.screen === name));
  $('#topbar-title').textContent = name === 'dashboard'
    ? 'Today \u00b7 ' + new Date(TODAY + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    : SCREEN_TITLE[name];
  if (name === 'list') renderList();
  if (name === 'dashboard') renderDashboard();
  if (name === 'reports') renderReports();
}
$$('.nav-btn').forEach((b) => b.addEventListener('click', () => show(b.dataset.screen)));

// --- entry form ---
let currentType = 'cash_sale';

function setType(t) {
  currentType = t;
  $$('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.type === t));
  // debt received references a customer (FR-4); supplier types reference a supplier (FR-11, D19)
  $('#customer-field').hidden = !(t === 'credit_sale' || t === 'payment');
  $('#supplier-field').hidden = !(t === 'credit_purchase' || t === 'supplier_payment');
  $('#category-field').hidden = t !== 'expense';
  clearErrors();
}
$$('.seg-btn').forEach((b) => b.addEventListener('click', () => setType(b.dataset.type)));

function showError(field, msg) {
  const el = $('#' + field + '-err');
  el.textContent = msg;
  el.hidden = false;
}
function clearErrors() {
  $$('.err').forEach((e) => { e.hidden = true; });
  $('#storage-error').hidden = true;
}

// date: default today, future blocked entirely (D13), min one year back
$('#date').value = TODAY;
$('#date').max = TODAY;
$('#date').min = MIN_DATE;

// --- categories ---
async function loadCategories(selectedId) {
  const cats = await dbGetAll('categories');
  cats.sort((a, b) => a.name.localeCompare(b.name));
  const sel = $('#category');
  sel.innerHTML = '<option value="">Choose category</option>' +
    cats.map((c) => '<option value="' + escapeHtml(c.id) + '"' + (c.id === selectedId ? ' selected' : '') + '>' + escapeHtml(c.name) + '</option>').join('');
}
$('#add-cat-btn').addEventListener('click', () => {
  $('#add-cat-row').hidden = !$('#add-cat-row').hidden;
  if (!$('#add-cat-row').hidden) $('#new-cat').focus();
});
$('#new-cat-save').addEventListener('click', async () => {
  const name = $('#new-cat').value.trim();
  if (!name) return;
  if (name.length > 40) { $('#new-cat').value = ''; return; }
  const existing = (await dbGetAll('categories')).find((c) => c.name.toLowerCase() === name.toLowerCase());
  const id = existing ? existing.id : uuid();
  if (!existing) await dbPut('categories', { id, name, builtin: false });
  await loadCategories(id);
  $('#new-cat').value = '';
  $('#add-cat-row').hidden = true;
});

// --- customers ---
async function loadCustomers() {
  const list = await dbGetAll('customers');
  list.sort((a, b) => a.name.localeCompare(b.name));
  $('#customer-list').innerHTML = list.map((c) => '<option value="' + escapeHtml(c.name) + '">').join('');
}
async function getOrCreateCustomer(name) {
  const list = await dbGetAll('customers');
  const hit = list.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (hit) return hit.id;
  const id = uuid();
  await dbPut('customers', { id, name, createdAt: Date.now() });
  return id;
}

// --- suppliers (v1.2, D19: payables tracking) ---
async function loadSuppliers() {
  const list = await dbGetAll('suppliers');
  list.sort((a, b) => a.name.localeCompare(b.name));
  $('#supplier-list').innerHTML = list.map((c) => '<option value="' + escapeHtml(c.name) + '">').join('');
}
async function getOrCreateSupplier(name) {
  const list = await dbGetAll('suppliers');
  const hit = list.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (hit) return hit.id;
  const id = uuid();
  await dbPut('suppliers', { id, name, createdAt: Date.now() });
  return id;
}

// --- save (double-tap protected) ---
let saving = false;
$('#save-btn').addEventListener('click', async () => {
  if (saving) return;
  clearErrors();

  const amount = parseAmountT($('#amount').value);
  if (!amount.ok) return showError('amount', amount.error);

  const date = $('#date').value;
  if (!date) return showError('date', 'Date is required');
  if (date > TODAY) return showError('date', 'Future dates are not allowed');
  if (date < MIN_DATE) return showError('date', 'Date is more than a year ago');

  let customerId = null;
  if (currentType === 'credit_sale' || currentType === 'payment') {
    const name = $('#customer').value.trim();
    if (!name) return showError('customer', 'Customer name is required');
    customerId = await getOrCreateCustomer(name);
  }

  let supplierId = null;
  if (currentType === 'credit_purchase' || currentType === 'supplier_payment') {
    const name = $('#supplier').value.trim();
    if (!name) return showError('supplier', 'Supplier name is required');
    supplierId = await getOrCreateSupplier(name);
  }

  let categoryId = null;
  if (currentType === 'expense') {
    categoryId = $('#category').value;
    if (!categoryId) return showError('category', 'Choose a category');
  }

  const now = Date.now();
  const existing = editingId ? await dbGet('transactions', editingId) : null;
  if (editingId && !existing) return; // was deleted while editing

  const tx = {
    id: existing ? existing.id : uuid(),
    type: currentType,
    amountT: amount.amountT,
    categoryId,
    customerId,
    supplierId,
    date,
    note: $('#note').value.trim(),
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now
  };

  saving = true;
  $('#save-btn').disabled = true;
  try {
    await dbPut('transactions', tx);
    const updated = !!existing;
    $('#amount').value = '';
    $('#customer').value = '';
    $('#supplier').value = '';
    $('#note').value = '';
    $('#date').value = TODAY;
    resetEditState();
    await loadCustomers();
    await loadSuppliers();
    if (updated) { toast('Updated ' + formatMK(tx.amountT)); show('list'); }
    else { toast('Saved ' + formatMK(tx.amountT)); $('#amount').focus(); }
  } catch (err) {
    // Entry fields preserved so the owner can retry (design section 6)
    $('#storage-error').hidden = false;
  } finally {
    saving = false;
    $('#save-btn').disabled = false;
  }
});

// --- dashboard (FR-7, FR-8, NFR-4) - uses the shared calc module ---
async function renderDashboard() {
  const txs = await dbGetAll('transactions');
  const cf = cashflowForRange(txs, TODAY, TODAY);
  $('#stat-inflow').textContent = formatMK(cf.inflow);
  $('#stat-inflow-sub').textContent = 'cash sales ' + formatMK(cf.cashSales) + ' / debt received ' + formatMK(cf.debtReceived);
  $('#stat-outflow').textContent = formatMK(cf.outflow);
  $('#stat-outflow-sub').textContent = 'money out ' + formatMK(cf.moneyOut) + ' / supplier payments ' + formatMK(cf.supplierPayments);
  $('#stat-net').textContent = formatMK(cf.netCashflow);
  $('#stat-outstanding').textContent = formatMK(totalOutstanding(txs));
  $('#stat-payable').textContent = formatMK(totalPayable(txs));
  const hasToday = txs.some((x) => x.date === TODAY);
  $('#dash-empty').hidden = hasToday;
  $('#dash-add-btn').hidden = hasToday;
  await Promise.all([renderCustomers(txs), renderSuppliers(txs)]);
}

// --- customer balances + payment flow (FR-4) ---
async function renderCustomers(txs) {
  const out = outstandingByCustomer(txs);
  const customers = await dbGetAll('customers');
  const rows = customers
    .filter((c) => out[c.id] !== undefined && out[c.id] !== 0)
    .sort((a, b) => Math.abs(out[b.id]) - Math.abs(out[a.id]));

  $('#cust-empty').hidden = rows.length > 0;
  $('#cust-list').innerHTML = rows.map((c) => {
    const bal = out[c.id];
    const balText = bal > 0
      ? '<span class="cust-bal owes">' + formatMK(bal) + '</span>'
      : '<span class="cust-bal advance">paid ahead ' + formatMK(-bal) + '</span>';
    return '<li class="cust-row"><div><span class="who">' + escapeHtml(c.name) + '</span>' + balText + '</div>' +
      '<button type="button" class="btn small pay-btn" data-id="' + escapeHtml(c.id) + '">Payment</button></li>';
  }).join('');

  $$('#cust-list .pay-btn').forEach((b) =>
    b.addEventListener('click', () => openPaymentModal('customer', b.dataset.id)));
}

let payingParty = null; // { mode: 'customer' | 'supplier', id }
async function openPaymentModal(mode, id) {
  const party = await dbGet(mode === 'customer' ? 'customers' : 'suppliers', id);
  if (!party) return;
  const txs = await dbGetAll('transactions');
  const bal = mode === 'customer'
    ? (outstandingByCustomer(txs)[id] || 0)
    : (payablesBySupplier(txs)[id] || 0);
  payingParty = { mode, id };
  $('#pay-title').textContent = (mode === 'customer' ? 'Record payment - ' : 'Pay supplier - ') + party.name;
  $('#pay-bal').textContent = bal > 0
    ? (mode === 'customer' ? 'Currently owes ' : 'You currently owe ') + formatMK(bal)
    : (mode === 'customer' ? 'Has paid ahead: advance of ' : 'You have paid ahead: credit of ') + formatMK(-bal);
  $('#pay-amount').value = '';
  $('#pay-note').value = '';
  $('#pay-date').value = TODAY;
  $('#pay-date').max = TODAY;
  $('#pay-date').min = MIN_DATE;
  clearErrors();
  $('#pay-modal').hidden = false;
  $('#pay-amount').focus();
}
$('#pay-cancel').addEventListener('click', () => { $('#pay-modal').hidden = true; payingParty = null; });

// --- supplier balances (v1.2, D19) - mirrors the customer card ---
async function renderSuppliers(txs) {
  const payable = payablesBySupplier(txs);
  const suppliers = await dbGetAll('suppliers');
  const rows = suppliers
    .filter((c) => payable[c.id] !== undefined && payable[c.id] !== 0)
    .sort((a, b) => Math.abs(payable[b.id]) - Math.abs(payable[a.id]));

  $('#supp-empty').hidden = rows.length > 0;
  $('#supp-list').innerHTML = rows.map((c) => {
    const bal = payable[c.id];
    const balText = bal > 0
      ? '<span class="cust-bal owes">' + formatMK(bal) + '</span>'
      : '<span class="cust-bal advance">paid ahead ' + formatMK(-bal) + '</span>';
    return '<li class="cust-row"><div><span class="who">' + escapeHtml(c.name) + '</span>' + balText + '</div>' +
      '<button type="button" class="btn small pay-btn" data-id="' + escapeHtml(c.id) + '">Pay</button></li>';
  }).join('');

  $$('#supp-list .pay-btn').forEach((b) =>
    b.addEventListener('click', () => openPaymentModal('supplier', b.dataset.id)));
}

let savingPayment = false;
$('#pay-save').addEventListener('click', async () => {
  if (savingPayment || !payingParty) return;
  clearErrors();
  const amount = parseAmountT($('#pay-amount').value);
  if (!amount.ok) return showError('pay-amount', amount.error);
  const date = $('#pay-date').value;
  if (!date) return showError('pay-date', 'Date is required');
  if (date > TODAY) return showError('pay-date', 'Future dates are not allowed');
  if (date < MIN_DATE) return showError('pay-date', 'Date is more than a year ago');

  const isCustomer = payingParty.mode === 'customer';
  const now = Date.now();
  const tx = {
    id: uuid(),
    type: isCustomer ? 'payment' : 'supplier_payment',
    amountT: amount.amountT,
    categoryId: null,
    customerId: isCustomer ? payingParty.id : null,
    supplierId: isCustomer ? null : payingParty.id,
    date,
    note: $('#pay-note').value.trim(),
    createdAt: now,
    updatedAt: now
  };
  savingPayment = true;
  $('#pay-save').disabled = true;
  try {
    await dbPut('transactions', tx);
    $('#pay-modal').hidden = true;
    payingParty = null;
    toast((isCustomer ? 'Debt received ' : 'Supplier payment ') + formatMK(tx.amountT));
    renderDashboard();
  } catch (err) {
    // modal stays open, fields preserved (design section 6)
    $('#pay-amount-err').textContent = 'Could not save. Storage unavailable or full - try again.';
    $('#pay-amount-err').hidden = false;
  } finally {
    savingPayment = false;
    $('#pay-save').disabled = false;
  }
});

// --- toast ---
let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2500);
}

// --- transactions list (FR-5 search/filter, FR-6 edit/delete) ---
const TYPE_LABEL = { cash_sale: 'Cash sale', credit_sale: 'Credit sale', expense: 'Money out', payment: 'Debt received', credit_purchase: 'Credit purchase', supplier_payment: 'Supplier payment' };
const filterState = { q: '', type: 'all', range: 'all' };

function rangeStart(range) {
  if (range === 'today') return TODAY;
  if (range === 'week') return localISO(new Date(Date.now() - 7 * 86400000));
  if (range === 'month') return localISO(new Date(Date.now() - 30 * 86400000));
  return null; // all time
}

function dayLabel(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function txSearchText(t, custName, catName, suppName) {
  const parts = [t.note || '', t.customerId ? custName[t.customerId] : '', t.supplierId ? suppName[t.supplierId] : '', t.categoryId ? catName[t.categoryId] : '', TYPE_LABEL[t.type]];
  return parts.join(' ').toLowerCase();
}

async function renderList() {
  const [txs, customers, cats, supps] = await Promise.all([dbGetAll('transactions'), dbGetAll('customers'), dbGetAll('categories'), dbGetAll('suppliers')]);
  const custName = {}; customers.forEach((c) => { custName[c.id] = c.name; });
  const catName = {}; cats.forEach((c) => { catName[c.id] = c.name; });
  const suppName = {}; supps.forEach((c) => { suppName[c.id] = c.name; });

  const start = rangeStart(filterState.range);
  const q = filterState.q.trim().toLowerCase();
  const filtered = txs.filter((t) =>
    (filterState.type === 'all' || t.type === filterState.type) &&
    (!start || t.date >= start) &&
    (!q || txSearchText(t, custName, catName, suppName).includes(q))
  );
  filtered.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));

  $('#list-empty').hidden = txs.length > 0;
  $('#list-add-btn').hidden = txs.length > 0;
  $('#list-nomatch').hidden = !(txs.length > 0 && filtered.length === 0);
  if (txs.length === 0 || filtered.length === 0) {
    $('#tx-list').innerHTML = '';
    return;
  }

  // group by day (design 3.3), newest day first
  let html = '';
  let currentDay = null;
  for (const t of filtered) {
    if (t.date !== currentDay) {
      if (currentDay !== null) html += '</ul>';
      currentDay = t.date;
      html += '<p class="day-head">' + dayLabel(t.date) + '</p><ul class="tx-list">';
    }
    const who = t.customerId ? custName[t.customerId] : (t.supplierId ? suppName[t.supplierId] : (t.categoryId ? catName[t.categoryId] : ''));
    html += '<li class="tx-row" data-id="' + escapeHtml(t.id) + '">' +
      '<div class="tx-main"><span class="badge ' + t.type + '">' + TYPE_LABEL[t.type] + '</span>' +
      (who ? ' <span class="who">' + escapeHtml(who) + '</span>' : '') +
      (t.note ? ' <span class="note">' + escapeHtml(t.note) + '</span>' : '') +
      '<span class="amt">' + formatMK(t.amountT) + '</span></div>' +
      '<span class="chev" aria-hidden="true">\u203a</span></li>';
  }
  html += '</ul>';
  $('#tx-list').innerHTML = html;

  $$('#tx-list .tx-row').forEach((row) => row.addEventListener('click', () => openEdit(row.dataset.id)));
}

$('#search').addEventListener('input', (e) => { filterState.q = e.target.value; renderList(); });
$('#filter-type').addEventListener('change', (e) => { filterState.type = e.target.value; renderList(); });
$('#filter-range').addEventListener('change', (e) => { filterState.range = e.target.value; renderList(); });

// --- edit mode (FR-6): tap a row to load it into the entry form ---
let editingId = null;

function amountToInput(amountT) {
  const t = Math.abs(amountT);
  return Math.floor(t / 100) + '.' + String(t % 100).padStart(2, '0');
}

async function openEdit(id) {
  const t = await dbGet('transactions', id);
  if (!t) return;
  editingId = id;
  show('add');
  setType(t.type);
  $('#amount').value = amountToInput(t.amountT);
  const c = t.customerId ? await dbGet('customers', t.customerId) : null;
  $('#customer').value = c ? c.name : '';
  const sp = t.supplierId ? await dbGet('suppliers', t.supplierId) : null;
  $('#supplier').value = sp ? sp.name : '';
  await loadCategories(t.categoryId);
  $('#category').value = t.categoryId || '';
  $('#date').value = t.date;
  $('#note').value = t.note || '';
  $('#save-btn').textContent = 'Update';
  $('#edit-cancel-btn').hidden = false;
  $('#edit-delete-btn').hidden = false;
  syncDateChip();
}

function resetEditState() {
  editingId = null;
  $('#save-btn').textContent = 'Save';
  $('#edit-cancel-btn').hidden = true;
  $('#edit-delete-btn').hidden = true;
  $('#date-field').hidden = true;
  syncDateChip();
}

$('#edit-cancel-btn').addEventListener('click', () => {
  resetEditState();
  $('#amount').value = '';
  $('#customer').value = '';
  $('#supplier').value = '';
  $('#note').value = '';
  $('#date').value = TODAY;
  show('list');
});

// --- init ---
openDB()
  .then(() => { loadCategories(); loadCustomers(); loadSuppliers(); })
  .catch(() => { $('#storage-error').hidden = false; });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}

// --- reports (FR-9, D15): weekly summary + CSV export ---
let weekStartISO = mondayOf(TODAY);

function mondayOf(iso) {
  const d = new Date(iso + 'T00:00:00');
  const day = (d.getDay() + 6) % 7; // Mon=0 ... Sun=6
  return localISO(new Date(d.getTime() - day * 86400000));
}
function weekEndOf(startIso) {
  return localISO(new Date(new Date(startIso + 'T00:00:00').getTime() + 6 * 86400000));
}
function weekLabel(startIso) {
  const s = new Date(startIso + 'T00:00:00');
  const e = new Date(weekEndOf(startIso) + 'T00:00:00');
  const fmt = (d, o) => d.toLocaleDateString('en-GB', o);
  const part1 = s.getMonth() === e.getMonth()
    ? fmt(s, { weekday: 'short', day: 'numeric' })
    : fmt(s, { weekday: 'short', day: 'numeric', month: 'short' });
  return part1 + ' \u2013 ' + fmt(e, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function inWeek(t, start, end) { return t.date >= start && t.date <= end; }

async function renderReports() {
  const txs = await dbGetAll('transactions');
  const start = weekStartISO, end = weekEndOf(start);
  const cf = cashflowForRange(txs, start, end);
  $('#week-label').textContent = weekLabel(start);
  $('#week-next').disabled = start >= mondayOf(TODAY);
  $('#rep-inflow').textContent = formatMK(cf.inflow);
  $('#rep-inflow-sub').textContent = 'cash sales ' + formatMK(cf.cashSales) + ' / debt received ' + formatMK(cf.debtReceived);
  $('#rep-outflow').textContent = formatMK(cf.outflow);
  $('#rep-outflow-sub').textContent = 'money out ' + formatMK(cf.moneyOut) + ' / supplier payments ' + formatMK(cf.supplierPayments);
  $('#rep-net').textContent = formatMK(cf.netCashflow);
  const hasTx = txs.some((x) => inWeek(x, start, end));
  $('#rep-empty').hidden = hasTx;
  $('#csv-btn').disabled = !hasTx;
}
$('#week-prev').addEventListener('click', () => {
  weekStartISO = localISO(new Date(new Date(weekStartISO + 'T00:00:00').getTime() - 7 * 86400000));
  renderReports();
});
$('#week-next').addEventListener('click', () => {
  weekStartISO = localISO(new Date(new Date(weekStartISO + 'T00:00:00').getTime() + 7 * 86400000));
  renderReports();
});

// --- CSV export (D15: full list, then totals) ---
function csvField(v) {
  let s = String(v == null ? '' : v);
  // Stage 5 security fix: CSV formula injection. A field starting with
  // = + - @ could execute as a formula in Excel/Sheets. Prefix with ' so
  // spreadsheet apps treat it as plain text (OWASP mitigation).
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
function amountToCsv(amountT) {
  const t = Math.abs(amountT);
  return Math.floor(t / 100) + '.' + String(t % 100).padStart(2, '0');
}
$('#csv-btn').addEventListener('click', async () => {
  const start = weekStartISO, end = weekEndOf(start);
  const [txs, customers, cats, supps] = await Promise.all([dbGetAll('transactions'), dbGetAll('customers'), dbGetAll('categories'), dbGetAll('suppliers')]);
  const custName = {}; customers.forEach((c) => { custName[c.id] = c.name; });
  const catName = {}; cats.forEach((c) => { catName[c.id] = c.name; });
  const suppName = {}; supps.forEach((c) => { suppName[c.id] = c.name; });

  const rows = txs.filter((x) => inWeek(x, start, end))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt));
  const cf = cashflowForRange(txs, start, end);

  const lines = [['Date', 'Type', 'Party', 'Category', 'Note', 'Amount'].map(csvField).join(',')];
  for (const x of rows) {
    const party = x.customerId ? custName[x.customerId] : (x.supplierId ? suppName[x.supplierId] : '');
    lines.push([
      x.date, TYPE_LABEL[x.type] || x.type,
      party,
      x.categoryId ? catName[x.categoryId] : '',
      x.note || '', amountToCsv(x.amountT)
    ].map(csvField).join(','));
  }
  lines.push('');
  lines.push(['Totals', '', '', '', '', ''].map(csvField).join(','));
  lines.push(['Inflow (cash sales + debt received)', '', '', '', '', amountToCsv(cf.inflow)].map(csvField).join(','));
  lines.push(['Outflow (money out + supplier payments)', '', '', '', '', amountToCsv(cf.outflow)].map(csvField).join(','));
  lines.push(['Net cashflow', '', '', '', '', amountToCsv(cf.netCashflow)].map(csvField).join(','));

  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'biztrack-week-of-' + start + '.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast('CSV exported for ' + weekLabel(start));
});

// --- Phase B (UI/UX, D20/D21) ---
// Date chip: keeps the entry form short - the full date input only appears on demand.
function syncDateChip() {
  const v = $('#date').value;
  $('#date-chip').textContent = 'Date: ' + (v === TODAY ? 'Today' : dayLabel(v));
}
$('#date-chip').addEventListener('click', () => {
  const f = $('#date-field');
  f.hidden = !f.hidden;
  $('#date-chip').setAttribute('aria-expanded', String(!f.hidden));
  if (!f.hidden) {
    try { if ($('#date').showPicker) $('#date').showPicker(); } catch (e) { /* older browsers */ }
  }
});
$('#date').addEventListener('change', syncDateChip);
syncDateChip();

// Delete lives inside the edit screen now (D20): two-step intent.
$('#edit-delete-btn').addEventListener('click', async () => {
  if (!editingId) return;
  if (!confirm('Delete this transaction? This cannot be undone.')) return;
  await dbDelete('transactions', editingId);
  $('#amount').value = '';
  $('#customer').value = '';
  $('#supplier').value = '';
  $('#note').value = '';
  $('#date').value = TODAY;
  resetEditState();
  toast('Deleted');
  show('list');
});

// Empty states point at the first action.
$('#dash-add-btn').addEventListener('click', () => show('add'));
$('#list-add-btn').addEventListener('click', () => show('add'));

// Connectivity indicator: offline the app still works (offline-first).
function netState() {
  const on = navigator.onLine;
  const dot = $('#net-dot');
  dot.classList.toggle('on', on);
  dot.title = on ? 'Online' : 'Offline - the app still works';
}
window.addEventListener('online', netState);
window.addEventListener('offline', netState);
netState();
