/* A small, event-driven magnetic field. Links and form controls remain native. */
export function initCreativeButtons() {
  const root = document.documentElement;
  if (root.dataset.creativeButtonsReady === 'true') return;
  root.dataset.creativeButtonsReady = 'true';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const supportsTranslate = typeof CSS !== 'undefined' && CSS.supports('translate', '0 1px');
  if (!supportsTranslate) return;

  const controls = [...document.querySelectorAll('.button')].filter(control =>
    !control.closest('form') && control.dataset.magnetic !== 'off',
  );
  const states = new Map();
  const activeControls = new Set();
  const canMove = () => !reduced.matches && finePointer.matches && !document.hidden;
  const reset = control => {
    const state = states.get(control);
    if (!state) return;
    if (state.frame) cancelAnimationFrame(state.frame);
    state.frame = 0;
    state.bounds = null;
    activeControls.delete(control);
    control.style.removeProperty('--control-shift-x');
    control.style.removeProperty('--control-shift-y');
    control.style.removeProperty('--control-spot-x');
    control.style.removeProperty('--control-spot-y');
  };
  const resetAll = () => [...activeControls].forEach(reset);

  controls.forEach(control => {
    const state = { bounds: null, frame: 0, x: 0, y: 0 };
    states.set(control, state);
    control.dataset.buttonEnhanced = 'true';
    const paint = () => {
      state.frame = 0;
      if (!canMove() || !state.bounds || control.matches(':disabled, [aria-disabled="true"]')) { reset(control); return; }
      const { left, top, width, height } = state.bounds;
      if (!width || !height) return;
      const x = Math.max(-1, Math.min(1, ((state.x - left) / width - .5) * 2));
      const y = Math.max(-1, Math.min(1, ((state.y - top) / height - .5) * 2));
      // Four pixels at the edge: expressive enough to notice, stable enough to click.
      control.style.setProperty('--control-shift-x', `${(x * 4).toFixed(2)}px`);
      control.style.setProperty('--control-shift-y', `${(y * 3).toFixed(2)}px`);
      control.style.setProperty('--control-spot-x', `${((x + 1) * 50).toFixed(1)}%`);
      control.style.setProperty('--control-spot-y', `${((y + 1) * 50).toFixed(1)}%`);
    };
    control.addEventListener('pointerenter', event => {
      if (!canMove() || event.pointerType === 'touch') return;
      state.bounds = control.getBoundingClientRect();
      activeControls.add(control);
    });
    control.addEventListener('pointermove', event => {
      if (!state.bounds || !canMove() || event.pointerType === 'touch') return;
      state.x = event.clientX;
      state.y = event.clientY;
      if (!state.frame) state.frame = requestAnimationFrame(paint);
    }, { passive: true });
    control.addEventListener('pointerleave', () => reset(control));
    control.addEventListener('pointercancel', () => reset(control));
    control.addEventListener('pointerdown', () => reset(control));
    control.addEventListener('focus', () => reset(control));
  });

  reduced.addEventListener('change', resetAll);
  finePointer.addEventListener('change', resetAll);
  document.addEventListener('visibilitychange', resetAll);
  window.addEventListener('scroll', resetAll, { passive: true });
  window.addEventListener('resize', resetAll, { passive: true });
  window.addEventListener('pagehide', resetAll);
  window.addEventListener('blur', resetAll);
}
