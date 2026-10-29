/* Event-driven depth for existing product imagery. Original transforms stay intact. */
let disposeDepthScenes;

export function initDepthScenes() {
  if (disposeDepthScenes) return disposeDepthScenes;
  const sceneElements = [...document.querySelectorAll('[data-depth-scene]')];
  const noop = () => {};
  if (!sceneElements.length || typeof CSS === 'undefined' ||
    !CSS.supports('translate', '0 1px') || !CSS.supports('rotate', '1 0 0 1deg')) return noop;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const cleanups = [];
  const controls = 'a, button, input, select, textarea, form, [tabindex], [role="button"]';
  const labels = 'figcaption, p, h1, h2, h3, h4, h5, h6, label';
  const properties = ['--depth-travel-x', '--depth-travel-y', '--depth-axis-x', '--depth-axis-y', '--depth-angle', '--depth-scroll-y'];
  const profiles = {
    device: { x: 5, y: 3, tilt: 2.1, scroll: 3 },
    orbit: { x: -4, y: -3, tilt: -1, scroll: -1.5 },
    pin: { x: 5, y: -4, tilt: 1.5, scroll: 2 },
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  };
  let frame = 0;
  let printing = false;
  let disposed = false;
  let observer;
  let fallbackListening = false;
  const enabled = () => !disposed && !printing && !document.hidden && !reduced.matches && finePointer.matches;
  const states = sceneElements.map(scene => {
    const layers = [...scene.querySelectorAll('[data-depth-layer]')].filter(layer =>
      layer.closest('[data-depth-scene]') === scene &&
      !layer.matches(`${controls}, ${labels}`) && !layer.querySelector(`${controls}, ${labels}`) &&
      (!layer.textContent.trim() || layer.getAttribute('aria-hidden') === 'true'),
    ).map(element => ({ element, profile: profiles[element.dataset.depthLayer] || profiles.device }));
    return { scene, layers, visible: false, focused: scene.contains(document.activeElement), pointer: null, bounds: null, animations: [], native: false, nativeFailed: false };
  }).filter(state => state.layers.length);
  if (!states.length) return noop;

  const clearParallax = state => {
    state.animations.forEach(animation => animation.cancel());
    state.animations = [];
    state.native = false;
    state.scene.dataset.depthParallax = 'static';
  };
  const reset = state => {
    clearParallax(state);
    state.pointer = null;
    state.scene.dataset.depthPointer = 'false';
    state.scene.dataset.depthActive = 'false';
    state.layers.forEach(({ element }) => properties.forEach(property => element.style.removeProperty(property)));
  };
  const measure = state => {
    const bounds = state.scene.getBoundingClientRect();
    state.bounds = { top: bounds.top + window.scrollY, left: bounds.left, width: bounds.width, height: bounds.height };
    state.visible = bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.top < window.innerHeight;
  };
  const syncParallax = state => {
    if (!enabled() || !state.visible || state.focused) { clearParallax(state); return; }
    if (state.animations.length) return;
    if (state.nativeFailed) { state.scene.dataset.depthParallax = 'fallback'; return; }
    if (typeof window.ViewTimeline !== 'function' || typeof state.layers[0]?.element.animate !== 'function') {
      state.nativeFailed = true;
      ensureFallbackListener();
      state.scene.dataset.depthParallax = 'fallback';
      return;
    }
    try {
      const timeline = new window.ViewTimeline({ subject: state.scene, axis: 'block' });
      state.layers.forEach(({ element, profile }) => {
        state.animations.push(element.animate([
          { transform: `translate3d(0,${profile.scroll}px,0)` },
          { transform: `translate3d(0,${-profile.scroll}px,0)` },
        ], { timeline, duration: 1, fill: 'both', easing: 'linear', composite: 'add' }));
      });
      state.native = true;
      state.scene.dataset.depthParallax = 'native';
    } catch {
      clearParallax(state);
      state.nativeFailed = true;
      ensureFallbackListener();
      state.scene.dataset.depthParallax = 'fallback';
    }
  };
  const paint = () => {
    frame = 0;
    if (!enabled()) { states.forEach(reset); return; }
    states.forEach(state => {
      if (!state.visible || state.focused) { reset(state); return; }
      const cached = state.bounds;
      const bounds = cached && { ...cached, top: cached.top - window.scrollY };
      if (!bounds) { reset(state); return; }
      state.scene.dataset.depthActive = 'true';
      const x = state.pointer ? clamp(((state.pointer.x - bounds.left) / bounds.width - .5) * 2, -1, 1) : 0;
      const y = state.pointer ? clamp(((state.pointer.y - bounds.top) / bounds.height - .5) * 2, -1, 1) : 0;
      state.layers.forEach(({ element, profile }) => {
        let travelX = x * profile.x;
        let travelY = y * profile.y;
        const distance = Math.hypot(travelX, travelY);
        // Three pixels of pointer travel plus three of scroll remain bounded.
        if (distance > 3) { travelX *= 3 / distance; travelY *= 3 / distance; }
        const angle = clamp(Math.hypot(x, y) * profile.tilt, -3, 3);
        element.style.setProperty('--depth-travel-x', `${travelX.toFixed(2)}px`);
        element.style.setProperty('--depth-travel-y', `${travelY.toFixed(2)}px`);
        element.style.setProperty('--depth-axis-x', x || y ? (-y).toFixed(3) : '1');
        element.style.setProperty('--depth-axis-y', x ? x.toFixed(3) : '0');
        element.style.setProperty('--depth-angle', `${angle.toFixed(2)}deg`);
        if (!state.native) {
          const progress = clamp((window.innerHeight - bounds.top) / (window.innerHeight + bounds.height), 0, 1);
          element.style.setProperty('--depth-scroll-y', `${(profile.scroll * (1 - 2 * progress)).toFixed(2)}px`);
        }
      });
    });
  };
  const queue = () => { if (!disposed && !frame) frame = requestAnimationFrame(paint); };
  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    states.forEach(reset);
  };
  const preferenceChanged = () => {
    if (enabled()) {
      states.forEach(state => { measure(state); syncParallax(state); });
      queue();
    } else stop();
  };

  states.forEach(state => {
    const { scene, layers } = state;
    scene.dataset.depthReady = 'true';
    measure(state);
    layers.forEach(({ element }) => { element.dataset.depthReady = 'true'; });
    listen(scene, 'pointermove', event => {
      if (!enabled() || !state.visible || state.focused || event.pointerType === 'touch') return;
      state.pointer = { x: event.clientX, y: event.clientY };
      scene.dataset.depthPointer = 'true';
      queue();
    }, { passive: true });
    listen(scene, 'pointerleave', () => { state.pointer = null; scene.dataset.depthPointer = 'false'; queue(); });
    listen(scene, 'pointercancel', () => { state.pointer = null; queue(); });
    listen(scene, 'focusin', () => { state.focused = true; reset(state); });
    listen(scene, 'focusout', event => {
      if (!scene.contains(event.relatedTarget)) { state.focused = false; measure(state); syncParallax(state); queue(); }
    });
  });

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const state = states.find(item => item.scene === entry.target);
        measure(state);
        state.visible = entry.isIntersecting;
        if (!state.visible) reset(state);
        else syncParallax(state);
      });
      if (enabled()) queue();
    }, { threshold: 0 });
    states.forEach(({ scene }) => observer.observe(scene));
  }
  // Native timelines handle ordinary Chromium scrolling without JavaScript.
  // The compatibility path uses cached geometry and a single passive frame.
  const fallbackScroll = () => {
    if (!enabled()) return;
    const fallbackStates = states.filter(state => state.nativeFailed);
    if (!fallbackStates.length) return;
    if (!observer) fallbackStates.forEach(state => {
      const bounds = state.bounds;
      const top = bounds ? bounds.top - window.scrollY : 0;
      state.visible = !!bounds && top + bounds.height > 0 && top < window.innerHeight;
    });
    if (fallbackStates.some(state => state.visible && !state.focused)) queue();
  };
  function ensureFallbackListener() {
    if (fallbackListening) return;
    fallbackListening = true;
    listen(window, 'scroll', fallbackScroll, { passive: true });
  }
  if (typeof window.ViewTimeline !== 'function') {
    states.forEach(state => { state.nativeFailed = true; });
    ensureFallbackListener();
  }
  listen(window, 'resize', () => {
    states.forEach(state => { measure(state); syncParallax(state); });
    if (enabled()) queue();
  }, { passive: true });
  listen(window, 'blur', stop);
  listen(window, 'pagehide', stop);
  listen(window, 'pageshow', preferenceChanged);
  listen(window, 'load', preferenceChanged);
  listen(window, 'beforeprint', () => { printing = true; stop(); });
  listen(window, 'afterprint', () => { printing = false; preferenceChanged(); });
  listen(document, 'visibilitychange', preferenceChanged);
  listen(reduced, 'change', preferenceChanged);
  listen(finePointer, 'change', preferenceChanged);
  if (document.fonts?.addEventListener) listen(document.fonts, 'loadingdone', preferenceChanged);

  disposeDepthScenes = () => {
    disposed = true;
    stop();
    observer?.disconnect();
    cleanups.forEach(cleanup => cleanup());
    states.forEach(({ scene, layers }) => {
      delete scene.dataset.depthReady;
      delete scene.dataset.depthPointer;
      delete scene.dataset.depthActive;
      delete scene.dataset.depthParallax;
      layers.forEach(({ element }) => { delete element.dataset.depthReady; });
    });
    disposeDepthScenes = undefined;
  };
  preferenceChanged();
  return disposeDepthScenes;
}
