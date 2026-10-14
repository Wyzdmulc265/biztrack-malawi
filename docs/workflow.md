# Branch & Review Workflow

- `main` — production branch. Cloudflare Pages serves this branch at the live URL.
  **Nothing lands here without owner review and merge approval.**
- `develop` — working branch. The agent (Superagent) pushes all work here.
  Each push produces a Cloudflare **preview URL** for owner review.
- Flow: agent pushes to `develop` -> owner reviews (code + preview URL) ->
  owner merges to `main` -> Cloudflare auto-deploys production.

Review rule: an agent may never merge to `main` on its own initiative.
Merges are performed (or explicitly approved) by the owner.
