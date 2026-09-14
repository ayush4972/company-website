# Weekly SEO Automation — www.trasiertech.com.np

**How this runs:** A weekly scheduled Claude Code task (set up via `/schedule`) runs the prompt below automatically every week and saves a dated report into this same `seo-reports/` folder.

You can also paste the prompt block directly into a normal Claude chat any time you want an on-demand run instead of waiting for the schedule.

---

## The Scheduled Task Prompt

```
Run the weekly SEO check for https://www.trasiertech.com.np and produce a single report
with four sections.

SECTION 1 — TECHNICAL AUDIT
- Fetch https://www.trasiertech.com.np and its /robots.txt and /sitemap.xml
- Check: page loads without errors, title tag + meta description present on homepage,
  H1 present, images have alt text, no obvious broken internal links (spot-check nav links),
  HTTPS is enforced, mobile viewport meta tag present
- Confirm robots.txt does NOT block GPTBot, ClaudeBot, PerplexityBot, or Google-Extended
- Note page load feel (fast/slow) and any console-visible errors if checkable
- Flag anything broken or missing since last week

SECTION 2 — AI SEARCH VISIBILITY (AEO/GEO)
- Check whether /llms.txt exists on www.trasiertech.com.np
- Test these queries in web search and note if trasiertech.com.np or Trasier Technology
  appears in results or AI-generated summaries:
  - "software company Kathmandu Nepal"
  - "civic software Nepal government"
  - "Trasier Technology"
  - "road complaint management system Nepal" (Sadak Sujhav relevance)
- Note which competitors appear instead

SECTION 3 — CONTENT GAPS
- List any pages/sections that look thin, outdated, or missing (e.g. no case studies,
  no blog, no dated content)
- Suggest 2-3 concrete content pieces for the week (title + 1-line angle) based on
  gaps found — comparison content, case studies on Sadak Sujhav, or government
  proposal credibility content tend to perform best for this kind of site
- Do NOT write full drafts unless asked — just the gap + suggested angle

SECTION 4 — RANK / POSITION CHECK
- Search these terms and note www.trasiertech.com.np's approximate position (or "not found"):
  - "trasier technology"
  - "software company Nepal government projects"
  - "sadak sujhav"
- Compare to last week's report if one exists in this project's seo-reports/ folder

Save the report as a dated markdown file inside seo-reports/
(trasiertech-seo-YYYY-MM-DD.md) and give a 3-sentence summary of what changed since
last week at the top.
```

---

## Notes

- First run has no "last week" to compare against — that's expected, it just establishes the baseline.
- robots.txt (added 2026-09-14) already allows all crawlers by default (`User-agent: * / Allow: /`), so it does not block GPTBot/ClaudeBot/PerplexityBot/Google-Extended — that check should pass automatically going forward.
- /llms.txt does not exist yet — the first few reports will likely flag this as a gap until it's built.
- Once this is working well here, the same prompt template works for other sites — swap the domain and the query list in Sections 2 and 4.
