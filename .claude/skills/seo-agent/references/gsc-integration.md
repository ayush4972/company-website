# Google Search Console integration

GSC gives the agent real search-performance data instead of guessing — which queries the
site actually gets impressions/clicks for, indexing status per page, and a way to resubmit
the sitemap. This is what makes Phase 5 (Measure) meaningful instead of a no-op.

## One-time setup (per client, done by a human — not something this skill does itself)

1. In Google Cloud Console, create a service account and enable the **Search Console API**.
2. In Google Search Console, add that service account's email as a user on the property
   (Owner or Full access).
3. Download the service account's JSON key.
4. Store it as a GitHub Actions secret in the client's repo, e.g. `GSC_SERVICE_ACCOUNT_JSON`.
   Never commit this file to the repo itself.
5. Set `gsc_property` in `seo-agent/config.yml` to the exact property URL as it appears in
   Search Console.

## What the skill does with it at runtime

When the GitHub Actions workflow runs this skill, the service account credentials are
available as an environment variable (see `workflow-template/seo-agent.yml`). Use them to
call the Search Console API:

- **Search Analytics API** (`searchanalytics.query`) — pull queries, impressions, clicks,
  average position for a date range, filtered by page where useful. Used in Phase 2
  (research: what does the site already rank for) and Phase 5 (measure: before/after a
  merged change).
- **Sitemaps API** — resubmit the sitemap after a merge that changes it.
- **URL Inspection API** — check indexing status of specific pages, request re-indexing
  after a fix that affects them.

## If GSC isn't connected yet

The skill still runs — it just relies on web research alone for Phase 2 and can't measure
real outcomes in Phase 5 (changes get logged as "merged, outcome unmeasured"). Note this
plainly in the run's report so the user knows what they're missing by not connecting it, but
don't block the run on it.
