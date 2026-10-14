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
}
$$('.nav-btn').forEach((b) => b.addEventListener('click', () => show(b.dataset.screen)));

// --- entry form ---
let currentType = 'cash_sale';

function setType(t) {
  currentType = t;
  $$('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.type === t));
  $('#customer-field').hidden = t !== 'credit_sale';
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
  if (currentType === 'credit_sale') {
    const name = $('#customer').value.trim();
    if (!name) return showError('customer', 'Customer name is required for a credit sale');
    customerId = await getOrCreateCustomer(name);
  }

  let categoryId = null;
  if (currentType === 'expense') {
    categoryId = $('#category').value;
    if (!categoryId) return showError('category', 'Choose a category');
  }

  const now = Date.now();
  const tx = {
    id: uuid(),
    type: currentType,
    amountT: amount.amountT,
    categoryId,
    customerId,
    date,
    note: $('#note').value.trim(),
    createdAt: now,
    updatedAt: now
  };

  saving = true;
  $('#save-btn').disabled = true;
  try {
    await dbAdd('transactions', tx);
    $('#amount').value = '';
    $('#customer').value = '';
    $('#note').value = '';
    await loadCustomers();
    toast('Saved ' + formatMK(tx.amountT));
  } catch (err) {
    // Entry fields preserved so the owner can retry (design section 6)
    $('#storage-error').hidden = false;
  } finally {
    saving = false;
    $('#save-btn').disabled = false;
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

// --- minimal list (verification view; filters/search come later in Stage 3) ---
const TYPE_LABEL = { cash_sale: 'Cash sale', credit_sale: 'Credit sale', expense: 'Expense' };

async function renderList() {
  const [txs, customers, cats] = await Promise.all([dbGetAll('transactions'), dbGetAll('customers'), dbGetAll('categories')]);
  const custName = {}; customers.forEach((c) => { custName[c.id] = c.name; });
  const catName = {}; cats.forEach((c) => { catName[c.id] = c.name; });
  txs.sort((a, b) => b.createdAt - a.createdAt);

  $('#list-empty').hidden = txs.length > 0;
  $('#tx-list').innerHTML = txs.map((t) => {
    const who = t.customerId ? custName[t.customerId] : (t.categoryId ? catName[t.categoryId] : '');
    return '<li class="tx-row"><div><span class="badge ' + t.type + '">' + TYPE_LABEL[t.type] + '</span>' +
      (who ? ' <span class="who">' + escapeHtml(who) + '</span>' : '') +
      (t.note ? ' <span class="note">' + escapeHtml(t.note) + '</span>' : '') +
      '</div><div class="right"><span class="amt">' + formatMK(t.amountT) + '</span><span class="date">' + escapeHtml(t.date) + '</span></div></li>';
  }).join('');
}

// --- init ---
openDB()
  .then(() => { loadCategories(); loadCustomers(); })
  .catch(() => { $('#storage-error').hidden = false; });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
