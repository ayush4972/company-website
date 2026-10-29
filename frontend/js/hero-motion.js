import { waapi } from './vendor/animejs/anime.esm.min.js';

const instances = new WeakMap();
const LINE_DURATION = 1100;
const LINE_STAGGER = 200;
const UNDERLINE_DURATION = 650;
const UNDERLINE_GAP = 80;

/** Compositor-run hero motion: native transform animations, without a JS ticker. */
export function initHeroMotion({ animate = (target, options) => waapi.animate(target, options) } = {}) {
  const hero = document.querySelector('[data-hero-motion]');
  if (!hero) return;
  if (instances.has(hero)) return instances.get(hero);
  const lines = [...hero.querySelectorAll('[data-hero-line]')];
  const underline = hero.querySelector('[data-hero-underline]');
  const layers = [...hero.querySelectorAll('[data-hero-atmosphere] > span')];
  if (!lines.length || !underline) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const originalMarker = hero.dataset.heroMotion;
  const cleanups = [];
  const entrances = new Set();
  let ambient = [];
  let observer;
  let disposed = false;
  let printing = false;
  let pageActive = true;
  let entered = false;
  let ambientFailed = false;
  const on = (target, type, listener, options) => {
    target.addEventListener(type, listener, options);
    cleanups.push(() => target.removeEventListener(type, listener, options));
  };
  const inViewport = () => {
    const bounds = hero.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.top < window.innerHeight;
  };
  let visible = inViewport();
  const stopEntrance = () => {
    entered = true;
    for (const animation of entrances) {
      animation.onComplete = () => {};
      animation.revert();
    }
    entrances.clear();
    hero.dataset.heroReveal = 'settled';
  };
  const clearAmbient = () => {
    ambient.forEach(animation => animation.revert());
    ambient = [];
    hero.dataset.heroAmbient = 'static';
  };
  const syncAmbient = () => {
    if (disposed) return;
    if (reduced.matches || printing || ambientFailed || typeof animate !== 'function') {
      clearAmbient();
      return;
    }
    if (!visible || document.hidden || !pageActive) {
      ambient.forEach(animation => animation.pause());
      hero.dataset.heroAmbient = ambient.length ? 'paused' : 'static';
      return;
    }
    if (!ambient.length) {
      try {
        layers.forEach((layer, index) => ambient.push(animate(layer, {
          transform: [
            'translate3d(0px, 0px, 0px)',
            index % 2 ? 'translate3d(-10px, 12px, 0px)' : 'translate3d(12px, -8px, 0px)',
          ],
          duration: 24000 + index * 5000,
          ease: 'inOutSine',
          alternate: true,
          loop: true,
          autoplay: false,
        })));
      } catch {
        ambientFailed = true;
        clearAmbient();
        return;
      }
    }
    ambient.forEach(animation => animation.play());
    hero.dataset.heroAmbient = ambient.length ? 'running' : 'static';
  };

  hero.dataset.heroMotion = 'compositor';
  const restored = window.scrollY > 24 || !!window.location.hash;
  if (!reduced.matches && !document.hidden && visible && !restored && typeof animate === 'function') {
    hero.dataset.heroReveal = 'playing';
    try {
      lines.forEach((line, index) => entrances.add(animate(line, {
        transform: ['translate3d(0, 120%, 0)', 'translate3d(0, 0%, 0)'],
        duration: LINE_DURATION,
        delay: index * LINE_STAGGER,
        ease: 'out(3)',
      })));
      entrances.add(animate(underline, {
        transform: ['scaleX(0)', 'scaleX(1)'],
        duration: UNDERLINE_DURATION,
        delay: (lines.length - 1) * LINE_STAGGER + LINE_DURATION + UNDERLINE_GAP,
        ease: 'out(3)',
        onComplete: stopEntrance,
      }));
    } catch { stopEntrance(); }
  } else stopEntrance();

  if ('IntersectionObserver' in window) {
    observer = new window.IntersectionObserver(entries => {
      if (disposed) return;
      visible = entries[0].isIntersecting;
      if (!visible && !entered) stopEntrance();
      syncAmbient();
    }, { threshold: .01 });
    observer.observe(hero);
  }
  on(window, 'scroll', () => {
    if (!entered && window.scrollY > 24) stopEntrance();
    // Without intersection observation the decorative drift stays static;
    // scroll events never measure layout or drive animation progress.
  }, { passive: true });
  on(window, 'resize', () => { stopEntrance(); visible = inViewport(); syncAmbient(); }, { passive: true });
  on(window, 'hashchange', stopEntrance);
  on(document, 'focusin', stopEntrance);
  on(document, 'visibilitychange', () => { if (document.hidden) stopEntrance(); syncAmbient(); });
  on(reduced, 'change', () => { stopEntrance(); syncAmbient(); });
  on(window, 'beforeprint', () => { printing = true; stopEntrance(); syncAmbient(); });
  on(window, 'afterprint', () => { printing = false; syncAmbient(); });
  on(window, 'pagehide', () => { pageActive = false; stopEntrance(); syncAmbient(); });
  on(window, 'pageshow', () => { pageActive = true; visible = inViewport(); syncAmbient(); });
  if (!('IntersectionObserver' in window)) ambientFailed = true;
  syncAmbient();

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    stopEntrance();
    clearAmbient();
    observer?.disconnect();
    cleanups.forEach(remove => remove());
    if (originalMarker === undefined) delete hero.dataset.heroMotion;
    else hero.dataset.heroMotion = originalMarker;
    delete hero.dataset.heroReveal;
    delete hero.dataset.heroAmbient;
    instances.delete(hero);
  };
  instances.set(hero, cleanup);
  return cleanup;
}
