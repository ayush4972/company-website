# Pull Request conventions

## Branch naming
`seo-agent/<short-kebab-description>-<YYYY-MM-DD>`
e.g. `seo-agent/fix-missing-meta-descriptions-2026-09-14`

## Scope
One logical change per PR, or a tight group of the same type of change (e.g. "rewrite meta
descriptions on 5 pages" is one PR; "rewrite meta descriptions" + "fix sitemap" is two).
Never mix unrelated changes. Never touch files outside what the fix requires — no
reformatting, no drive-by cleanup.

## PR description template

```markdown
## What this changes
[1-3 sentences, plain language, no jargon — written for whoever approves this even if
they're not a developer]

## Why
[What was wrong/missing, and what this is expected to do for search visibility]

## Files changed
- `path/to/file` — [one-line description of the change]

## Priority
Fix now / This month / Ongoing — [from the current run's report]

---
Opened automatically by the SEO agent. Safe to close without merging if this isn't wanted —
it won't be re-proposed unless the underlying issue is still there next run.
```

## Labels
Apply whatever's listed in `config.yml`'s `pr_settings.labels` (default: `seo-agent`) so
these are easy to filter in the repo's PR list.

## Reviewers
If `config.yml`'s `pr_settings.reviewers` is non-empty, request review from those GitHub
usernames. Otherwise leave unassigned — whoever monitors the repo's PRs will see it via the
label.
