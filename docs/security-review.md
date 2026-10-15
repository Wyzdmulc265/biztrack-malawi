# Security Review - Stage 5 (2026-10-15)

Scope: the shipped app (app/) at Stage 3/4 completion. Static PWA, device-only
IndexedDB storage, no backend, no accounts (by design, design v1.0 section 2).

## Method

Code audit of every data-flow path: input -> storage -> rendering -> export.
Evidence commands (reproducible):

    grep -n "innerHTML" app/js/app.js          # every render site
    grep -rn "fetch\|XMLHttpRequest\|http\|localStorage\|document.cookie" app/
    grep -rn "eval\|new Function" app/js/

## Findings

| # | Area | Finding | Severity | Status |
|---|------|---------|----------|--------|
| 1 | XSS in rendered text | Every user-controlled string (customer name, note, category name, ids) passes escapeHtml() (escapes & < > " ') before insertion into innerHTML, at all 5 render sites. Type badges come from an internal whitelist (TYPE_LABEL), never user input. | - | PASS |
| 2 | CSV formula injection | A note/customer/category field beginning with =, +, - or @ would execute as a formula when the exported CSV is opened in Excel/Sheets. | Medium | FIXED - csvField() now prefixes such fields with ' |
| 3 | Missing security headers | No CSP or hardening headers served. | Medium | FIXED - _headers adds CSP, nosniff, DENY framing, no-referrer, permissions-policy |
| 4 | Data exfiltration surface | None found: zero fetch/XHR/http URLs, no cookies, no localStorage in shipped code. All data stays in device-local IndexedDB. No telemetry. | - | PASS |
| 5 | Dynamic code execution | No eval / new Function in shipped code (tests use Node vm, never shipped). | - | PASS |
| 6 | Input validation | Amounts parsed via integer-only grammar; rejects negatives, zero, >2 decimals, overflow (MK999,999,999.99 cap). Verified by 15 Stage 4 tests. | - | PASS |
| 7 | Service worker | Registered at relative scope './sw.js'; caches app shell only (same-origin). No cross-origin requests exist to cache or intercept. | - | PASS |
| 8 | UUID fallback | Falls back to Math.random()-based ids if crypto.randomUUID is unavailable. Low risk: ids are device-local, never security-sensitive. | Low | ACCEPTED |
| 9 | Auth/PII | No accounts, no PII beyond customer first names; data never leaves the device in v1. Cloud sync would require its own threat model. | - | BY DESIGN |

## Residual risk

Single-device storage means data is lost if the browser profile is cleared.
Accepted for v1 (offline-first, no-account simplicity); revisit with sync.
