# Trasier Tech website — rules for working in this repo

**This repository is public.** Never commit server addresses, keys, tokens, passwords,
internal-only figures or anyone's personal data.

## Layout
- `frontend/` - the site: plain HTML/CSS/JS (Tailwind via CDN on some pages), served by Vercel
  (`vercel.json` → `outputDirectory: frontend`). Blog posts in `frontend/blog/`, service pages in
  `frontend/services/`.
- `api/` - Vercel serverless functions for the contact and careers forms (send mail via Resend;
  the API key is a Vercel environment variable, never in the repo). `backend/` holds their helpers.
- `.claude/skills/` - Claude skills for this repo: `gsap-*` (animations) and `seo-agent`.
- `seo-agent/` + `.github/workflows/seo-agent.yml` - an automated SEO job that also pushes to
  this repo (branches `seo-agent/*`); pull before you start.

## Rules
- Keep every existing URL working. These are linked from the app stores and must never move or
  break: `sadak-sujhav-privacy.html`, `privacy-policy.html`, `account-deletion.html`,
  `terms-of-service.html`.
- New page or blog post → add it to `sitemap.xml` (and list posts on `blog.html`).
- Match the existing look (the "Cyan Sentinel" design system); check pages at desktop and phone
  widths before pushing (`python3 -m http.server` inside `frontend/`).
- Figures about SadakSujhav must be public, approved numbers.

## Git
`main` is live: pushing to `main` deploys the site through Vercel. Pull (`--ff-only`) first.
