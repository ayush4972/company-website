# Website QA fixes — 1 November 2026

This implementation follows the 30 October audit of the Trasier Technology
website. Existing page and policy URLs are preserved. Changes are prepared on
`website_draft` for the normal review/merge-to-`main` deployment workflow.

## Findings addressed

| Audit ID | Result |
| --- | --- |
| Q01 — email configuration | Removed the shared Resend test sender. Both `RESEND_API_KEY` and an explicitly configured, verified-domain `RESEND_FROM` are required. Missing configuration returns a useful email fallback. **Production configuration and inbox receipt remain unverified.** |
| Q02 — unsafe unenhanced forms | Delivered HTML uses POST, disabled fieldsets, and a visible direct-email fallback. Fields become usable only after the JSON handler attaches. |
| Q03 — API validation | Strict types, trimming, required careers background, length/control-character bounds, and bounded PDF/DOC/DOCX attachment validation reject malformed requests before sending. |
| Q04 — accessible names | Control names retain visible wording; service links have specific visible labels and the comparison range uses its associated label. |
| Q05–Q06 — control contrast | Darker keyboard outlines and default input/select borders replace the faint styling; form text is 16px. |
| Q07 — logo delivery | Header/footer use responsive 160/320px lossless WebP exports. The 320px export is 44,590 bytes versus the retained 590,792-byte master (92.45% smaller). Existing favicon URLs remain stable. |
| Q08 — decorative renderer | Small screens, reduced motion and Save-Data retain the SVG and useful capability controls without requesting Three.js. Eligible desktop views defer loading until near view and idle. |
| Q09 — static navigation | A repeatable build renders the skip link, header, footer and native mobile disclosure into every page. Exact current-page semantics are separate from section highlighting. |
| Q10 — submission abuse | Added a honeypot, bounded warm-instance IP-derived limits, and Retry-After responses. This is not a distributed limit; platform rules were not inspected. |
| Q11 — fonts | Licensed local variable Manrope subsets replace duplicate Google Fonts imports and requests. Sources, hashes and OFL notices are included. |
| Q12 — mobile readability | Raised important supporting copy, narrow-screen labels and action text, including later CSS overrides. |
| Q13 — obsolete privacy content | Removed retired vendor links and described current Vercel/Resend processing, self-hosted fonts and in-memory submission controls. |
| Q14 — inconsistent claims | `llms.txt` matches current careers availability and the site's qualified product claims. |
| Q15 — inconsistent title | Retained the existing named grievance/privacy officer, Akash Chaudhary, and removed the unverified Founder title. The officer's identity was not replaced or independently confirmed. |
| Q16 — social/article metadata | Added a current 1200×630 social card; dated articles use relevant existing imagery, useful image metadata and the visible organization author. |
| Q17 — duplicate retries | Unchanged submissions reuse a UUID and opaque provider idempotency key. Changed content, including CV bytes, gets a new identity. Pending requests lock the submitted fields; errors preserve data and keyboard position. |
| Q18 — modification dates | Sitemap and affected article modification dates reflect this release. Original publication dates remain intact. |

Also added a branded 404 page, pinned Node.js 24.x, updated Resend to 6.35.0,
and documented the asset/build/email workflows. Temporary DNS failures now return
a service error without incorrectly rejecting or negatively caching an address.
The attachment checks establish
file-type plausibility; they are not antivirus scanning.

## Validation

- `npm test`: 83 passed, zero failures, including temporary DNS failure/retry cases.
- `npm run check`: 24 pages and 1,242 local links/assets passed.
- Consecutive `npm run build` calls: the second changed zero files.
- Application diff whitespace check: passed. The two exact upstream OFL license
  copies retain a trailing space on line 21 so their recorded source hashes match.
- Dependency installation/audit after the SDK upgrade: zero vulnerabilities reported.
- `node docs/qa/2026-11-01/smoke-local.mjs`: all 24 pages returned 200; missing
  paths returned branded 404 responses (including HEAD); both API routes rejected
  GET, non-JSON and malformed JSON; honeypot submissions stopped before DNS/provider
  work. The script never sends email.
- Automated API/SDK tests mock DNS and the provider. They cover actual SDK request
  serialization and valid/malformed attachment fixtures without sending messages.
- Local phone inspection at 390px confirmed no horizontal overflow, 16px supporting
  copy, loaded WebP logos and static-scene policy. Desktop enhancement initialized
  in the final local preview. The original audit also checked representative
  templates at 320/390/768/820/1280/1440px. Final native-browser inspection was
  limited by unrelated foreground-window activity; no complete new browser matrix
  is claimed.
- Earlier Lighthouse output was contaminated by unrelated injected browser/network
  scripts and is excluded. No valid performance score or field Web Vitals result
  is claimed.

## Remaining external steps

1. Configure a sender address on a domain verified in the same Resend account,
   together with the existing API key, in the required Vercel environments.
   Redeploy after changing environment variables. Never commit secrets.
2. After explicit authorization, submit one controlled message through each form
   and confirm inbox receipt, Reply-To and optional attachment integrity.
3. Merge the reviewed `website_draft` changes into `main`, then check the resulting
   Vercel deployment and live favicon/form behavior. No production deployment is
   claimed by this document.
4. Google controls when its search result icon/title refresh. Source/favicon
   correctness does not establish that Google has reprocessed the site.

The Node runtime pin follows [Vercel's version configuration documentation](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
Email setup and operational limits are documented in `backend/README.md`.
