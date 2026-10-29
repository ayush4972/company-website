import test from 'node:test';
import assert from 'node:assert/strict';
import { initDepthScenes } from '../frontend/js/depth-scenes.js';

function withDepth({ native = true, reduce = false } = {}, check) {
  const targets = [];
  const events = () => {
    const listeners = new Map();
    const target = {
      addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
      removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
      emit(type, event = {}) { [...listeners.get(type) || []].forEach(fn => fn(event)); },
      count(type) { return type ? listeners.get(type)?.size || 0 : [...listeners.values()].reduce((sum, group) => sum + group.size, 0); },
    };
    targets.push(target);
    return target;
  };
  const style = () => {
    const values = new Map();
    return { setProperty: (key, value) => values.set(key, value), removeProperty: key => values.delete(key), getPropertyValue: key => values.get(key) || '' };
  };
  const frames = new Map();
  const animations = [];
  let nextFrame = 0;
  let measures = 0;
  const reduced = { ...events(), matches: reduce };
  const fine = { ...events(), matches: true };
  const browserWindow = {
    ...events(), scrollY: 0, innerWidth: 1000, innerHeight: 800,
    matchMedia: query => query.includes('reduced-motion') ? reduced : fine,
  };
  const scene = {
    ...events(), dataset: {}, contains: () => false,
    getBoundingClientRect() { measures++; return { top: 200 - browserWindow.scrollY, bottom: 600 - browserWindow.scrollY, left: 100, right: 700, width: 600, height: 400 }; },
    querySelectorAll: () => [layer],
  };
  const layer = {
    dataset: { depthLayer: 'device' }, style: style(), textContent: '',
    closest: () => scene, matches: () => false, querySelector: () => null,
    getAttribute: () => 'true',
    animate(keyframes, options) {
      const animation = { keyframes, options, cancelled: false, cancel() { this.cancelled = true; } };
      animations.push(animation);
      return animation;
    },
  };
  layer.style.transform = 'rotate(-4deg)';
  const browserDocument = { ...events(), hidden: false, activeElement: null, querySelectorAll: () => [scene] };
  if (native) browserWindow.ViewTimeline = class { constructor(options) { Object.assign(this, options); } };
  const observers = [];
  class Observer {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  }
  browserWindow.IntersectionObserver = Observer;
  const globals = {
    window: browserWindow, document: browserDocument, CSS: { supports: () => true }, IntersectionObserver: Observer,
    requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: id => frames.delete(id),
  };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  let cleanup;
  const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn()); assert.equal(frames.size, 0); };
  try {
    for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    cleanup = initDepthScenes();
    check({ cleanup, scene, layer, window: browserWindow, document: browserDocument, reduced, fine, frames, animations, observers, targets, flush, measures: () => measures });
  } finally {
    cleanup?.();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

test('native parallax composes with existing artwork rotations without a JavaScript scroll handler', () => {
  withDepth({}, env => {
    env.flush();
    assert.equal(env.scene.dataset.depthParallax, 'native');
    assert.equal(env.animations.length, 1);
    assert.equal(env.animations[0].options.composite, 'add');
    assert.equal(env.animations[0].options.timeline.subject, env.scene);
    assert.equal(env.window.count('scroll'), 0);
    assert.equal(env.layer.style.transform, 'rotate(-4deg)');
    env.window.emit('scroll');
    assert.equal(env.frames.size, 0);
  });
});

test('compatibility parallax coalesces scroll bursts without reading geometry during scroll', () => {
  withDepth({ native: false }, env => {
    env.flush();
    const reads = env.measures();
    const before = env.layer.style.getPropertyValue('--depth-scroll-y');
    env.window.scrollY = 120;
    env.window.emit('scroll');
    env.window.emit('scroll');
    assert.equal(env.frames.size, 1);
    env.flush();
    assert.equal(env.measures(), reads);
    assert.notEqual(env.layer.style.getPropertyValue('--depth-scroll-y'), before);
    assert.ok(Math.abs(parseFloat(env.layer.style.getPropertyValue('--depth-scroll-y'))) <= 3);
    assert.equal(env.layer.style.transform, 'rotate(-4deg)');
  });
});

test('reduced motion and printing cancel parallax and restore static artwork', () => {
  withDepth({}, env => {
    env.flush();
    env.reduced.matches = true;
    env.reduced.emit('change');
    assert.equal(env.animations[0].cancelled, true);
    assert.equal(env.scene.dataset.depthParallax, 'static');
    assert.equal(env.frames.size, 0);
    env.reduced.matches = false;
    env.reduced.emit('change');
    env.flush();
    env.window.emit('beforeprint');
    assert.ok(env.animations.every(animation => animation.cancelled));
    assert.equal(env.scene.dataset.depthActive, 'false');
    assert.equal(env.layer.style.getPropertyValue('--depth-scroll-y'), '');
  });
});

test('focus and cleanup leave controls stationary and remove all parallax work', () => {
  withDepth({}, env => {
    env.flush();
    env.scene.emit('focusin');
    assert.ok(env.animations.every(animation => animation.cancelled));
    assert.equal(env.scene.dataset.depthActive, 'false');
    env.scene.emit('focusout', { relatedTarget: null });
    env.flush();
    env.cleanup();
    assert.ok(env.animations.every(animation => animation.cancelled));
    assert.equal(env.frames.size, 0);
    assert.ok(env.observers.every(observer => observer.disconnected));
    assert.equal(env.targets.reduce((sum, target) => sum + target.count(), 0), 0);
    assert.equal(env.layer.style.transform, 'rotate(-4deg)');
  });
});
