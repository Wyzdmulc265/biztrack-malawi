# Decision Log

| # | Date | Decision | Rationale | Approved by |
|---|------|----------|------------|-------------|
| 1 | 2026-10-14 | Target problem: SME financial records / cash flow management | Documented Malawian SME challenge; strong demo value | Owner |
| 2 | 2026-10-14 | MVP scope: 4 screens (Dashboard, Add Transaction, Transactions, Reports) | Small, reliable first version | Owner |
| 3 | 2026-10-14 | Mobile-friendly web app | Matches shop-owner usage patterns | Owner |
| 4 | 2026-10-14 | Offline-first: device-only storage (IndexedDB) in v1, sync deferred | Real Malawian connectivity constraint; simpler security story | Owner |
| 5 | 2026-10-14 | Static PWA: plain HTML/CSS/JS, no framework, no build step | Fewer dependencies; readable; no running costs | Owner |
| 6 | 2026-10-14 | Host outside Base44: GitHub repo + Cloudflare Pages (free tiers) | Zero cost; commit history as documentation evidence | Owner |
