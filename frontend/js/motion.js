/* Native, one-time scroll reveals. Content is visible without this enhancement. */
export function initMotion() {
  const root = document.documentElement;
  const main = document.querySelector('main');
  if (!main || root.dataset.motionInitialized === 'true') return;
  root.dataset.motionInitialized = 'true';

  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.querySelector('.site-header');
  const candidates = [
    '.hero-copy > .eyebrow', '.hero-copy > h1', '.hero-copy > p', '.hero-copy > .button-row', '.hero-art',
    '.page-hero h1', '.page-hero .eyebrow', '.page-hero .section-intro', '.page-hero > .container > p',
    '.product-hero-copy > h1', '.product-hero-copy > .eyebrow', '.product-hero-copy > p', '.product-hero-copy > .button-row', '.product-art',
    '.article-header h1', '.article-header > p', '.article-meta',
    '.section-heading', '.service-item', '.journal-card', '.journal-entry', '.work-showcase',
    '.approach-lead > div', '.approach-step', '.process-step', '.image-frame', '.portrait-frame', '.quote-card', '.card',
    '.split > div:not(.faq-list)', '.grid-2 > div', '.grid-3 > div', '.prose h2', '.prose h3', '.prose > figure', '.prose .ba-pair',
    '.case-snapshot', '.case-expanded-facts > div', '.case-intro-grid > div', '.case-challenge-list > li',
    '.case-journey > li', '.case-callout', '.case-shared-record', '.case-evidence-footer > *',
    '.case-timeline > li', '.case-limit-grid > div', '.case-source-cards > article',
    '.case-faq-grid > div:first-child', '.home-cta > div', '.cta-band > div',
  ].join(',');
  const blocked = 'form, input, textarea, select, [role="tablist"], [data-comparison], [data-case-nav], .faq-list';
  const all = [...main.querySelectorAll(candidates)].filter(element =>
    !element.closest('[data-motion="off"], [role="tabpanel"]') &&
    !element.matches(blocked) && !element.querySelector(blocked),
  );
  // A block and its children should never fade or move on top of each other.
  const selected = new Set(all);
  const targets = all.filter(element => {
    for (let parent = element.parentElement; parent && parent !== main; parent = parent.parentElement) {
      if (selected.has(parent)) return false;
    }
    return true;
  });
  const siblingCounts = new Map();
  const delays = new WeakMap();
  const seen = new WeakSet();
  const active = new Map();
  targets.forEach(element => {
    const index = siblingCounts.get(element.parentElement) || 0;
    siblingCounts.set(element.parentElement, index + 1);
    delays.set(element, Math.min(index, 3) * 65);
  });

  let observer;
  let progress;
  let frame = 0;
  let enabled = false;
  const supportsTranslate = typeof CSS !== 'undefined' && CSS.supports('translate', '0 1px');
  const canReveal = 'IntersectionObserver' in window && typeof Element.prototype.animate === 'function';
  const finish = element => {
    seen.add(element);
    observer?.unobserve(element);
    const animation = active.get(element);
    if (animation) {
      animation.onfinish = null;
      animation.oncancel = null;
      animation.cancel();
      active.delete(element);
    }
    element.dataset.motionState = 'revealed';
  };
  const finishAll = () => {
    [...active.keys()].forEach(finish);
  };
  const reveal = element => {
    if (!enabled || seen.has(element) || element.getClientRects().length === 0) return;
    seen.add(element);
    observer?.unobserve(element);
    // A focused control must be readable immediately, including after a skip/anchor jump.
    if (element.contains(document.activeElement)) { finish(element); return; }
    const visual = element.matches('.hero-art, .product-art, .image-frame, .portrait-frame, .work-showcase');
    const first = { opacity: 0 };
    const last = { opacity: 1 };
    if (supportsTranslate) {
      first.translate = `0 ${visual ? 22 : 18}px`;
      last.translate = '0 0';
    }
    element.dataset.motionState = 'animating';
    try {
      const animation = element.animate([first, last], {
        duration: visual ? 820 : 680,
        delay: delays.get(element) || 0,
        easing: 'cubic-bezier(.22, 1, .36, 1)',
        fill: 'both',
      });
      active.set(element, animation);
      animation.onfinish = () => finish(element);
      animation.oncancel = () => {
        active.delete(element);
        element.dataset.motionState = 'revealed';
      };
    } catch {
      // An older browser still gets the complete, immediately readable page.
      finish(element);
    }
  };

  const paintScroll = () => {
    frame = 0;
    if (!enabled) return;
    const top = Math.max(0, window.scrollY);
    const distance = Math.max(0, root.scrollHeight - root.clientHeight);
    const ratio = distance ? Math.min(1, top / distance) : 0;
    if (progress) progress.style.transform = `scaleX(${ratio})`;
    header?.classList.toggle('is-scrolled', top > 24);
  };
  const queueScroll = () => {
    if (enabled && !frame) frame = requestAnimationFrame(paintScroll);
  };
  const enable = () => {
    if (enabled || preference.matches) return;
    enabled = true;
    root.classList.add('motion-enabled');
    progress = document.createElement('div');
    progress.className = 'scroll-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.appendChild(progress);
    if (canReveal) {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target); });
      }, { rootMargin: '0px 0px -36px 0px', threshold: 0.08 });
      const viewport = window.innerHeight;
      const restoredPosition = window.scrollY > 24 || !!window.location.hash;
      targets.forEach(element => {
        if (seen.has(element)) return;
        const visible = element.getClientRects().length > 0;
        const bounds = visible ? element.getBoundingClientRect() : null;
        // Do not fade content that the browser has restored or jumped to.
        if (visible && (bounds.bottom < 0 || (restoredPosition && bounds.top < viewport))) {
          finish(element);
        } else {
          element.dataset.motionState = 'observed';
          observer.observe(element);
        }
      });
    }
    queueScroll();
  };
  const disable = () => {
    enabled = false;
    observer?.disconnect();
    observer = undefined;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    finishAll();
    progress?.remove();
    progress = undefined;
    header?.classList.remove('is-scrolled');
    root.classList.remove('motion-enabled');
    targets.forEach(element => { element.dataset.motionState = 'revealed'; });
  };

  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', queueScroll, { passive: true });
  window.addEventListener('pageshow', queueScroll);
  window.addEventListener('pagehide', finishAll);
  window.addEventListener('beforeprint', finishAll);
  document.addEventListener('focusin', event => {
    const element = event.target.closest?.('[data-motion-state]');
    if (element) finish(element);
  });
  window.addEventListener('hashchange', () => {
    // Native anchor scrolling owns the position; reveals never delay the destination.
    let destination;
    try { destination = document.getElementById(decodeURIComponent(window.location.hash.slice(1))); }
    catch { return; }
    if (destination) targets.filter(element => destination === element || destination.contains(element) || element.contains(destination)).forEach(finish);
    queueScroll();
  });
  preference.addEventListener('change', () => {
    if (preference.matches) disable();
    else enable();
  });
  // Shared navigation and page-specific tabs finish setting up before measuring.
  requestAnimationFrame(enable);
}
