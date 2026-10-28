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
  const properties = ['--depth-travel-x', '--depth-travel-y', '--depth-axis-x', '--depth-axis-y', '--depth-angle'];
  const profiles = {
    device: { x: 5, y: 3, tilt: 2.1, scroll: 1 },
    orbit: { x: -4, y: -3, tilt: -1, scroll: -.5 },
    pin: { x: 5, y: -4, tilt: 1.5, scroll: .75 },
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  };
  let frame = 0;
  let printing = false;
  let disposed = false;
  const enabled = () => !disposed && !printing && !document.hidden && !reduced.matches && finePointer.matches;
  const states = sceneElements.map(scene => {
    const layers = [...scene.querySelectorAll('[data-depth-layer]')].filter(layer =>
      layer.closest('[data-depth-scene]') === scene &&
      !layer.matches(`${controls}, ${labels}`) && !layer.querySelector(`${controls}, ${labels}`) &&
      (!layer.textContent.trim() || layer.getAttribute('aria-hidden') === 'true'),
    ).map(element => ({ element, profile: profiles[element.dataset.depthLayer] || profiles.device }));
    return { scene, layers, visible: false, focused: scene.contains(document.activeElement), pointer: null, bounds: null };
  }).filter(state => state.layers.length);
  if (!states.length) return noop;

  const reset = state => {
    state.pointer = null;
    state.bounds = null;
    state.scene.dataset.depthPointer = 'false';
    state.scene.dataset.depthActive = 'false';
    state.layers.forEach(({ element }) => properties.forEach(property => element.style.removeProperty(property)));
  };
  const visibleBounds = scene => {
    if (!scene.getClientRects().length) return null;
    const bounds = scene.getBoundingClientRect();
    return bounds.width && bounds.height && bounds.bottom > 0 && bounds.top < window.innerHeight &&
      bounds.right > 0 && bounds.left < window.innerWidth ? bounds : null;
  };
  const paint = () => {
    frame = 0;
    if (!enabled()) { states.forEach(reset); return; }
    states.forEach(state => {
      if (!state.visible || state.focused) { reset(state); return; }
      const bounds = visibleBounds(state.scene);
      if (!bounds) { reset(state); return; }
      state.bounds = bounds;
      state.scene.dataset.depthActive = 'true';
      const x = state.pointer ? clamp(((state.pointer.x - bounds.left) / bounds.width - .5) * 2, -1, 1) : 0;
      const y = state.pointer ? clamp(((state.pointer.y - bounds.top) / bounds.height - .5) * 2, -1, 1) : 0;
      const scroll = clamp((window.innerHeight / 2 - bounds.top - bounds.height / 2) /
        (window.innerHeight / 2 + bounds.height / 2), -1, 1) * 4;
      state.layers.forEach(({ element, profile }) => {
        let travelX = x * profile.x;
        let travelY = y * profile.y + scroll * profile.scroll;
        const distance = Math.hypot(travelX, travelY);
        // The combined pointer/scroll displacement never exceeds six pixels.
        if (distance > 6) { travelX *= 6 / distance; travelY *= 6 / distance; }
        const angle = clamp(Math.hypot(x, y) * profile.tilt, -3, 3);
        element.style.setProperty('--depth-travel-x', `${travelX.toFixed(2)}px`);
        element.style.setProperty('--depth-travel-y', `${travelY.toFixed(2)}px`);
        element.style.setProperty('--depth-axis-x', x || y ? (-y).toFixed(3) : '1');
        element.style.setProperty('--depth-axis-y', x ? x.toFixed(3) : '0');
        element.style.setProperty('--depth-angle', `${angle.toFixed(2)}deg`);
      });
    });
  };
  const queue = () => { if (!disposed && !frame) frame = requestAnimationFrame(paint); };
  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    states.forEach(reset);
  };
  const preferenceChanged = () => { if (enabled()) queue(); else stop(); };

  states.forEach(state => {
    const { scene, layers } = state;
    scene.dataset.depthReady = 'true';
    state.visible = !!visibleBounds(scene);
    layers.forEach(({ element }) => { element.dataset.depthReady = 'true'; });
    listen(scene, 'pointermove', event => {
      if (!enabled() || !state.visible || state.focused || event.pointerType === 'touch') return;
      state.pointer = { x: event.clientX, y: event.clientY };
      scene.dataset.depthPointer = 'true';
      queue();
    }, { passive: true });
    listen(scene, 'pointerleave', () => { state.pointer = null; scene.dataset.depthPointer = 'false'; queue(); });
    listen(scene, 'pointercancel', () => reset(state));
    listen(scene, 'focusin', () => { state.focused = true; reset(state); });
    listen(scene, 'focusout', event => {
      if (!scene.contains(event.relatedTarget)) { state.focused = false; queue(); }
    });
  });

  let observer;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const state = states.find(item => item.scene === entry.target);
        state.visible = entry.isIntersecting;
        if (!state.visible) reset(state);
      });
      if (enabled()) queue();
    }, { threshold: 0 });
    states.forEach(({ scene }) => observer.observe(scene));
  }
  listen(window, 'scroll', () => {
    if (!observer) states.forEach(state => { state.visible = !!visibleBounds(state.scene); });
    if (enabled() && states.some(state => state.visible)) queue();
  }, { passive: true });
  listen(window, 'resize', () => {
    states.forEach(state => { state.visible = !!visibleBounds(state.scene); });
    if (enabled()) queue();
  }, { passive: true });
  listen(window, 'blur', stop);
  listen(window, 'pagehide', stop);
  listen(window, 'pageshow', preferenceChanged);
  listen(window, 'beforeprint', () => { printing = true; stop(); });
  listen(window, 'afterprint', () => { printing = false; preferenceChanged(); });
  listen(document, 'visibilitychange', preferenceChanged);
  listen(reduced, 'change', preferenceChanged);
  listen(finePointer, 'change', preferenceChanged);

  disposeDepthScenes = () => {
    disposed = true;
    stop();
    observer?.disconnect();
    cleanups.forEach(cleanup => cleanup());
    states.forEach(({ scene, layers }) => {
      delete scene.dataset.depthReady;
      delete scene.dataset.depthPointer;
      delete scene.dataset.depthActive;
      layers.forEach(({ element }) => { delete element.dataset.depthReady; });
    });
    disposeDepthScenes = undefined;
  };
  preferenceChanged();
  return disposeDepthScenes;
}
