# Trasier website — 2026 redesign

This local redesign adapts the editorial design-token structure and frontend craft guidance from [Open Design](https://github.com/nexu-io/open-design). Reference: `design-systems/editorial/` and `skills/frontend-design/`. Implementation is original except the attributed vendor tokens. See `docs/third-party/`.

## Direction
Human, useful technology built in Nepal. Dark-blue backgrounds, layered navy and blue surfaces, white type, and bright-blue accents form a cohesive dark-blue, blue, and white theme. Generous editorial typography and real product/road photography keep the work approachable. Use the supplied Trasier owl logo unchanged, with its original colors and proportions. The signature visual is a physical landscape of connected digital signals: layered road tiles, an actual product preview, and orbital people/place/possibility cards. Avoid custom cursors, decorative operational dashboards, and unsupported impact metrics.

## Shared implementation contract
- Every page loads `/css/site.css` and deferred `/js/site.js` (relative paths allowed for static hosting). `/css/theme-navy.css` is the final stylesheet after page-specific styles and owns the current palette.
- `<body data-page="home|product|work|services|company|journal|contact|careers|legal">`.
- Insert `<div data-site-header></div>` before `<main id="main-content">`; `<div data-site-footer></div>` after main. site.js owns accessible header/footer and active navigation.
- Use root-relative internal paths (server root is frontend). Existing URLs must remain available.
- Icons use `<svg ...>` inline or `[data-icon="arrow-up-right|arrow-right|... "]`; site.js renders data-icon placeholders. Text labels always accompany action icons.
- Shared CSS classes: `.container`, `.section`, `.section-sm`, `.eyebrow`, `.muted`, `.accent`, `.section-heading`, `.section-intro`, `.button` (`.button-primary`, `.button-dark`, `.button-outline`, `.button-light`, `.button-small`), `.text-link`, `.pill`, `.tag`, `.page-hero`, `.breadcrumb`, `.split`, `.grid-2`, `.grid-3`, `.card`, `.card-icon`, `.card-link`, `.feature-list`, `.process-grid`, `.process-step`, `.cta-band`, `.dark-section`, `.paper-section`, `.prose`, `.article-layout`, `.article-header`, `.article-meta`, `.image-frame`, `.caption`, `.faq-list`, `.source-note`, `.source-list`, `.form-grid`, `.field`, `.form-status`, `.contact-layout`, `.contact-aside`, `.check-list`.
- `.section-heading` is a flex row with h2/intro or action. `.split` and `.grid-2` are 2 equal columns; `.grid-3` 3 columns. Collapse automatically on mobile.
- `.page-hero` contains `.container`, breadcrumb, eyebrow, one h1, and intro paragraph. Content max-width and typography are built in.
- `.card` is a padded navy surface with high-contrast white text, `.card-icon` a square blue-accent icon treatment. `.feature-list` is an unstyled list with border rows. `.process-step` contains a step number span, h3, paragraph.
- Contact form: id `contact-form`, fields name/email/message, status id `contact-form-status` with role status, submit button. site.js handles submit, honest local backend errors, reset, pending state.
- Careers form: id `careers-form`, fields name/email/expertise/cv file; optional 3 MB CV. status id `careers-form-status`. site.js handles /api/careers.
- Interactions must work without external JS dependencies; body text visible before JS; details/summary for FAQ; semantic headings, labels, alt text, keyboard focus, reduced-motion support.

## Tokens
Page navy `#0e203b`; layered surfaces `#142e50` and `#1b3a60`; white text `#f4f8ff`; muted text `#b5c6df`; link/accent blue `#8abbff`; action blue `#2364d6` with white button text. White and pale-blue illustration details provide contrast within the navy setting. Use the original supplied owl logo at `frontend/assets/images/trasier-logo.jpeg`. Font: Manrope, system fallback. Max container 1280px. Body 16px/1.7, headings tight, big h1 clamp(44px, 6.3vw, 86px). Corners 12–24px; avoid turning all content into cards.

## Verified product facts
Sadak Sujhav: photograph a road issue, confirm GPS/landmark, choose severity, send to road authority, track status. October 17 2026 Google Play release includes in-report messaging, routing preview, offline reports. Android and iPhone/iPad available. Google Play displays 10K+ downloads as of October 24 2026. Launch reporting September 17 2026 describes ~472 km of federal roads in Kathmandu Valley, through Road Division Kathmandu. Do not imply universal national coverage or guaranteed repairs. Existing company posts retain their dated claims with explicit company attribution.

Sources: https://play.google.com/store/apps/details?id=com.nepal.sadaksujav ; https://apps.apple.com/np/app/sadak-sujhav/id6796215640 ; https://english.onlinekhabar.com/road-suggestion-app-launched-to-report-damaged-roads.html

## Motion
Shared native IntersectionObserver/Web Animations reveals live in `frontend/js/motion.js` and `frontend/css/motion.css`. Content stays visible by default. Use small vertical entrances and short grid staggers; do not transform sticky navigation, existing rotated mockups, forms, or comparison controls. Native anchor scrolling stays in control. Reduced-motion changes cancel active reveals; keyboard focus and printing reveal content immediately.

The homepage adds a CSS 3D scene and a three-stage reporting story in `creative-home.css` and `creative-motion.js`. The scene samples actual orbital/camera math adapted from Hyperframes' `three-orbiting-cards` catalog source, with pinned originals and Apache notices in `docs/third-party/hyperframes/`. No renderer, WebGL engine, CDN script, or video pipeline is required. Scroll and fine-pointer events schedule a single frame; there is no idle animation loop. Hidden tabs, offscreen scenes, reduced motion, and printing suspend scene updates. The decorative scene is excluded from generic reveal effects.

Shared creative controls use `creative-buttons.css` and `creative-buttons.js`: blue capsules, circular arrow caps, a local spotlight, and magnetic travel limited to four pixels. Form controls retain their labels and native submit flow. Touch and keyboard use stable controls. The homepage's kinetic divider and editorial service rows belong to the same route-and-signal visual language.

The reporting story shows the complete connection on narrow or short screens and for reduced-motion preferences. Larger windows use the sticky, scroll-linked stages. `depth-scenes.js`/`.css` carries subtle physical depth into the product and case-study preview imagery: movement stays under six pixels/three degrees, decorative layer transforms compose with the original rotations, and captions and controls never move. Coarse pointers, hidden scenes, printing, and reduced motion receive static imagery.
