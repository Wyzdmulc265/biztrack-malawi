// BizTrack Malawi - money utilities (design v1.0, section 2.1)
// All amounts are integers in tambala (1 MK = 100 tambala).
// No floating point anywhere near a stored amount. String parsing only.
'use strict';

const MAX_AMOUNT_T = 99999999999; // MK999,999,999.99 in tambala

// Parse a user-entered amount string into integer tambala.
// Returns { ok: true, amountT } or { ok: false, error }.
function parseAmountT(raw) {
  if (raw == null) raw = '';
  raw = String(raw).trim().replace(/,/g, '').replace(/^\+/, '');
  if (raw === '') return { ok: false, error: 'Amount is required' };
  const m = raw.match(/^(\d+)(?:\.(\d*))?$/);
  if (!m) {
    const decimals = raw.includes('.') ? (raw.split('.')[1] || '').length : 0;
    return { ok: false, error: decimals > 2 ? 'Maximum 2 decimal places (tambala)' : 'Enter a valid amount in kwacha' };
  }
  const whole = m[1];
  let frac = m[2] || '';
  if (frac.length > 2) return { ok: false, error: 'Maximum 2 decimal places (tambala)' };
  frac = frac.padEnd(2, '0');
  // String-concatenate digits, then convert once. Amounts are far below Number.MAX_SAFE_INTEGER.
  const amountT = Number(whole + frac);
  if (amountT <= 0) return { ok: false, error: 'Amount must be greater than zero' };
  if (amountT > MAX_AMOUNT_T) return { ok: false, error: 'Amount is too large' };
  return { ok: true, amountT };
}

// Format integer tambala as MK with thousands separators, always 2 decimals.
function formatMK(amountT) {
  const neg = amountT < 0;
  const t = Math.abs(Math.round(amountT));
  const whole = String(Math.floor(t / 100));
  const frac = String(t % 100).padStart(2, '0');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (neg ? '-MK' : 'MK') + withCommas + '.' + frac;
}
