import { initCompanyCapabilities } from './company-capabilities.js';

/** Keep the static illustration on small/constrained devices; load desktop 3D near view and at idle. */
export function initDeferredCompanyScene({
  figure = document.querySelector('[data-company-scene]'),
  loadScene = () => import('./company-scene.js'),
} = {}) {
  if (!figure || figure.dataset.scenePolicy) return;
  const capabilities = initCompanyCapabilities(figure);
  const small = window.matchMedia('(max-width: 740px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  let loading = false;
  let loaded = false;
  let scheduled;
  let observer;
  let near = false;
  const constrained = () => small.matches || reduced.matches || !!connection?.saveData;
  const stage = figure.querySelector('.company-scene-stage') || figure;
  const load = async () => {
    scheduled = undefined;
    if (loading || loaded || constrained() || !near || document.hidden) return;
    loading = true;
    figure.dataset.scenePolicy = 'loading';
    try {
      const { initCompanyScene } = await loadScene();
      // A preference or viewport change during download must keep the light fallback.
      if (constrained()) { figure.dataset.scenePolicy = 'static'; return; }
      const mode = capabilities.mode;
      const cleanup = initCompanyScene();
      if (!cleanup) throw new Error('Scene did not initialize');
      capabilities.detach();
      if (mode !== 'products') figure.querySelector(`[data-company-view="${mode}"]`)?.click();
      loaded = true;
      figure.dataset.scenePolicy = 'interactive';
      observer?.disconnect();
    } catch {
      figure.dataset.scenePolicy = 'fallback';
    } finally { loading = false; }
  };
  const schedule = () => {
    if (loaded || loading || scheduled !== undefined) return;
    figure.dataset.scenePolicy = constrained() ? 'static' : 'deferred';
    if (constrained() || !near || document.hidden) return;
    scheduled = 'requestIdleCallback' in window
      ? window.requestIdleCallback(load, { timeout: 2000 })
      : window.setTimeout(load, 350);
  };
  const cancel = () => {
    if (scheduled === undefined) return;
    if ('requestIdleCallback' in window) window.cancelIdleCallback(scheduled);
    else window.clearTimeout(scheduled);
    scheduled = undefined;
  };
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      near = entries[0].isIntersecting;
      if (!near) cancel();
      else schedule();
    }, { rootMargin: '200px 0px' });
    observer.observe(stage);
  } else {
    const check = () => {
      const bounds = stage.getBoundingClientRect();
      near = bounds.bottom > -200 && bounds.top < window.innerHeight + 200;
      schedule();
    };
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check, { passive: true });
    check();
  }
  const preferenceChanged = () => { cancel(); schedule(); };
  small.addEventListener('change', preferenceChanged);
  reduced.addEventListener('change', preferenceChanged);
  connection?.addEventListener?.('change', preferenceChanged);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); else schedule(); });
  window.addEventListener('pagehide', cancel);
  window.addEventListener('pageshow', schedule);
  schedule();
}
