// BizTrack Malawi - validation rules (v1.3, V1-V7). Pure functions, unit-tested.
// V1 (existing-customer/supplier checks) is enforced at the save gate in app.js.
'use strict';

const LARGE_AMOUNT_T = 100000000; // MK1,000,000.00

// V7 name hygiene: trim, collapse inner whitespace, reject empty/numeric/overlong.
function normalizeName(raw) {
  if (raw == null) raw = '';
  const value = String(raw).replace(/\s+/g, ' ').trim();
  if (!value) return { ok: false, error: 'Name is required' };
  if (value.length > 40) return { ok: false, error: 'Name is too long' };
  if (/^\d+$/.test(value)) return { ok: false, error: 'Enter a name, not just numbers' };
  return { ok: true, value };
}

// V2 overpayment: paying more than the current balance.
function isOverpayment(balanceT, amountT) { return amountT > balanceT; }

// V4 large single entry (soft check, confirm only).
function isLargeAmount(amountT) { return amountT > LARGE_AMOUNT_T; }

// V5 back-dating notice: more than 7 days before today.
function isOldDate(iso, todayISO) {
  return (new Date(todayISO + 'T00:00:00') - new Date(iso + 'T00:00:00')) > 7 * 86400000;
}

// V3 duplicate guard: same type, amount, party and date saved within 60 seconds.
function isLikelyDuplicate(cand, recents, nowMs) {
  return recents.some((x) =>
    nowMs - (x.createdAt || 0) < 60000 &&
    x.type === cand.type &&
    x.amountT === cand.amountT &&
    x.date === cand.date &&
    (x.customerId || null) === (cand.customerId || null) &&
    (x.supplierId || null) === (cand.supplierId || null));
}
