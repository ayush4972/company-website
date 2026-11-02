import test from 'node:test';
import assert from 'node:assert/strict';
import { initDeferredCompanyScene } from '../frontend/js/company-scene-loader.js';

async function environment(options, check) {
  const events = () => {
    const handlers = new Map();
    return {
      addEventListener(type, handler) { if (!handlers.has(type)) handlers.set(type, new Set()); handlers.get(type).add(handler); },
      removeEventListener(type, handler) { handlers.get(type)?.delete(handler); },
      emit(type) { for (const handler of [...handlers.get(type) || []]) handler({}); },
    };
  };
  const element = () => ({
    ...events(), dataset: {}, attributes: new Map(), children: new Map(), hidden: false,
    setAttribute(key, value) { this.attributes.set(key, value); },
    getAttribute(key) { return this.attributes.get(key); },
    querySelector(key) { return this.children.get(key) || null; },
    querySelectorAll(key) { return this.children.get(key) || []; },
    click() { this.emit('click'); },
  });
  const figure = element();
  const controls = element(); controls.hidden = true;
  const title = element(); const copy = element(); const link = element(); const label = element();
  link.children.set('[data-company-link-label]', label);
  figure.children.set('.company-scene-controls', controls);
  figure.children.set('[data-company-mode-title]', title);
  figure.children.set('[data-company-mode-copy]', copy);
  figure.children.set('[data-company-mode-link]', link);
  const buttons = ['products', 'intelligence', 'connections'].map(mode => {
    const button = element(); button.dataset.companyView = mode;
    figure.children.set(`[data-company-view="${mode}"]`, button);
    return button;
  });
  figure.children.set('[data-company-view]', buttons);
  const small = { ...events(), matches: !!options.small };
  const reduced = { ...events(), matches: !!options.reduced };
  let observe;
  class Observer {
    constructor(callback) { observe = callback; }
    observe() {}
    disconnect() {}
  }
  const callbacks = new Map();
  let sequence = 0;
  const browserWindow = {
    ...events(),
    matchMedia: query => query.includes('max-width') ? small : reduced,
    IntersectionObserver: Observer,
    requestIdleCallback(callback) { callbacks.set(++sequence, callback); return sequence; },
    cancelIdleCallback(id) { callbacks.delete(id); },
  };
  const browserDocument = { ...events(), hidden: false };
  const globals = { window: browserWindow, document: browserDocument, navigator: { connection: { ...events(), saveData: !!options.saveData } }, IntersectionObserver: Observer };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  let imports = 0;
  let initializedMode;
  const start = () => initDeferredCompanyScene({ figure, loadScene: async () => {
    imports++;
    return { initCompanyScene() { initializedMode = figure.dataset.companyMode; return () => {}; } };
  } });
  try {
    for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    await check({ start, figure, controls, title, link, buttons, small, reduced,
      near: value => observe([{ isIntersecting: value }]),
      pending: () => callbacks.size,
      async idle() { const batch = [...callbacks.values()]; callbacks.clear(); for (const callback of batch) await callback(); },
      imports: () => imports, initializedMode: () => initializedMode,
    });
  } finally {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

for (const option of ['small', 'reduced', 'saveData']) {
  test(`${option} visitors retain working capability choices without downloading 3D`, async () => {
    await environment({ [option]: true }, async env => {
      env.start(); env.near(true); await env.idle();
      assert.equal(env.imports(), 0);
      assert.equal(env.controls.hidden, false);
      env.buttons[1].click();
      assert.equal(env.link.href, '/services/ai.html');
      assert.equal(env.buttons[1].getAttribute('aria-pressed'), 'true');
      env.buttons[2].click();
      assert.equal(env.link.href, '/services/integration.html');
    });
  });
}

test('desktop 3D waits for near-view idle time and keeps the capability choice made before download', async () => {
  await environment({}, async env => {
    env.start();
    assert.equal(env.pending(), 0);
    env.buttons[2].click();
    env.near(true);
    assert.equal(env.imports(), 0);
    assert.equal(env.pending(), 1);
    await env.idle();
    assert.equal(env.imports(), 1);
    assert.equal(env.initializedMode(), 'connections');
    assert.equal(env.figure.dataset.scenePolicy, 'interactive');
  });
});

test('moving offscreen or enabling reduced motion cancels a queued 3D download', async () => {
  await environment({}, async env => {
    env.start(); env.near(true);
    env.near(false);
    assert.equal(env.pending(), 0);
    env.near(true);
    env.reduced.matches = true;
    env.reduced.emit('change');
    await env.idle();
    assert.equal(env.imports(), 0);
    assert.equal(env.figure.dataset.scenePolicy, 'static');
  });
});
