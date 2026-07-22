# Backend

Email sending for the site, via [Resend](https://resend.com).

- `mailer.js` — shared logic for building and sending emails (contact form + careers applications).
- Actual HTTP endpoints live in [`/api`](../api) at the project root, as Vercel serverless functions. They import from this file. Vercel auto-deploys anything in `/api` as a function, regardless of the static site's output directory.

## Endpoints

- `POST /api/contact` — body `{ name, email, message }`. Used by the contact form on the homepage and the dedicated Contact page.
- `POST /api/careers` — body `{ name, email, expertise, filename, fileBase64 }`. `filename`/`fileBase64` are optional (CV attachment, base64-encoded, no data URI prefix). Used by the Careers page's CV modal.

Both send an email to `techtrasier@gmail.com` with the submitter's email set as `Reply-To`, so replying goes straight to them.

## Setup

1. `npm install` at the project root (installs the `resend` package for both local dev and Vercel's build).
2. Set the `RESEND_API_KEY` environment variable:
   - **Locally**: copy `.env.example` to `.env` at the project root and fill in your key. `vercel dev` reads this automatically.
   - **Production (Vercel)**: add `RESEND_API_KEY` under Project Settings → Environment Variables in the Vercel dashboard. Never commit the key to the repo.

## Notes / limits

- The sender address is `onboarding@resend.dev`, Resend's shared test domain. It works without any setup, but Resend's own docs say it's for testing, not production, and delivery to arbitrary recipients isn't guaranteed long-term. For reliable production delivery, verify a real domain (e.g. a subdomain of trasier.tech) in the Resend dashboard and update `FROM` in `mailer.js`.
- CV uploads are capped at 4MB client- and server-side, comfortably under Vercel's serverless function request body limit.
- There's no rate limiting or spam protection on either endpoint yet. Worth adding (e.g. a honeypot field, or Vercel's rate limiting) if abuse becomes a problem.
