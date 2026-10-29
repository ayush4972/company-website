/* Measured browser-composited entrances. Scrolling never runs animation JavaScript. */
export function initMotion() {
  const root = document.documentElement;
  const main = document.querySelector('main');
  if (!main || root.dataset.motionInitialized === 'true') return;
  root.dataset.motionInitialized = 'true';

  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const candidates = [
    '.page-hero h1', '.page-hero .eyebrow', '.page-hero .section-intro', '.page-hero > .container > p',
    '.article-header h1', '.article-header > p', '.article-meta',
    '.section-heading', '.service-item', '.journal-card > h3', '.journal-card > p', '.journal-meta', '.journal-entry',
    '.company-intro-grid > div', '.company-paths > a',
    '.approach-lead > div', '.approach-step', '.process-step', '.quote-card', '.card',
    '.prose h2', '.prose h3',
    '.case-snapshot', '.case-expanded-facts > div', '.case-intro-grid > div', '.case-challenge-list > li',
    '.case-journey > li', '.case-callout', '.case-shared-record', '.case-evidence-footer > *',
    '.case-timeline > li', '.case-limit-grid > div', '.case-source-cards > article',
    '.case-faq-grid > div:first-child', '.home-cta > div', '.cta-band > div',
  ].join(',');
  const blocked = 'form, input, textarea, select, img, picture, canvas, video, [role="tablist"], [data-comparison], [data-case-nav], .faq-list';
  const all = [...main.querySelectorAll(candidates)].filter(element =>
    !element.closest('[data-motion="off"], [role="tabpanel"], .company-hero, .work-showcase') &&
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
  const seen = new WeakSet();
  const active = new Map();

  let observer;
  let enabled = false;
  const supportsTranslate = typeof CSS !== 'undefined' && CSS.supports('translate', '0 1px');
  const canReveal = 'IntersectionObserver' in window && typeof Element.prototype.animate === 'function';
  const finish = element => {
    seen.add(element);
    observer?.unobserve(element);
    const animation = active.get(element);
    if (animation) {
      animation.onfinish = null;
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
    element.dataset.motionState = 'animating';
    try {
      const animation = element.animate([
        { opacity: .5, ...(supportsTranslate ? { translate: '0 8px' } : {}) },
        { opacity: 1, ...(supportsTranslate ? { translate: '0 0' } : {}) },
      ], { duration: 650, easing: 'cubic-bezier(.2,.65,.3,1)', fill: 'both' });
      active.set(element, animation);
      animation.onfinish = () => finish(element);
    } catch {
      // An older browser still gets the complete, immediately readable page.
      finish(element);
    }
  };

  const enable = () => {
    if (enabled || preference.matches) return;
    enabled = true;
    root.dataset.motionEngine = 'native';
    root.classList.add('motion-enabled');
    if (canReveal) {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target); });
      }, { rootMargin: '0px 0px 40px 0px', threshold: 0.01 });
      const viewport = window.innerHeight;
      targets.forEach(element => {
        if (seen.has(element)) return;
        const visible = element.getClientRects().length > 0;
        const bounds = visible ? element.getBoundingClientRect() : null;
        // First-screen and restored content is always immediately visible.
        if (visible && bounds.top < viewport) {
          finish(element);
        } else {
          element.dataset.motionState = 'observed';
          observer.observe(element);
        }
      });
    }
  };
  const disable = () => {
    enabled = false;
    observer?.disconnect();
    observer = undefined;
    finishAll();
    root.classList.remove('motion-enabled');
    targets.forEach(element => { element.dataset.motionState = 'revealed'; });
  };

  window.addEventListener('pagehide', finishAll);
  window.addEventListener('beforeprint', finishAll);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) finishAll();
  });
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
  });
  preference.addEventListener('change', () => {
    if (preference.matches) disable();
    else enable();
  });
  enable();
}
