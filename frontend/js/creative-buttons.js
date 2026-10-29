import { animate } from './vendor/animejs/anime.esm.min.js';

/* Small, event-driven anime.js gestures. The clickable surface never moves. */
export function initCreativeButtons() {
  const root = document.documentElement;
  if (root.dataset.creativeButtonsReady === 'true') return;

  const controls = [...document.querySelectorAll('.button, .text-link')].filter(control =>
    control.dataset.magnetic !== 'off' && control.dataset.buttonMotion !== 'off',
  );
  if (!controls.length) return;
  root.dataset.creativeButtonsReady = 'true';
  root.dataset.buttonMotionEngine = 'animejs';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const states = new Map();
  const activeControls = new Set();
  const listeners = [];
  let printing = false;
  const on = (target, event, handler, options) => {
    target.addEventListener(event, handler, options);
    listeners.push(() => target.removeEventListener(event, handler, options));
  };
  const canAnimate = control => !reduced.matches && !document.hidden && !printing &&
    !control.matches(':disabled, [aria-disabled="true"]');
  const customProperties = [
    '--control-cap-rotate', '--control-cap-scale', '--control-icon-x', '--control-icon-y',
    '--control-pulse-scale', '--control-pulse-opacity', '--control-spot-x', '--control-spot-y',
    '--control-pulse-x', '--control-pulse-y',
  ];

  const cancel = (state, channel) => {
    state[channel]?.cancel();
    state[channel] = null;
  };
  const reset = control => {
    const state = states.get(control);
    cancel(state, 'gesture');
    cancel(state, 'pulse');
    if (state.frame) cancelAnimationFrame(state.frame);
    state.frame = 0;
    state.bounds = null;
    activeControls.delete(control);
    customProperties.forEach(property => control.style.removeProperty(property));
    control.dataset.buttonState = 'idle';
  };
  const resetAll = () => [...activeControls].forEach(reset);
  const clearSpotlight = (control, state) => {
    if (state.frame) cancelAnimationFrame(state.frame);
    state.frame = 0;
    state.bounds = null;
    control.style.removeProperty('--control-spot-x');
    control.style.removeProperty('--control-spot-y');
  };
  const prune = (control, state) => {
    if (state.gesture || state.pulse || state.bounds || state.frame || control.dataset.buttonState !== 'idle') return;
    customProperties.forEach(property => control.style.removeProperty(property));
    activeControls.delete(control);
  };
  const run = (control, channel, parameters) => {
    const state = states.get(control);
    cancel(state, channel);
    activeControls.add(control);
    try {
      state[channel] = animate(control, {
        ...parameters,
        onComplete: () => {
          state[channel] = null;
          if (channel === 'pulse') {
            control.style.removeProperty('--control-pulse-scale');
            control.style.removeProperty('--control-pulse-opacity');
            control.style.removeProperty('--control-pulse-x');
            control.style.removeProperty('--control-pulse-y');
          }
          prune(control, state);
        },
      });
    } catch {
      // The unenhanced control is complete and remains fully usable.
      reset(control);
    }
  };
  const engage = control => {
    if (!canAnimate(control)) return;
    control.dataset.buttonState = 'engaged';
    run(control, 'gesture', {
      '--control-cap-rotate': '-12deg',
      '--control-cap-scale': 1.08,
      '--control-icon-x': '2px',
      '--control-icon-y': '-2px',
      duration: 560,
      ease: 'outBack(1.5)',
    });
  };
  const release = control => {
    const state = states.get(control);
    clearSpotlight(control, state);
    if (!canAnimate(control)) { reset(control); return; }
    control.dataset.buttonState = 'idle';
    run(control, 'gesture', {
      '--control-cap-rotate': '0deg',
      '--control-cap-scale': 1,
      '--control-icon-x': '0px',
      '--control-icon-y': '0px',
      duration: 440,
      ease: 'outBack(1.4)',
    });
  };
  const press = (control, event) => {
    if (!canAnimate(control)) return;
    let x = '50%';
    let y = '50%';
    if (event && event.detail !== 0 && Number.isFinite(event.clientX)) {
      const bounds = control.getBoundingClientRect();
      x = `${Math.max(0, Math.min(bounds.width, event.clientX - bounds.left))}px`;
      y = `${Math.max(0, Math.min(bounds.height, event.clientY - bounds.top))}px`;
    }
    control.style.setProperty('--control-spot-x', x);
    control.style.setProperty('--control-spot-y', y);
    if (control.classList.contains('button')) {
      control.style.setProperty('--control-pulse-x', x);
      control.style.setProperty('--control-pulse-y', y);
      run(control, 'pulse', {
        '--control-pulse-scale': [0, 1],
        '--control-pulse-opacity': [.36, 0],
        duration: 650,
        ease: 'outCubic',
      });
    }
    run(control, 'gesture', {
      '--control-cap-scale': [{ to: .87, duration: 100 }, { to: 1, duration: 480 }],
      '--control-cap-rotate': [{ to: '-17deg', duration: 100 }, { to: '0deg', duration: 480 }],
      '--control-icon-x': [{ to: '4px', duration: 130 }, { to: '0px', duration: 450 }],
      '--control-icon-y': [{ to: '-4px', duration: 130 }, { to: '0px', duration: 450 }],
      ease: 'outBack(1.5)',
    });
  };

  controls.forEach(control => {
    const state = { gesture: null, pulse: null, bounds: null, frame: 0, x: 0, y: 0 };
    states.set(control, state);
    control.dataset.buttonEnhanced = 'animejs';
    control.dataset.buttonState = 'idle';

    on(control, 'pointerenter', event => {
      if (!canAnimate(control) || !finePointer.matches || event.pointerType === 'touch') return;
      state.bounds = control.getBoundingClientRect();
      engage(control);
    });
    on(control, 'pointermove', event => {
      if (!state.bounds || !canAnimate(control) || !finePointer.matches || event.pointerType === 'touch') return;
      state.x = event.clientX;
      state.y = event.clientY;
      if (!state.frame) state.frame = requestAnimationFrame(() => {
        state.frame = 0;
        if (!state.bounds || !canAnimate(control)) return;
        const { left, top, width, height } = state.bounds;
        control.style.setProperty('--control-spot-x', `${Math.max(0, Math.min(width, state.x - left))}px`);
        control.style.setProperty('--control-spot-y', `${Math.max(0, Math.min(height, state.y - top))}px`);
      });
    }, { passive: true });
    on(control, 'pointerleave', () => {
      if (document.activeElement !== control) release(control);
    });
    on(control, 'pointercancel', () => reset(control));
    on(control, 'focus', () => {
      if (control.matches(':focus-visible')) engage(control);
    });
    on(control, 'blur', () => release(control));
    // A click also covers keyboard and assistive-technology activation. No default
    // action is intercepted, delayed, or replaced by an animation.
    on(control, 'click', event => press(control, event));
  });

  on(reduced, 'change', resetAll);
  on(finePointer, 'change', resetAll);
  on(document, 'visibilitychange', resetAll);
  on(window, 'scroll', () => {
    // Anchor navigation may scroll immediately after a click. Let the finite
    // press/ripple finish; only cached pointer coordinates became invalid.
    [...activeControls].forEach(control => {
      const state = states.get(control);
      clearSpotlight(control, state);
      if (!control.matches(':focus-visible')) control.dataset.buttonState = 'idle';
      prune(control, state);
    });
  }, { passive: true });
  on(window, 'resize', resetAll, { passive: true });
  on(window, 'pagehide', resetAll);
  on(window, 'blur', resetAll);
  on(window, 'beforeprint', () => { printing = true; resetAll(); });
  on(window, 'afterprint', () => { printing = false; });

  return () => {
    resetAll();
    listeners.forEach(remove => remove());
    controls.forEach(control => {
      delete control.dataset.buttonEnhanced;
      delete control.dataset.buttonState;
    });
    delete root.dataset.creativeButtonsReady;
    delete root.dataset.buttonMotionEngine;
  };
}
