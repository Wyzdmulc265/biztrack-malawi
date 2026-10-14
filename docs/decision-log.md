# Decision Log

| # | Date | Decision | Rationale | Approved by |
|---|------|----------|------------|-------------|
| 1 | 2026-10-14 | Target problem: SME financial records / cash flow management | Documented Malawian SME challenge; strong demo value | Owner |
| 2 | 2026-10-14 | MVP scope: 4 screens (Dashboard, Add Transaction, Transactions, Reports) | Small, reliable first version | Owner |
| 3 | 2026-10-14 | Mobile-friendly web app | Matches shop-owner usage patterns | Owner |
| 4 | 2026-10-14 | Offline-first: device-only storage (IndexedDB) in v1, sync deferred | Real Malawian connectivity constraint; simpler security story | Owner |
| 5 | 2026-10-14 | Static PWA: plain HTML/CSS/JS, no framework, no build step | Fewer dependencies; readable; no running costs | Owner |
| 6 | 2026-10-14 | Host outside Base44: GitHub repo + Cloudflare Pages (free tiers) | Zero cost; commit history as documentation evidence | Owner |
| 7 | 2026-10-14 | Hosting: Cloudflare Pages (not GitHub Pages) | Free tier deploys private repos; preview URLs for branch reviews | Owner |
| 8 | 2026-10-14 | Branch workflow: `develop` for agent work, `main` protected for owner merge | Human approval gate enforced at merge time, not just chat time | Owner |
| 9 | 2026-10-14 | Expense categories user-editable; defaults shipped; add flow reachable from entry screen | Owner decision at requirements review |
| 10 | 2026-10-14 | No customer names on cash sales | Owner decision; keep cash entry minimal |
| 11 | 2026-10-14 | Tambala (2 decimal places) supported, not whole-kwacha-only | Owner decision; mobile money amounts include tambala |
