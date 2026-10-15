# BizTrack Malawi

An offline-first financial tracker for Malawian small businesses (SMEs). Built as a
demonstration of **AI-directed software development**: every stage is planned,
reviewed, approved by a human, and documented before it is built.

## The problem
Small shop owners in Malawi often lack an easy way to record daily transactions
(sales, expenses, credit sales) and turn them into useful information. Poor records
lead to cash shortages even when the business is making sales.

## Principles
1. Human approval gates - no stage is built without explicit owner sign-off.
2. Minimal resources - sandbox-built, free-tier hosting (Cloudflare Pages), no backend in v1.
3. Offline-first - the app works without connectivity; sync is a design decision, not an afterthought.
4. Cash is not profit - the app must never present cash movement as accounting profit.
5. Document everything - the commit history is part of the project's evidence.

## How it was built - the AI-directed process

| Stage | What happened |
|-------|---------------|
| 0. Research | Problem validated against Malawian SME finance sources (docs/references.md) |
| 1. Requirements | Locked v1.0, amended v1.1 after owner review (docs/requirements.md) |
| 2. Design | Locked v1.0/v1.1 - data model, screens, failure handling (docs/design.md) |
| 3. Build | 5 features, one commit each, developed on `develop`, merged via owner-approved PRs |
| 4. Independent testing | 40 hand-computed assertions, zero dependencies (tests/calc.test.js) |
| 5. Security review | 2 findings fixed - CSV formula injection, missing CSP headers (docs/security-review.md) |
| 6. Launch | Merged to `main`, auto-deployed by Cloudflare Pages |

Every stage was gated by human approval before execution. Prompting for code
was step five - not step one.

## Run the app

Production: https://biztrack-malawi.pages.dev

Locally (service workers need http://localhost):

    python3 -m http.server -d app 8000

## Run the tests

    node tests/calc.test.js

## Repository layout

- `docs/` - requirements, design, decision log, security review, references
- `app/` - the application (offline-first PWA: HTML/CSS/JS, IndexedDB, service worker)
- `tests/` - independent calculation and money-module tests

_BizTrack Malawi is v1.0, launched October 2026. This repository is the
documentation trail for a LinkedIn post series on AI-directed engineering._
