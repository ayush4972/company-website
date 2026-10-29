import test from 'node:test';
import assert from 'node:assert/strict';
import { initHeroMotion } from '../frontend/js/hero-motion.js';

function withHero(options, check) {
  const eventTargets = [];
  const events = () => {
    const handlers = new Map();
    const target = {
      addEventListener(type, handler) {
        if (!handlers.has(type)) handlers.set(type, new Set());
        handlers.get(type).add(handler);
      },
      removeEventListener(type, handler) { handlers.get(type)?.delete(handler); },
      emit(type, event = {}) { [...handlers.get(type) || []].forEach(handler => handler(event)); },
      listenerCount() { return [...handlers.values()].reduce((sum, items) => sum + items.size, 0); },
    };
    eventTargets.push(target);
    return target;
  };
  let layoutReads = 0;
  const element = () => {
    const properties = new Map();
    return {
      dataset: {},
      style: {
        getPropertyValue: name => properties.get(name) || '',
        setProperty: (name, value) => properties.set(name, value),
        removeProperty: name => properties.delete(name),
      },
      getBoundingClientRect() { layoutReads++; return { top: 100, bottom: 800, width: 1000, height: 700 }; },
    };
  };
  const hero = element();
  hero.dataset.heroMotion = '';
  const lines = [element(), element()];
  const underline = element();
  const layers = [element(), element()];
  hero.querySelector = selector => selector === '[data-hero-underline]' ? underline : null;
  hero.querySelectorAll = selector => selector === '[data-hero-line]' ? lines : layers;
  const reduced = { ...events(), matches: !!options.reduce };
  const browserWindow = {
    ...events(), scrollY: options.restored ? 100 : 0,
    innerHeight: 1000, location: { hash: options.hash || '' }, matchMedia: () => reduced,
  };
  const browserDocument = {
    ...events(), hidden: false, querySelector: () => options.empty ? null : hero,
  };
  const observers = [];
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
    intersect(isIntersecting) { this.callback([{ target: this.target, isIntersecting }]); }
  }
  if (options.intersection !== false) browserWindow.IntersectionObserver = Observer;
  const animations = [];
  let animationCalls = 0;
  const animate = (target, params) => {
    if (++animationCalls === options.failAt) throw new Error('Animation unavailable');
    const original = target.style.getPropertyValue('transform');
    target.style.setProperty('transform', params.transform[0]);
    const animation = {
      target, params, onComplete: params.onComplete, reverted: false,
      playing: params.autoplay !== false,
      play() { this.playing = true; },
      pause() { this.playing = false; },
      revert() {
        this.playing = false;
        this.reverted = true;
        if (original) target.style.setProperty('transform', original);
        else target.style.removeProperty('transform');
      },
    };
    animations.push(animation);
    return animation;
  };
  const globals = { window: browserWindow, document: browserDocument };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const cleanups = new Set();
  const start = () => {
    const cleanup = initHeroMotion({ animate });
    if (cleanup) cleanups.add(cleanup);
    return cleanup;
  };
  const readable = () => [...lines, underline].every(item => item.style.getPropertyValue('transform') === '');
  try {
    Object.entries(globals).forEach(([key, value]) => Object.defineProperty(globalThis, key, { configurable: true, writable: true, value }));
    check({ start, hero, lines, underline, layers, animations, observers, reduced, window: browserWindow,
      document: browserDocument, eventTargets, readable, layoutReads: () => layoutReads });
  } finally {
    cleanups.forEach(cleanup => cleanup());
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

test('pages without the hero perform no animation or lifecycle work', () => {
  withHero({ empty: true }, env => {
    assert.equal(env.start(), undefined);
    assert.equal(env.animations.length, 0);
    assert.equal(env.layoutReads(), 0);
    assert.equal(env.eventTargets.reduce((sum, target) => sum + target.listenerCount(), 0), 0);
  });
});

test('initial reduced motion leaves complete content and the atmosphere static', () => {
  withHero({ reduce: true }, env => {
    env.start();
    assert.equal(env.readable(), true);
    assert.equal(env.animations.length, 0);
    assert.equal(env.hero.dataset.heroAmbient, 'static');
    assert.equal(env.hero.dataset.heroReveal, 'settled');
  });
});

test('restored scroll and hash destinations never replay the masked headline', () => {
  for (const options of [{ restored: true }, { hash: '#projects' }]) {
    withHero(options, env => {
      env.start();
      assert.equal(env.readable(), true);
      assert.equal(env.animations.every(animation => env.layers.includes(animation.target)), true);
    });
  }
});

test('underline finishes after the staggered lines and restores the visible baseline', () => {
  withHero({}, env => {
    env.start();
    const lineAnimations = env.animations.filter(animation => env.lines.includes(animation.target));
    const underlineAnimation = env.animations.find(animation => animation.target === env.underline);
    assert.ok(lineAnimations[1].params.delay > lineAnimations[0].params.delay);
    assert.ok(underlineAnimation.params.delay >= Math.max(...lineAnimations.map(animation => animation.params.delay + animation.params.duration)));
    underlineAnimation.onComplete();
    assert.equal(env.readable(), true);
    assert.equal(env.hero.dataset.heroReveal, 'settled');
    assert.equal(lineAnimations.every(animation => animation.reverted), true);
  });
});

test('partial animation setup failure restores readable text immediately', () => {
  withHero({ failAt: 2 }, env => {
    env.start();
    assert.equal(env.readable(), true);
    assert.equal(env.hero.dataset.heroReveal, 'settled');
    assert.equal(env.animations[0].reverted, true);
  });
});

test('focus, anchor and resize interruptions settle the entrance without replaying it', () => {
  for (const event of ['focusin', 'hashchange', 'resize']) {
    withHero({}, env => {
      env.start();
      (event === 'focusin' ? env.document : env.window).emit(event);
      assert.equal(env.readable(), true);
      assert.equal(env.hero.dataset.heroReveal, 'settled');
      const count = env.animations.length;
      env.observers[0].intersect(false);
      env.observers[0].intersect(true);
      assert.equal(env.animations.length, count, 'returning to the hero must reuse its ambient animations');
    });
  }
});

test('scrolling performs no layout reads or animation creation', () => {
  withHero({}, env => {
    env.start();
    const reads = env.layoutReads();
    const count = env.animations.length;
    env.window.scrollY = 200;
    env.window.emit('scroll');
    env.window.emit('scroll');
    assert.equal(env.layoutReads(), reads);
    assert.equal(env.animations.length, count);
    assert.equal(env.readable(), true);
  });
});

test('hidden and offscreen states pause native ambient animations and reuse them', () => {
  withHero({}, env => {
    env.start();
    const ambient = env.animations.filter(animation => env.layers.includes(animation.target));
    env.observers[0].intersect(false);
    assert.equal(ambient.every(animation => !animation.playing), true);
    env.observers[0].intersect(true);
    assert.equal(ambient.every(animation => animation.playing), true);
    env.document.hidden = true;
    env.document.emit('visibilitychange');
    assert.equal(ambient.every(animation => !animation.playing), true);
    env.document.hidden = false;
    env.document.emit('visibilitychange');
    assert.equal(ambient.every(animation => animation.playing), true);
    assert.equal(env.animations.filter(animation => env.layers.includes(animation.target)).length, ambient.length);
  });
});

test('live reduced motion and printing revert ambient transforms to the static baseline', () => {
  for (const event of ['reduce', 'beforeprint']) {
    withHero({}, env => {
      env.start();
      if (event === 'reduce') { env.reduced.matches = true; env.reduced.emit('change'); }
      else env.window.emit('beforeprint');
      assert.equal(env.readable(), true);
      assert.equal(env.layers.every(layer => layer.style.getPropertyValue('transform') === ''), true);
      assert.equal(env.hero.dataset.heroAmbient, 'static');
    });
  }
});

test('unsupported intersection observation keeps decorative background static', () => {
  withHero({ intersection: false }, env => {
    env.start();
    assert.equal(env.animations.some(animation => env.layers.includes(animation.target)), false);
    assert.equal(env.hero.dataset.heroAmbient, 'static');
  });
});

test('cleanup stops animations and listeners, preserves the marker and permits reuse', () => {
  withHero({}, env => {
    const cleanup = env.start();
    cleanup();
    cleanup();
    assert.equal(env.readable(), true);
    assert.equal(env.animations.every(animation => animation.reverted), true);
    assert.equal(env.observers[0].disconnected, true);
    assert.equal(env.eventTargets.reduce((sum, target) => sum + target.listenerCount(), 0), 0);
    assert.equal(env.hero.dataset.heroMotion, '');
    assert.equal(env.hero.dataset.heroReveal, undefined);
    assert.equal(typeof env.start(), 'function');
  });
});
