# Trasier Technology website

A responsive HTML/CSS/JavaScript site for Trasier Technology, Kathmandu, Nepal. A small Node preparation step renders shared navigation into the static pages. The 2026 redesign adapts Open Design’s editorial token foundation into an airy blue-and-white design system: white backgrounds, powder-blue surfaces, navy text, and clear blue accents drawn from the supplied Trasier owl logo.

## Run locally

Requires Node.js 24.x, pinned in `package.json` for local development and Vercel functions.

```sh
npm ci
npm run dev
```

Open http://localhost:8000/. `npm run dev` prepares the static pages automatically; no hosting account is needed. Stop the server with Ctrl+C. If the port is occupied, stop the old preview or set the `PORT` environment variable before running the command.

The header and footer use small, lossless WebP exports of the supplied Trasier owl logo. The full-size transparent PNG and original JPEG are retained. Pages work without an email key. Styling, icons, and licensed variable Manrope fonts are served locally; Nepali text retains the system-font fallback. Static header/footer links and the native mobile menu work without JavaScript.

## Email forms

`npm run dev` serves `frontend/` and adapts the existing Vercel `/api/contact` and `/api/careers` handlers for local use. Without a configured key, form submission displays a useful email fallback and keeps the visitor’s entered text.

To enable real email, copy `.env.example` to `.env` and set `RESEND_API_KEY` and `RESEND_FROM`. The sender must belong to a domain verified in the same Resend account; the restricted `resend.dev` test sender is rejected. Never commit the key. Restart after changing configuration. Submitting a configured form sends real email. Careers accepts an optional original PDF/DOC/DOCX CV up to 3 MiB. The server validates fields/attachments and applies a honeypot, bounded per-instance request limits, and provider idempotency. See `backend/README.md` for operational limits.

Forms remain disabled until their JSON handler is attached and show a working email link otherwise. Pending submissions lock their fields; errors keep entered values. Unchanged retries reuse a submission ID, including the same CV contents, to avoid duplicate provider sends.

## Prepare and deploy

```sh
npm run build
```

This idempotently prepares the checked-in HTML shell, local font links, and form fallbacks. `vercel.json` runs it before serving `frontend/`; root `api/` functions remain included. Keep Vercel's Root Directory at the repository root. Configure both email variables in the appropriate Vercel environment before relying on form delivery.

To regenerate logo exports and the SVG-authored 1200×630 social card from the existing artwork, run `npm run assets`. Sharp is a development-only export dependency. Generated images are committed; the production HTML build does not need to regenerate them. The custom `404.html` preserves an HTTP 404 and is deliberately excluded from the sitemap.

## Checks

```sh
npm run check
npm test
```

The site check verifies local links/assets, metadata, landmarks, unique headings/IDs, alt text, delivered navigation, local font loading, and safe disabled form fallbacks. Tests cover motion lifecycle, deferred 3D, retry identity, field/attachment validation, request limits, and actual SDK serialization with provider/DNS calls mocked. No test sends email.

## Structure

- `frontend/index.html` — homepage.
- `frontend/sadak-sujhav.html` — sourced product overview, downloads, reporting steps, coverage, FAQs.
- `frontend/case-study-sadak-sujhav.html` — product story and interactive road-photo comparison.
- `frontend/services/` — six service detail pages.
- `frontend/blog/` — existing dated company updates.
- `frontend/css/site.css`, `frontend/js/site.js` — shared responsive design, navigation, accessible interactions, form states.
- `frontend/css/theme.css` — the final shared theme layer: page white `#f8fbff`, white cards `#ffffff`, powder blue `#eaf4ff`, navy text `#16385f`, muted text `#526b88`, link blue `#1d5fbf`, and action blue `#2364d6`.
- `frontend/css/motion.css`, `frontend/js/motion.js` — brief native entrances with no stagger or per-scroll JavaScript, plus reduced-motion support.
- `frontend/css/company-home.css`, `frontend/css/company-scene.css`, `frontend/js/company-scene.js` — company-first landing, interactive Three.js sculpture, and capability exploration with a static SVG fallback.
- `frontend/js/hero-motion.js` — masked headline and underline entrances plus subtle background drift, using anime.js's native WAAPI backend.
- `frontend/css/creative-home.css`, `frontend/js/creative-motion.js` — selected-work styles, a browser-driven typography divider, and retained native scene primitives using adapted Hyperframes orbital math.
- `frontend/css/creative-buttons.css`, `frontend/js/creative-buttons.js` — anime.js arrow gestures, click ripples, press feedback, and local spotlight, with stable touch/keyboard targets.
- `frontend/js/vendor/animejs/` — locally served anime.js 4.5.0 browser runtime, source checksum, and MIT license.
- `frontend/css/depth-scenes.css`, `frontend/js/depth-scenes.js` — bounded pointer depth and native scroll-timeline parallax for product and case-study imagery, with a cached-geometry fallback.
- `frontend/css/case-study.css`, `frontend/js/case-study.js` — case-study section navigation, accessible audience tabs, and five-location road-photo comparison.
- `frontend/css/vendor/open-design-editorial.css` — Open Design editorial tokens.
- `api/`, `backend/` — existing serverless email endpoints and shared helpers.
- `scripts/` — static-page preparation, local server, site checks, and optional brand-asset exports.
- `frontend/fonts/`, `frontend/css/fonts.css` — self-hosted variable Manrope subsets and their OFL license.
- `DESIGN.md` — design direction and component contract.
- `docs/sadak-sujhav-sources.md` — web research, source links, coverage caveats.
- `docs/third-party/` — Open Design, Hyperframes, and Three.js attribution, pinned sources, and licenses.

All existing public URLs, including the four policy/account pages, are preserved. Blog metrics are retained as dated company reports; product pages do not imply nationwide coverage or guaranteed repairs. Product screenshots are previews, not live operational data.

## Source reference

[Open Design](https://github.com/nexu-io/open-design) is an AI design workspace. This site uses its portable editorial design resources; it does not require the Open Design application to run. Third-party notices are retained under `docs/third-party/`.

[Hyperframes](https://github.com/heygen-com/hyperframes) is an HTML-to-video framework with reusable seekable scene primitives. The retained native scene code adapts its orbital and camera math. The source adaptation is `frontend/js/vendor/hyperframes-orbit.js`; its Apache license is distributed alongside the module.

The current homepage uses a locally vendored, pinned [Three.js](https://threejs.org/) renderer for a company sculpture. It introduces Trasier's products, intelligence, and connected-systems capabilities before the selected-work section reveals Sadak Sujhav. On small screens, reduced motion, or Save-Data, a light capability module keeps the choices useful with the static SVG and does not request Three.js. Eligible desktop views defer the renderer until it approaches view and the browser is idle. Its finite transitions settle and rendering stops offscreen; other pages do not load it.
