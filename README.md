# Trasier Technology website

A responsive, buildless HTML/CSS/JavaScript site for Trasier Technology, Kathmandu, Nepal. The 2026 redesign adapts Open Design’s editorial token foundation into a dark-blue, blue, and white design system: deep navy backgrounds, layered blue surfaces, white text, and bright-blue accents drawn from the supplied Trasier owl logo.

## Run locally

Requires Node.js 22.15+ (Node.js 24 recommended).

```sh
npm ci
npm run dev
```

Open http://localhost:8000/. No build step or account is needed. Stop the server with Ctrl+C. If the port is occupied, stop the old preview or set the `PORT` environment variable before running the command.

The supplied Trasier owl logo is used unchanged. Pages and interactions work without an email key. Styling and icons are local; the Manrope font uses Google Fonts with a system-font fallback.

## Email forms

`npm run dev` serves `frontend/` and adapts the existing Vercel `/api/contact` and `/api/careers` handlers for local use. Without a configured key, form submission displays a useful email fallback and keeps the visitor’s entered text.

To enable real email, copy `.env.example` to `.env` and set `RESEND_API_KEY`. Never commit the key. Restart the server after changing it. Submitting a configured form sends real email. Careers accepts an optional PDF/DOC/DOCX CV up to 3 MB. Production still uses the existing Vercel functions and `vercel.json` output directory.

The shared Resend test sender remains unchanged; production should use a verified sender domain. See `backend/README.md`.

## Checks

```sh
npm run check
npm test
```

The site check verifies local links/assets, metadata, main landmarks, unique page headings/IDs, image alt attributes, and removal of the previous CDN JavaScript dependencies. Email tests verify that provider rejections cannot be displayed as successful delivery. No test sends email.

## Structure

- `frontend/index.html` — homepage.
- `frontend/sadak-sujhav.html` — sourced product overview, downloads, reporting steps, coverage, FAQs.
- `frontend/case-study-sadak-sujhav.html` — product story and interactive road-photo comparison.
- `frontend/services/` — six service detail pages.
- `frontend/blog/` — existing dated company updates.
- `frontend/css/site.css`, `frontend/js/site.js` — shared responsive design, navigation, accessible interactions, form states.
- `frontend/css/theme-navy.css` — the final shared theme layer: navy `#0e203b`, blue surfaces `#142e50`/`#1b3a60`, white `#f4f8ff`, muted `#b5c6df`, accent `#8abbff`, and action blue `#2364d6`.
- `frontend/css/motion.css`, `frontend/js/motion.js` — native scroll reveals, staggered entrances, a reading-progress line, and reduced-motion support.
- `frontend/css/creative-home.css`, `frontend/js/creative-motion.js` — scroll-driven CSS 3D hero, kinetic typography, and a three-stage reporting story using adapted Hyperframes orbital math.
- `frontend/css/creative-buttons.css`, `frontend/js/creative-buttons.js` — directional arrow capsules, local spotlight, and bounded magnetic interactions with touch/keyboard fallbacks.
- `frontend/css/depth-scenes.css`, `frontend/js/depth-scenes.js` — bounded, fine-pointer depth for product and case-study imagery while captions and controls stay stable.
- `frontend/css/case-study.css`, `frontend/js/case-study.js` — case-study section navigation, accessible audience tabs, and five-location road-photo comparison.
- `frontend/css/vendor/open-design-editorial.css` — Open Design editorial tokens.
- `api/`, `backend/` — existing serverless email endpoints and shared helpers.
- `scripts/` — dependency-free local server and site checks.
- `DESIGN.md` — design direction and component contract.
- `docs/sadak-sujhav-sources.md` — web research, source links, coverage caveats.
- `docs/third-party/` — Open Design and Hyperframes attribution, pinned sources, and licenses.

All existing public URLs, including the four policy/account pages, are preserved. Blog metrics are retained as dated company reports; product pages do not imply nationwide coverage or guaranteed repairs. Product screenshots are previews, not live operational data.

## Source reference

[Open Design](https://github.com/nexu-io/open-design) is an AI design workspace. This site uses its portable editorial design resources; it does not require the Open Design application to run. Third-party notices are retained under `docs/third-party/`.

[Hyperframes](https://github.com/heygen-com/hyperframes) is an HTML-to-video framework with reusable seekable scene primitives. This site adapts its catalog's orbital and camera math into a native interactive CSS 3D scene. The full rendering toolchain is unnecessary for serving the website. The source adaptation is `frontend/js/vendor/hyperframes-orbit.js`; its Apache license is also distributed alongside the module.
