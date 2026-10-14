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

## Status
- [x] Problem research and scope (Stage 0)
- [ ] Requirements document (Stage 1) - in review
- [ ] Architecture: static PWA, HTML/CSS/JS, IndexedDB, service worker, device-only storage in v1
- [ ] Hosting plan: this repo, auto-deployed via Cloudflare Pages

## Repository layout (planned)
- `docs/` - requirements, decision log, test plans
- `app/` - the application itself
- `tests/` - independent calculation tests

_This repository is the documentation trail for a LinkedIn post series on
AI-directed engineering._
