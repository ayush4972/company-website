import test from 'node:test';
import assert from 'node:assert/strict';
import { initCompanyScene } from '../frontend/js/company-scene.js';

// Rendering is exercised in the browser. These tests protect the usable HTML
// experience and lifecycle when a device cannot create a WebGL context.
function withFallback(options, check) {
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
  const element = () => ({
    ...events(),
    dataset: {},
    hidden: false,
    textContent: '',
    href: '',
    children: new Map(),
    attributes: new Map(),
    setAttribute(name, value) { this.attributes.set(name, value); },
    getAttribute(name) { return this.attributes.get(name) ?? null; },
    querySelector(selector) { return this.children.get(selector) || null; },
    querySelectorAll(selector) { return this.children.get(selector) || []; },
    getBoundingClientRect() { return { top: 100, bottom: 540, left: 0, width: 650, height: 440 }; },
  });
  const figure = element();
  const stage = element();
  const canvas = element();
  let contextRequests = 0;
  canvas.getContext = () => { contextRequests++; return null; };
  const fallback = element();
  const controls = element();
  controls.hidden = true;
  const title = element();
  const copy = element();
  const link = element();
  const label = element();
  link.children.set('[data-company-link-label]', label);
  const buttons = ['products', 'intelligence', 'connections'].map(mode => {
    const button = element();
    button.dataset.companyView = mode;
    return button;
  });
  figure.children.set('.company-scene-stage', stage);
  figure.children.set('[data-company-canvas]', canvas);
  figure.children.set('[data-company-fallback]', fallback);
  figure.children.set('.company-scene-controls', controls);
  figure.children.set('[data-company-view]', buttons);
  figure.children.set('[data-company-mode-title]', title);
  figure.children.set('[data-company-mode-copy]', copy);
  figure.children.set('[data-company-mode-link]', link);
  const reduced = { ...events(), matches: !!options.reduce };
  const fine = { ...events(), matches: true };
  const browserWindow = {
    ...events(),
    innerHeight: 900,
    innerWidth: 1440,
    matchMedia: query => query.includes('reduced-motion') ? reduced : fine,
  };
  const browserDocument = {
    ...events(),
    hidden: false,
    querySelector: () => options.empty ? null : figure,
  };
  const observers = [];
  class Observer {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  }
  browserWindow.IntersectionObserver = Observer;
  browserWindow.ResizeObserver = Observer;
  const frames = new Map();
  let frameId = 0;
  const globals = {
    document: browserDocument,
    window: browserWindow,
    IntersectionObserver: Observer,
    ResizeObserver: Observer,
    requestAnimationFrame: callback => { const id = ++frameId; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
  };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const cleanups = new Set();
  const start = () => {
    const cleanup = initCompanyScene();
    if (cleanup) cleanups.add(cleanup);
    return cleanup;
  };
  try {
    for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    check({ start, figure, stage, canvas, fallback, controls, title, copy, link, label, buttons, reduced, window: browserWindow, document: browserDocument, frames, observers, eventTargets, contextRequests: () => contextRequests });
  } finally {
    cleanups.forEach(cleanup => cleanup());
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

test('pages without a company scene perform no setup or animation work', () => {
  withFallback({ empty: true }, env => {
    assert.equal(env.start(), undefined);
    assert.equal(env.contextRequests(), 0);
    assert.equal(env.frames.size, 0);
    assert.equal(env.observers.length, 0);
    assert.equal(env.eventTargets.reduce((sum, target) => sum + target.listenerCount(), 0), 0);
  });
});

test('WebGL failure preserves the illustration and usable native capability controls', () => {
  withFallback({}, env => {
    const cleanup = env.start();
    assert.equal(typeof cleanup, 'function');
    assert.equal(env.contextRequests(), 1);
    assert.equal(env.figure.dataset.sceneReady, 'fallback');
    assert.equal(env.fallback.hidden, false);
    assert.equal(env.controls.hidden, false);
    assert.equal(env.figure.dataset.companyControls, 'ready');
    assert.equal(env.canvas.getAttribute('aria-hidden'), 'true');
    assert.equal(env.link.href, '/services/mobile.html');
    assert.equal(env.buttons[0].getAttribute('aria-pressed'), 'true');
    assert.equal(env.frames.size, 0);
  });
});

test('capability choices update content, service destinations, and pressed states without WebGL', () => {
  withFallback({}, env => {
    env.start();
    const firstTitle = env.title.textContent;
    const firstCopy = env.copy.textContent;
    env.buttons[1].emit('click');
    assert.equal(env.figure.dataset.companyMode, 'intelligence');
    assert.notEqual(env.title.textContent, firstTitle);
    assert.notEqual(env.copy.textContent, firstCopy);
    assert.equal(env.link.href, '/services/ai.html');
    assert.equal(env.label.textContent, env.link.getAttribute('aria-label'));
    assert.match(env.label.textContent, /AI|intelligence/i);
    assert.deepEqual(env.buttons.map(button => button.getAttribute('aria-pressed')), ['false', 'true', 'false']);
    env.buttons[2].emit('click');
    assert.equal(env.link.href, '/services/integration.html');
    assert.match(env.label.textContent, /connected/i);
    assert.deepEqual(env.buttons.map(button => button.getAttribute('aria-pressed')), ['false', 'false', 'true']);
    env.buttons[0].emit('click');
    assert.equal(env.link.href, '/services/mobile.html');
    assert.equal(env.title.textContent, firstTitle);
    assert.equal(env.frames.size, 0);
  });
});

test('reduced-motion fallback remains static through controls, pointer, and lifecycle events', () => {
  withFallback({ reduce: true }, env => {
    env.start();
    env.buttons[1].emit('click');
    env.stage.emit('pointermove', { pointerType: 'mouse', clientX: 500, clientY: 200 });
    env.reduced.matches = false;
    env.reduced.emit('change');
    env.window.emit('resize');
    env.window.emit('beforeprint');
    env.window.emit('afterprint');
    env.document.hidden = true;
    env.document.emit('visibilitychange');
    env.document.hidden = false;
    env.document.emit('visibilitychange');
    assert.equal(env.frames.size, 0);
    assert.equal(env.fallback.hidden, false);
    assert.equal(env.link.href, '/services/ai.html');
  });
});

test('cleanup removes handlers and observers, restores fallback, and permits initialization again', () => {
  withFallback({}, env => {
    const cleanup = env.start();
    assert.equal(env.start(), cleanup, 'repeated setup should not register duplicate handlers');
    assert.equal(env.contextRequests(), 1);
    cleanup();
    assert.equal(env.frames.size, 0);
    assert.equal(env.controls.hidden, true);
    assert.equal(env.fallback.hidden, false);
    assert.equal(env.figure.dataset.sceneReady, undefined);
    assert.equal(env.eventTargets.reduce((sum, target) => sum + target.listenerCount(), 0), 0);
    assert.ok(env.observers.every(observer => observer.disconnected));
    const href = env.link.href;
    env.buttons[2].emit('click');
    assert.equal(env.link.href, href, 'disposed controls must no longer respond');
    const reinitialized = env.start();
    assert.notEqual(reinitialized, cleanup);
    assert.equal(env.contextRequests(), 2);
    assert.equal(env.controls.hidden, false);
    assert.equal(env.link.href, '/services/mobile.html');
  });
});
