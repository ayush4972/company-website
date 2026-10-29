# Trasier Technology website

A responsive, buildless HTML/CSS/JavaScript site for Trasier Technology, Kathmandu, Nepal. The 2026 redesign adapts Open Design’s editorial token foundation into an airy blue-and-white design system: white backgrounds, powder-blue surfaces, navy text, and clear blue accents drawn from the supplied Trasier owl logo.

## Run locally

Requires Node.js 22.15+ (Node.js 24 recommended).

```sh
npm ci
npm run dev
```

Open http://localhost:8000/. No build step or account is needed. Stop the server with Ctrl+C. If the port is occupied, stop the old preview or set the `PORT` environment variable before running the command.

The header and footer use a transparent PNG version of the supplied Trasier owl logo, without a background tile. The original JPEG is retained as the source. Pages and interactions work without an email key. Styling and icons are local; the Manrope font uses Google Fonts with a system-font fallback.

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
- `scripts/` — dependency-free local server and site checks.
- `DESIGN.md` — design direction and component contract.
- `docs/sadak-sujhav-sources.md` — web research, source links, coverage caveats.
- `docs/third-party/` — Open Design, Hyperframes, and Three.js attribution, pinned sources, and licenses.

All existing public URLs, including the four policy/account pages, are preserved. Blog metrics are retained as dated company reports; product pages do not imply nationwide coverage or guaranteed repairs. Product screenshots are previews, not live operational data.

## Source reference

[Open Design](https://github.com/nexu-io/open-design) is an AI design workspace. This site uses its portable editorial design resources; it does not require the Open Design application to run. Third-party notices are retained under `docs/third-party/`.

[Hyperframes](https://github.com/heygen-com/hyperframes) is an HTML-to-video framework with reusable seekable scene primitives. The retained native scene code adapts its orbital and camera math. The source adaptation is `frontend/js/vendor/hyperframes-orbit.js`; its Apache license is distributed alongside the module.

The current homepage uses a locally vendored, pinned [Three.js](https://threejs.org/) renderer for a company sculpture. It introduces Trasier's products, intelligence, and connected-systems capabilities before the selected-work section reveals Sadak Sujhav. The scene has semantic controls, a static vector fallback, reduced-motion support, and no continuous idle render loop. Its finite mode transitions continue during scrolling; rendering stops when settled or offscreen. The headline and background use browser-run transform animations. Other pages do not load the renderer.
