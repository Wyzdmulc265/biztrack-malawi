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
function show(name) {
  ['dashboard', 'add', 'list', 'reports'].forEach((s) => {
    $('#' + s + '-screen').hidden = s !== name;
  });
  $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.screen === name));
  if (name === 'list') renderList();
  if (name === 'dashboard') renderDashboard();
}
$$('.nav-btn').forEach((b) => b.addEventListener('click', () => show(b.dataset.screen)));

// --- entry form ---
let currentType = 'cash_sale';

function setType(t) {
  currentType = t;
  $$('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.type === t));
  // payments also reference a customer (debt tracking, FR-4)
  $('#customer-field').hidden = !(t === 'credit_sale' || t === 'payment');
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
    $('#note').value = '';
    $('#date').value = TODAY;
    resetEditState();
    await loadCustomers();
    if (updated) { toast('Updated ' + formatMK(tx.amountT)); show('list'); }
    else { toast('Saved ' + formatMK(tx.amountT)); }
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
  const t = totalsForDate(txs, TODAY);
  $('#stat-sales').textContent = formatMK(t.sales);
  $('#stat-sales-sub').textContent = 'cash ' + formatMK(t.cashSales) + ' / credit ' + formatMK(t.creditSales);
  $('#stat-expenses').textContent = formatMK(t.expenses);
  $('#stat-cash').textContent = formatMK(t.cashMovement);
  $('#stat-outstanding').textContent = formatMK(totalOutstanding(txs));
  $('#dash-empty').hidden = txs.some((x) => x.date === TODAY);
  await renderCustomers(txs);
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
    b.addEventListener('click', () => openPaymentModal(b.dataset.id)));
}

let payingCustomerId = null;
async function openPaymentModal(customerId) {
  const c = await dbGet('customers', customerId);
  const txs = await dbGetAll('transactions');
  const out = outstandingByCustomer(txs);
  const bal = out[customerId] || 0;
  payingCustomerId = customerId;
  $('#pay-title').textContent = 'Record payment - ' + c.name;
  $('#pay-bal').textContent = bal >= 0 ? 'Currently owes ' + formatMK(bal) : 'Has paid ahead: advance of ' + formatMK(-bal);
  $('#pay-amount').value = '';
  $('#pay-note').value = '';
  $('#pay-date').value = TODAY;
  $('#pay-date').max = TODAY;
  $('#pay-date').min = MIN_DATE;
  clearErrors();
  $('#pay-modal').hidden = false;
  $('#pay-amount').focus();
}
$('#pay-cancel').addEventListener('click', () => { $('#pay-modal').hidden = true; payingCustomerId = null; });

let savingPayment = false;
$('#pay-save').addEventListener('click', async () => {
  if (savingPayment || !payingCustomerId) return;
  clearErrors();
  const amount = parseAmountT($('#pay-amount').value);
  if (!amount.ok) return showError('pay-amount', amount.error);
  const date = $('#pay-date').value;
  if (!date) return showError('pay-date', 'Date is required');
  if (date > TODAY) return showError('pay-date', 'Future dates are not allowed');
  if (date < MIN_DATE) return showError('pay-date', 'Date is more than a year ago');

  const now = Date.now();
  const tx = {
    id: uuid(),
    type: 'payment',
    amountT: amount.amountT,
    categoryId: null,
    customerId: payingCustomerId,
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
    payingCustomerId = null;
    toast('Payment saved ' + formatMK(tx.amountT));
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
const TYPE_LABEL = { cash_sale: 'Cash sale', credit_sale: 'Credit sale', expense: 'Expense', payment: 'Payment' };
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

function txSearchText(t, custName, catName) {
  const parts = [t.note || '', t.customerId ? custName[t.customerId] : '', t.categoryId ? catName[t.categoryId] : '', TYPE_LABEL[t.type]];
  return parts.join(' ').toLowerCase();
}

async function renderList() {
  const [txs, customers, cats] = await Promise.all([dbGetAll('transactions'), dbGetAll('customers'), dbGetAll('categories')]);
  const custName = {}; customers.forEach((c) => { custName[c.id] = c.name; });
  const catName = {}; cats.forEach((c) => { catName[c.id] = c.name; });

  const start = rangeStart(filterState.range);
  const q = filterState.q.trim().toLowerCase();
  const filtered = txs.filter((t) =>
    (filterState.type === 'all' || t.type === filterState.type) &&
    (!start || t.date >= start) &&
    (!q || txSearchText(t, custName, catName).includes(q))
  );
  filtered.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));

  $('#list-empty').hidden = txs.length > 0;
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
    const who = t.customerId ? custName[t.customerId] : (t.categoryId ? catName[t.categoryId] : '');
    html += '<li class="tx-row" data-id="' + escapeHtml(t.id) + '">' +
      '<div class="tx-main"><span class="badge ' + t.type + '">' + TYPE_LABEL[t.type] + '</span>' +
      (who ? ' <span class="who">' + escapeHtml(who) + '</span>' : '') +
      (t.note ? ' <span class="note">' + escapeHtml(t.note) + '</span>' : '') +
      '<span class="amt">' + formatMK(t.amountT) + '</span></div>' +
      '<button type="button" class="del-btn" aria-label="Delete transaction">Delete</button></li>';
  }
  html += '</ul>';
  $('#tx-list').innerHTML = html;

  $$('#tx-list .tx-row').forEach((row) => row.addEventListener('click', () => openEdit(row.dataset.id)));
  $$('#tx-list .del-btn').forEach((btn) => btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirm('Delete this transaction? This cannot be undone.')) return;
    await dbDelete('transactions', btn.closest('.tx-row').dataset.id);
    renderList();
  }));
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
  await loadCategories(t.categoryId);
  $('#category').value = t.categoryId || '';
  $('#date').value = t.date;
  $('#note').value = t.note || '';
  $('#save-btn').textContent = 'Update';
  $('#edit-cancel-btn').hidden = false;
}

function resetEditState() {
  editingId = null;
  $('#save-btn').textContent = 'Save';
  $('#edit-cancel-btn').hidden = true;
}

$('#edit-cancel-btn').addEventListener('click', () => {
  resetEditState();
  $('#amount').value = '';
  $('#customer').value = '';
  $('#note').value = '';
  $('#date').value = TODAY;
  show('list');
});

// --- init ---
openDB()
  .then(() => { loadCategories(); loadCustomers(); })
  .catch(() => { $('#storage-error').hidden = false; });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
