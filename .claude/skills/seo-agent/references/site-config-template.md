# seo-agent/config.yml — schema

Every site running the SEO agent needs this file at `seo-agent/config.yml` in its repo. On
a first run with no config file, walk the user through creating it — don't guess values for
things they need to actually decide (target queries, industry framing).

```yaml
site_name: "Trasier Technology"
url: "https://trasiertech.com"
industry: "govtech / enterprise software, Nepal"
goal: >
  Findability for company name + specific product/service categories.
  Not competing for broad generic terms (e.g. "software company") — realistic
  targets are the company name, product names, and specific service phrases.

target_queries:
  - "Trasier Technology"
  - "SadakSujhav"
  - "road complaint management system Nepal"
  - "government software vendor Nepal"
  # Add more as they're identified. On first run, the agent proposes a starting
  # list from the site's own content — confirm/edit before relying on it.

competitors:
  # Optional — leave empty and the agent will find some itself each run.
  # Fill in if you already know who you're competing with for visibility.
  - ""

gsc_property: "https://trasiertech.com/"   # Search Console property URL, or blank if not connected yet

measure_window_days: 14   # how long after a PR merges before judging whether it worked

pr_settings:
  reviewers: []            # GitHub usernames to auto-request review from, optional
  labels: ["seo-agent"]    # applied to every PR this skill opens
```

## Adding a new site

1. Copy this template to `seo-agent/config.yml` in the target repo.
2. Fill in `site_name`, `url`, `industry`, `goal` — these come from the client, don't invent them.
3. Propose `target_queries` based on the site's actual content, then confirm with the user
   before the first real run relies on them.
4. Leave `gsc_property` blank until Search Console is connected (see `gsc-integration.md`) —
   the agent works without it, just with less feedback data.
