import test from 'node:test';
import assert from 'node:assert/strict';
import { initMotion } from '../frontend/js/motion.js';

// Small browser fakes exercise preference/fallback lifecycle behavior without a
// browser package, timers, or assertions about decorative animation constants.
function withBrowser(options, check) {
  const listeners = () => {
    const handlers = new Map();
    return {
      addEventListener(type, handler) {
        if (!handlers.has(type)) handlers.set(type, []);
        handlers.get(type).push(handler);
      },
      emit(type, event = {}) {
        for (const handler of handlers.get(type) || []) handler(event);
      },
    };
  };
  const classList = () => {
    const classes = new Set();
    return {
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      contains: name => classes.has(name),
      toggle(name, force) {
        const enabled = force ?? !classes.has(name);
        if (enabled) classes.add(name); else classes.delete(name);
        return enabled;
      },
    };
  };
  const animations = [];
  const observers = [];
  const frames = new Map();
  let nextFrame = 1;
  class FakeElement {
    constructor(name) {
      this.name = name;
      this.dataset = {};
      this.style = {};
      this.classList = classList();
      this.attributes = new Map();
      this.children = [];
      this.parentElement = null;
      this.hidden = false;
    }
    appendChild(child) {
      child.parentElement = this;
      this.children.push(child);
      return child;
    }
    remove() {
      if (this.parentElement) {
        this.parentElement.children = this.parentElement.children.filter(child => child !== this);
        this.parentElement = null;
      }
    }
    setAttribute(name, value) { this.attributes.set(name, value); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    querySelector() { return null; }
    querySelectorAll() { return this.name === 'main' ? [target] : []; }
    matches() { return false; }
    closest(selector) {
      if (selector !== '[data-motion-state]') return null;
      for (let node = this; node; node = node.parentElement) {
        if (node.dataset.motionState) return node;
      }
      return null;
    }
    contains(other) {
      for (let node = other; node; node = node.parentElement) if (node === this) return true;
      return false;
    }
    getClientRects() { return this.hidden ? [] : [this.getBoundingClientRect()]; }
    getBoundingClientRect() { return { top: 300, bottom: 420, height: 120 }; }
  }
  if (options.waapi !== false) {
    FakeElement.prototype.animate = function (keyframes) {
      const animation = {
        element: this,
        keyframes,
        cancelled: false,
        onfinish: null,
        oncancel: null,
        cancel() {
          this.cancelled = true;
          this.oncancel?.();
        },
      };
      animations.push(animation);
      return animation;
    };
  }
  class FakeObserver {
    constructor(callback) {
      this.callback = callback;
      this.observed = new Set();
      this.disconnected = false;
      observers.push(this);
    }
    observe(element) { this.observed.add(element); }
    unobserve(element) { this.observed.delete(element); }
    disconnect() { this.disconnected = true; this.observed.clear(); }
    intersect(element) {
      if (this.observed.has(element)) this.callback([{ target: element, isIntersecting: true }]);
    }
  }
  const root = new FakeElement('html');
  root.scrollHeight = 2400;
  root.clientHeight = 900;
  const body = new FakeElement('body');
  const main = body.appendChild(new FakeElement('main'));
  const header = new FakeElement('header');
  const target = main.appendChild(new FakeElement('content'));
  target.id = 'content-block';
  const anchor = target.appendChild(new FakeElement('heading'));
  anchor.id = 'nested-heading';
  const preference = { ...listeners(), matches: options.reduce === true };
  const browserWindow = {
    ...listeners(),
    scrollY: 0,
    innerHeight: 900,
    location: { hash: '' },
    matchMedia: () => preference,
  };
  if (options.intersection !== false) browserWindow.IntersectionObserver = FakeObserver;
  const browserDocument = {
    ...listeners(),
    documentElement: root,
    body,
    activeElement: body,
    querySelector: selector => selector === 'main' ? main : selector === '.site-header' ? header : null,
    createElement: () => new FakeElement('created'),
    getElementById: id => id === target.id ? target : id === anchor.id ? anchor : null,
  };
  const globals = {
    document: browserDocument,
    window: browserWindow,
    Element: FakeElement,
    IntersectionObserver: FakeObserver,
    CSS: { supports: () => true },
    requestAnimationFrame: callback => {
      const id = nextFrame++;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame: id => frames.delete(id),
  };
  const original = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const flushFrames = () => {
    for (let cycle = 0; frames.size && cycle < 20; cycle++) {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach(callback => callback(0));
    }
    assert.equal(frames.size, 0, 'animation-frame work must settle instead of looping');
  };
  const progressElements = () => body.children.filter(child => child.className === 'scroll-progress');
  const readable = () => !animations.some(animation => animation.element === target && !animation.cancelled && animation.keyframes[0].opacity === 0);
  try {
    for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    check({ root, body, target, anchor, header, preference, window: browserWindow, document: browserDocument, observers, animations, flushFrames, progressElements, readable });
  } finally {
    for (const [key, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

test('reduced-motion visitors get readable content without reveals or a progress indicator', () => {
  withBrowser({ reduce: true }, env => {
    initMotion();
    env.flushFrames();
    assert.equal(env.animations.length, 0);
    assert.equal(env.observers.length, 0);
    assert.equal(env.progressElements().length, 0);
    assert.equal(env.root.classList.contains('motion-enabled'), false);
    assert.equal(env.readable(), true);
    assert.equal(env.target.style.opacity, undefined);
  });
});

test('changing to reduced motion cancels active effects and restores the normal page', () => {
  withBrowser({}, env => {
    initMotion();
    env.flushFrames();
    env.observers[0].intersect(env.target);
    assert.equal(env.animations.length, 1);
    assert.equal(env.readable(), false, 'the stub must represent an active reveal effect');
    assert.equal(env.progressElements().length, 1);
    env.preference.matches = true;
    env.preference.emit('change');
    env.flushFrames();
    assert.equal(env.animations[0].cancelled, true);
    assert.equal(env.observers[0].disconnected, true);
    assert.equal(env.target.dataset.motionState, 'revealed');
    assert.equal(env.progressElements().length, 0);
    assert.equal(env.root.classList.contains('motion-enabled'), false);
    assert.equal(env.header.classList.contains('is-scrolled'), false);
    assert.equal(env.readable(), true);
  });
});

for (const unavailable of ['intersection', 'waapi']) {
  test(`missing ${unavailable} support leaves page content readable`, () => {
    withBrowser({ [unavailable]: false }, env => {
      initMotion();
      env.flushFrames();
      assert.equal(env.animations.length, 0);
      assert.equal(env.observers.length, 0);
      assert.equal(env.target.hidden, false);
      assert.equal(env.target.style.opacity, undefined);
      assert.equal(env.target.style.translate, undefined);
      assert.equal(env.readable(), true);
    });
  });
}

test('keyboard focus cancels a reveal on the focused content immediately', () => {
  withBrowser({}, env => {
    initMotion();
    env.flushFrames();
    env.observers[0].intersect(env.target);
    env.document.activeElement = env.target;
    env.document.emit('focusin', { target: env.target });
    assert.equal(env.animations[0].cancelled, true);
    assert.equal(env.target.dataset.motionState, 'revealed');
    assert.equal(env.readable(), true);
  });
});

test('printing cancels active reveal effects before content is captured', () => {
  withBrowser({}, env => {
    initMotion();
    env.flushFrames();
    env.observers[0].intersect(env.target);
    env.window.emit('beforeprint');
    assert.equal(env.animations[0].cancelled, true);
    assert.equal(env.target.dataset.motionState, 'revealed');
    assert.equal(env.readable(), true);
  });
});

test('an anchor jump makes its animated containing block readable immediately', () => {
  withBrowser({}, env => {
    initMotion();
    env.flushFrames();
    env.observers[0].intersect(env.target);
    assert.equal(env.readable(), false);
    env.window.location.hash = `#${env.anchor.id}`;
    env.window.emit('hashchange');
    assert.equal(env.animations[0].cancelled, true);
    assert.equal(env.target.dataset.motionState, 'revealed');
    assert.equal(env.readable(), true);
  });
});
