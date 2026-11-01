/* Pure shared-shell rendering for generated HTML and the browser fallback. */
const icons = {
    'arrow-up-right': '<path d="M7 17 17 7M7 7h10v10"/>',
    'arrow-right': '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    'arrow-left': '<path d="M20 12H4m6-6-6 6 6 6"/>',
    'arrow-up': '<path d="M12 20V4m-6 6 6-6 6 6"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'menu': '<path d="M4 7h16M4 12h16M4 17h16"/>',
    'close': '<path d="m6 6 12 12M6 18 18 6"/>',
    'map-pin': '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    'globe': '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>',
    'building': '<path d="m3 8 9-5 9 5M3 9h18M5 10v9m5-9v9m4-9v9m5-9v9M3 21h18"/>',
    'code': '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-16-2 20"/>',
    'sparkles': '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4m-2-2h4"/>',
    'layers': '<path d="m12 3 10 6-10 6L2 9l10-6ZM2 14l10 6 10-6M2 18l10 6 10-6"/>',
    'map': '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16"/>',
    'phone': '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 5h4m-3 14h2"/>',
    'chart': '<path d="M4 3v17h17M8 15v-4m5 4V7m5 8V4"/>',
    'plug': '<path d="M8 2v5m8-5v5M5 7h14v3a7 7 0 0 1-7 7v5m-7-15v3a7 7 0 0 0 7 7"/>',
    'check': '<path d="m5 12 4 4L19 6"/>',
    'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    'mail': '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
    'users': '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 5a5 5 0 0 1 3 5"/>',
    'camera': '<path d="M3 6h4l2-3h6l2 3h4v15H3V6Z"/><circle cx="12" cy="13" r="4"/>',
    'route': '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h9a4 4 0 0 1 0 8H8a4 4 0 0 0 0 8h6"/>',
    'download': '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
    'wifi-off': '<path d="m3 3 18 18M8 8a10 10 0 0 1 12 2M4 10l1-1m3 5a6 6 0 0 1 6-1m-3 5h2"/>',
    'message': '<path d="M21 15a3 3 0 0 1-3 3H8l-5 4V5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v10Z"/><path d="M7 7h10M7 12h7"/>',
    'shield': '<path d="m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6l9-4Z"/><path d="m8 12 3 3 5-6"/>',
    'heart': '<path d="M20 4a5 5 0 0 0-8 2 5 5 0 0 0-8-2c-5 5 1 11 8 17 7-6 13-12 8-17Z"/>',
    'compass': '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6 6-2Z"/>',
    'external-link': '<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>',
    'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    'bell': '<path d="M5 17h14l-2-3V8a5 5 0 0 0-10 0v6l-2 3Zm5 4h4"/>',
  };
export const icon = (name, cls = 'icon') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons['arrow-up-right']}</svg>`;

const brand = `<a class="brand" href="/" aria-label="Trasier Technology home"><img class="brand-logo" src="/assets/images/trasier-logo-320.webp" srcset="/assets/images/trasier-logo-160.webp 160w, /assets/images/trasier-logo-320.webp 320w" sizes="(max-width:640px) 98px, 160px" alt="Trasier Tech owl logo" width="320" height="320"></a>`;

const links = [
    { href: '/#projects', label: 'Our work', active: ['work', 'product'] },
    { href: '/#services', label: 'What we do', active: ['services'] },
    { href: '/company.html', label: 'About us', active: ['company', 'careers'] },
    { href: '/blog.html', label: 'Journal', active: ['journal'] },
  ];

export function renderHeader(page = '', pathname = '') {
  const navAttributes = ({ href, active = [] }) => `${active.includes(page) ? ' data-active="true"' : ''}${!href.includes('#') && href === pathname ? ' aria-current="page"' : ''}`;
  const navLinks = links.map(link => `<a href="${link.href}"${navAttributes(link)}>${link.label}</a>`).join('');
  const announcementHref = page === 'home' ? '/company.html' : '/sadak-sujhav.html';
  const announcementCopy = page === 'home'
    ? '<strong>Built in Nepal. Designed for everyday life.</strong><span class="announcement-extra"> Meet Trasier Technology.</span>'
    : '<strong>Better roads start with a voice.</strong><span class="announcement-extra"> Meet Sadak Sujhav, built by Trasier.</span>';
  return `<a class="skip-link" href="#main-content">Skip to content</a>
      <div class="announcement"><a href="${announcementHref}">${announcementCopy}${icon('arrow-up-right')}</a></div>
      <header class="site-header" data-site-header><div class="container header-inner">${brand}<nav class="desktop-nav" aria-label="Main navigation">${navLinks}</nav><a class="button button-primary button-small header-cta" href="/contact.html">Let’s talk ${icon('arrow-up-right')}</a><details class="mobile-menu"><summary class="menu-toggle" aria-label="Navigation menu" aria-controls="mobile-navigation">${icon('menu')}</summary><nav class="mobile-nav" id="mobile-navigation" aria-label="Mobile navigation">${links.map(link => `<a href="${link.href}"${navAttributes(link)}>${link.label}${icon('arrow-up-right')}</a>`).join('')}<a href="/sadak-sujhav.html"${navAttributes({ href: '/sadak-sujhav.html' })}>Sadak Sujhav ${icon('arrow-up-right')}</a><a href="/careers.html"${navAttributes({ href: '/careers.html' })}>Careers ${icon('arrow-up-right')}</a><a href="/contact.html"${navAttributes({ href: '/contact.html' })}>Start a conversation ${icon('arrow-up-right')}</a></nav></details></div></header>`;
}

export function renderFooter(year = new Date().getFullYear()) {
  return `<footer class="site-footer" data-site-footer><div class="container"><div class="footer-grid"><div class="footer-brand">${brand}<p>Thoughtful technology. Everyday impact.<br>Built in Nepal, with people at the heart.</p><span class="footer-location">${icon('map-pin')}Kathmandu, Nepal</span></div><div><h2 class="footer-label">Explore</h2><ul class="footer-links"><li><a href="/#projects">Our work</a></li><li><a href="/sadak-sujhav.html">Sadak Sujhav</a></li><li><a href="/case-study-sadak-sujhav.html">The case study</a></li><li><a href="/blog.html">Journal</a></li></ul></div><div><h2 class="footer-label">Company</h2><ul class="footer-links"><li><a href="/company.html">About Trasier</a></li><li><a href="/leadership.html">Our story</a></li><li><a href="/careers.html">Careers</a></li><li><a href="/contact.html">Get in touch</a></li></ul></div><div><h2 class="footer-label">Have something in mind?</h2><ul class="footer-links"><li><a href="mailto:techtrasier@gmail.com">techtrasier@gmail.com</a></li><li><a class="text-link" href="/contact.html">Let’s build it together ${icon('arrow-up-right')}</a></li></ul></div></div><div class="footer-bottom"><span>© ${year} Trasier Technology. Made with purpose.</span><div class="footer-legal"><a href="/privacy-policy.html">Privacy</a><a href="/terms-of-service.html">Terms</a><a href="/account-deletion.html">Account deletion</a><a class="back-top" href="#main-content">Back to top ${icon('arrow-up')}</a></div></div></div></footer>`;
}
