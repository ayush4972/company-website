import test from 'node:test';
import assert from 'node:assert/strict';
import { initCreativeMotion } from '../frontend/js/creative-motion.js';
import { sampleOrbit } from '../frontend/js/vendor/hyperframes-orbit.js';

// Exercise scene lifecycle and input fallbacks without a browser dependency.
// Rendering geometry is checked in the real browser; these fakes only model
// events, styles, visibility, and queued frames that can otherwise leak work.
function withScene(options, check) {
  const eventTargets = [];
  const events = () => {
    const handlers = new Map();
    const target = {
      addEventListener(type, handler) {
        if (!handlers.has(type)) handlers.set(type, new Set());
        handlers.get(type).add(handler);
      },
      removeEventListener(type, handler) { handlers.get(type)?.delete(handler); },
      emit(type, event = {}) {
        for (const handler of [...handlers.get(type) || []]) handler(event);
      },
      listenerCount() { return [...handlers.values()].reduce((sum, set) => sum + set.size, 0); },
    };
    eventTargets.push(target);
    return target;
  };
  const element = (bounds = {}) => {
    const values = new Map();
    return {
      ...events(),
      dataset: {},
      hidden: false,
      textContent: '',
      children: new Map(),
      style: {
        setProperty(name, value) { values.set(name, value); },
        removeProperty(name) { values.delete(name); },
        getPropertyValue(name) { return values.get(name) || ''; },
        set transform(value) { values.set('transform', value); },
        get transform() { return values.get('transform') || ''; },
      },
      querySelector(selector) { return this.children.get(selector) || null; },
      querySelectorAll(selector) { return this.children.get(selector) || []; },
      getBoundingClientRect() {
        return { top: 100, bottom: 700, left: 0, width: 600, height: 600, ...bounds };
      },
    };
  };
  const root = { dataset: {} };
  const scene = element();
  const world = element();
  const hint = element();
  const cards = [element(), element(), element()];
  scene.children.set('[data-scene-world]', world);
  scene.children.set('[data-scene-hint]', hint);
  scene.children.set('[data-orbit-card]', cards);
  const story = element({ top: 1100, bottom: 3100, height: 2000 });
  const visual = element();
  const counter = element();
  const indexLabel = element();
  const title = element();
  const steps = [element({ top: 300 }), element({ top: 900 }), element({ top: 1500 })];
  story.children.set('[data-story-visual]', visual);
  story.children.set('[data-story-counter]', counter);
  story.children.set('[data-story-index]', indexLabel);
  story.children.set('[data-story-title]', title);
  story.children.set('[data-story-step]', steps);
  const strip = element();
  const track = element();
  strip.children.set('[data-kinetic-track]', track);
  const reduce = { ...events(), matches: !!options.reduce };
  const fine = { ...events(), matches: options.fine !== false };
  const compact = { ...events(), matches: !!options.compact };
  const browserWindow = {
    ...events(),
    innerHeight: 900,
    matchMedia: query => query.includes('reduced-motion') ? reduce : query.includes('max-width') || query.includes('max-height') ? compact : fine,
  };
  const browserDocument = {
    ...events(),
    hidden: !!options.hidden,
    documentElement: root,
    querySelector(selector) {
      if (options.empty) return null;
      return ({ '[data-signal-scene]': scene, '[data-signal-story]': story, '[data-kinetic-strip]': strip })[selector] || null;
    },
  };
  const observers = [];
  class FakeObserver {
    constructor(callback) { this.callback = callback; this.targets = new Set(); this.disconnected = false; observers.push(this); }
    observe(target) { this.targets.add(target); }
    disconnect() { this.disconnected = true; this.targets.clear(); }
    intersect(target, isIntersecting) { this.callback([{ target, isIntersecting }]); }
  }
  if (options.intersection !== false) browserWindow.IntersectionObserver = FakeObserver;
  const frames = new Map();
  let frameId = 1;
  const globals = {
    document: browserDocument,
    window: browserWindow,
    IntersectionObserver: FakeObserver,
    requestAnimationFrame: callback => { const id = frameId++; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
  };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const flushFrames = () => {
    for (let cycle = 0; frames.size && cycle < 10; cycle++) {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach(callback => callback(0));
    }
    assert.equal(frames.size, 0, 'scene animation work must settle while idle');
  };
  const assertSceneReset = () => {
    assert.equal(world.style.getPropertyValue('--scene-rx'), '');
    assert.equal(world.style.getPropertyValue('--scene-ry'), '');
    assert.equal(scene.style.getPropertyValue('--phone-lift'), '');
    assert.equal(track.style.getPropertyValue('--strip-x'), '');
    cards.forEach(card => assert.equal(card.style.transform, ''));
  };
  try {
    for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    check({ root, scene, world, cards, story, visual, counter, indexLabel, title, steps, hint, track, reduce, fine, compact, window: browserWindow, document: browserDocument, observers, frames, eventTargets, flushFrames, assertSceneReset });
  } finally {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

test('pages without creative scenes schedule no work or event listeners', () => {
  withScene({ empty: true }, env => {
    assert.equal(initCreativeMotion(), undefined);
    assert.equal(env.root.dataset.creativeMotion, undefined);
    assert.equal(env.frames.size, 0);
    assert.equal(env.observers.length, 0);
    assert.equal(env.eventTargets.reduce((sum, target) => sum + target.listenerCount(), 0), 0);
  });
});

test('reduced-motion visitors receive a static scene without a scheduled paint', () => {
  withScene({ reduce: true }, env => {
    const cleanup = initCreativeMotion();
    assert.equal(env.frames.size, 0);
    assert.equal(env.hint.hidden, true);
    env.window.emit('scroll');
    env.scene.emit('pointermove', { clientX: 590, clientY: 110, pointerType: 'mouse' });
    assert.equal(env.frames.size, 0);
    env.assertSceneReset();
    cleanup();
  });
});

test('a live reduced-motion preference cancels a pending frame and clears scene effects', () => {
  withScene({}, env => {
    const cleanup = initCreativeMotion();
    env.flushFrames();
    assert.notEqual(env.world.style.getPropertyValue('--scene-rx'), '');
    assert.notEqual(env.cards[0].style.transform, '');
    env.window.emit('scroll');
    assert.equal(env.frames.size, 1);
    env.reduce.matches = true;
    env.reduce.emit('change');
    assert.equal(env.frames.size, 0);
    assert.equal(env.hint.hidden, true);
    env.assertSceneReset();
    env.window.emit('scroll');
    assert.equal(env.frames.size, 0);
    env.reduce.matches = false;
    env.reduce.emit('change');
    assert.equal(env.frames.size, 1);
    env.flushFrames();
    assert.equal(env.hint.hidden, false);
    cleanup();
  });
});

test('hidden and offscreen scenes stop scheduling work until visible again', () => {
  withScene({}, env => {
    const cleanup = initCreativeMotion();
    env.flushFrames();
    env.window.emit('scroll');
    env.document.hidden = true;
    env.document.emit('visibilitychange');
    assert.equal(env.frames.size, 0);
    env.assertSceneReset();
    env.window.emit('scroll');
    env.window.emit('resize');
    assert.equal(env.frames.size, 0);
    env.document.hidden = false;
    env.document.emit('visibilitychange');
    assert.equal(env.frames.size, 1);
    env.flushFrames();
    const observer = env.observers[0];
    [...observer.targets].forEach(target => observer.intersect(target, false));
    assert.equal(env.frames.size, 0);
    env.window.emit('scroll');
    env.scene.emit('pointermove', { clientX: 500, clientY: 200, pointerType: 'mouse' });
    assert.equal(env.frames.size, 0);
    observer.intersect(env.scene, true);
    assert.equal(env.frames.size, 1);
    env.flushFrames();
    cleanup();
  });
});

test('coarse and touch pointers do not apply the scene tilt interaction', () => {
  withScene({ fine: false }, env => {
    const cleanup = initCreativeMotion();
    env.flushFrames();
    const initialTilt = env.world.style.getPropertyValue('--scene-ry');
    env.scene.emit('pointermove', { clientX: 590, clientY: 110, pointerType: 'mouse' });
    assert.equal(env.frames.size, 0);
    assert.equal(env.world.style.getPropertyValue('--scene-ry'), initialTilt);
    env.fine.matches = true;
    env.scene.emit('pointermove', { clientX: 590, clientY: 110, pointerType: 'touch' });
    assert.equal(env.frames.size, 0);
    assert.equal(env.world.style.getPropertyValue('--scene-ry'), initialTilt);
    cleanup();
  });
});

test('cleanup removes listeners and observers, cancels work, and permits reinitialization', () => {
  withScene({}, env => {
    const cleanup = initCreativeMotion();
    env.flushFrames();
    env.window.emit('scroll');
    assert.equal(env.frames.size, 1);
    cleanup();
    assert.equal(env.frames.size, 0);
    assert.equal(env.root.dataset.creativeMotion, undefined);
    assert.equal(env.observers[0].disconnected, true);
    assert.equal(env.eventTargets.reduce((sum, target) => sum + target.listenerCount(), 0), 0);
    env.assertSceneReset();
    env.window.emit('scroll');
    assert.equal(env.frames.size, 0);
    const secondCleanup = initCreativeMotion();
    assert.equal(typeof secondCleanup, 'function');
    assert.equal(env.frames.size, 1);
    secondCleanup();
  });
});

test('printing resets creative effects and resumes only after printing finishes', () => {
  withScene({}, env => {
    const cleanup = initCreativeMotion();
    env.flushFrames();
    env.window.emit('beforeprint');
    env.assertSceneReset();
    env.window.emit('scroll');
    assert.equal(env.frames.size, 0);
    env.window.emit('afterprint');
    assert.equal(env.frames.size, 1);
    env.flushFrames();
    cleanup();
  });
});

function assertCompleteJourney(env) {
  assert.equal(env.visual.dataset.stage, 'all');
  assert.equal(env.counter.textContent, '01 → 03');
  assert.equal(env.indexLabel.textContent, '01—03');
  assert.equal(env.title.textContent, 'One connected journey.');
  assert.deepEqual(env.steps.map(step => step.dataset.active), ['true', 'true', 'true']);
  assert.equal(Number(env.visual.style.getPropertyValue('--journey-progress')), 1);
}

test('compact viewports show the complete journey before the illustration scrolls out of view', () => {
  withScene({ compact: true }, env => {
    const cleanup = initCreativeMotion();
    env.flushFrames();
    assertCompleteJourney(env);
    // Later text steps must not leave an earlier, now offscreen illustration
    // frozen on a partial connection for mobile and short-window visitors.
    env.steps[2].getBoundingClientRect = () => ({ top: 200 });
    env.window.emit('scroll');
    env.flushFrames();
    assertCompleteJourney(env);
    cleanup();
  });
});

test('changing compact or reduced-motion preferences switches between complete and scroll-linked journeys', () => {
  withScene({}, env => {
    const cleanup = initCreativeMotion();
    env.steps[2].getBoundingClientRect = () => ({ top: 200 });
    env.flushFrames();
    assert.equal(env.visual.dataset.stage, '2');
    assert.deepEqual(env.steps.map(step => step.dataset.active), ['false', 'false', 'true']);
    env.compact.matches = true;
    env.compact.emit('change');
    env.flushFrames();
    assertCompleteJourney(env);
    env.reduce.matches = true;
    env.reduce.emit('change');
    env.compact.matches = false;
    env.compact.emit('change');
    assert.equal(env.frames.size, 0);
    assertCompleteJourney(env);
    env.reduce.matches = false;
    env.reduce.emit('change');
    env.flushFrames();
    assert.equal(env.visual.dataset.stage, '2');
    assert.equal(env.counter.textContent, '03 / 03');
    assert.deepEqual(env.steps.map(step => step.dataset.active), ['false', 'false', 'true']);
    cleanup();
  });
});

test('initial reduced motion presents every part of the journey without scheduling an animation', () => {
  withScene({ reduce: true }, env => {
    const cleanup = initCreativeMotion();
    assertCompleteJourney(env);
    assert.equal(env.frames.size, 0);
    cleanup();
  });
});

test('the Hyperframes orbit adapter produces finite deterministic poses for invalid numeric inputs', () => {
  for (const progress of [undefined, NaN, -Infinity, Infinity, -5, 0, .5, 1, 8]) {
    for (const index of [undefined, NaN, -4, 0, 2, Infinity]) {
      for (const count of [undefined, NaN, 0, -1, 1, 2.5, Infinity]) {
        const pose = sampleOrbit(progress, index, count);
        assert.ok(Object.values(pose).every(Number.isFinite));
        assert.deepEqual(pose, sampleOrbit(progress, index, count));
      }
    }
  }
  assert.deepEqual(sampleOrbit(-5, 0), sampleOrbit(0, 0));
  assert.deepEqual(sampleOrbit(8, 0), sampleOrbit(1, 0));
});
