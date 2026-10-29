import * as THREE from './vendor/three/three.module.min.js';
import { RoundedBoxGeometry } from './vendor/three/RoundedBoxGeometry.js';
import { RoomEnvironment } from './vendor/three/RoomEnvironment.js';
import { animate as animateUI, stagger } from './vendor/animejs/anime.esm.min.js';

const MODES = {
  products: {
    title: 'Useful products. Thoughtfully engineered.',
    copy: 'Web and mobile experiences shaped around the people using them.',
    href: '/services/mobile.html',
    label: 'Explore digital products',
    rotation: [-.06, -.2, -.04],
    points: [[-1.47,1.1,0],[-.49,1.1,0],[.49,1.1,0],[1.47,1.1,0],[-.49,.12,0],[.49,.12,0],[-.49,-.86,0],[.49,-.86,0]],
  },
  intelligence: {
    title: 'A clearer view of what comes next.',
    copy: 'Practical AI and data systems that turn information into useful decisions.',
    href: '/services/ai.html',
    label: 'Explore AI and intelligence',
    rotation: [.08, .48, .06],
    points: [[-.8,.8,-.8],[.8,.8,-.8],[-.8,-.8,-.8],[.8,-.8,-.8],[-.8,.8,.8],[.8,.8,.8],[-.8,-.8,.8],[.8,-.8,.8]],
  },
  connections: {
    title: 'The right pieces, working together.',
    copy: 'Connected tools, teams, and workflows, with less friction between them.',
    href: '/services/integration.html',
    label: 'Explore connected systems',
    rotation: [.08, -.3, -.1],
    points: Array.from({ length: 8 }, (_, index) => {
      const angle = index / 8 * Math.PI * 2;
      return [Math.cos(angle) * 1.73, Math.sin(angle) * 1.48, Math.sin(angle * 2) * .55];
    }),
  },
};

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const ease = value => 1 - (1 - value) ** 3;
let disposeCurrent;

/** A company sculpture with native controls and a static illustration fallback. */
export function initCompanyScene() {
  if (disposeCurrent) return disposeCurrent;
  const figure = document.querySelector('[data-company-scene]');
  if (!figure) return;
  const stage = figure.querySelector('.company-scene-stage');
  const canvas = figure.querySelector('[data-company-canvas]');
  const fallback = figure.querySelector('[data-company-fallback]');
  const controls = figure.querySelector('.company-scene-controls');
  const buttons = [...figure.querySelectorAll('[data-company-view]')];
  const title = figure.querySelector('[data-company-mode-title]');
  const copy = figure.querySelector('[data-company-mode-copy]');
  const link = figure.querySelector('[data-company-mode-link]');
  const summaryParts = [...figure.querySelectorAll('.company-mode-summary > div, .company-mode-summary > a')];
  if (!stage || !canvas) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const cleanups = [];
  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    cleanups.push(() => target.removeEventListener(type, handler, options));
  };
  let disposed = false;
  let renderer, scene, camera, sculpture, ring, floor, environment;
  let geometries = [], materials = [], blocks = [], satellites = [];
  let mode = 'products';
  let available = false;
  let printing = false;
  let frame = 0;
  let lastTime = 0;
  let transitionAt = 0;
  let transitionDuration = 0;
  let introAt = 0;
  let introDuration = 0;
  let fromPoints = MODES.products.points.map(point => [...point]);
  let fromRotation = [...MODES.products.rotation];
  let currentRotation = [...MODES.products.rotation];
  let pointer = { x: 0, y: 0 };
  let pointerNow = { x: 0, y: 0 };
  let visible = false;
  let summaryAnimation;
  const resetSummary = () => {
    summaryAnimation?.revert();
    summaryAnimation = undefined;
    delete figure.dataset.modeAnimating;
  };
  const revealSummary = () => {
    resetSummary();
    if (reduced.matches || document.hidden || printing || !summaryParts.length) return;
    try {
      figure.dataset.modeAnimating = 'true';
      summaryAnimation = animateUI(summaryParts, {
        opacity: [.3, 1],
        translate: ['0 10px', '0 0px'],
        duration: 440,
        delay: stagger(55),
        ease: 'out(3)',
        onComplete: resetSummary,
      });
    } catch { resetSummary(); }
  };
  const boundsVisible = () => {
    const bounds = stage.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.top < window.innerHeight;
  };
  const cancel = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  };
  const canPaint = () => available && !disposed && visible && !document.hidden && !printing;
  const queue = () => {
    if (canPaint() && !frame) frame = requestAnimationFrame(paint);
  };
  const resetPointer = () => {
    pointer = { x: 0, y: 0 };
    if (reduced.matches) pointerNow = { x: 0, y: 0 };
    queue();
  };
  const fallbackState = () => {
    cancel();
    available = false;
    figure.dataset.sceneReady = 'fallback';
    figure.dataset.sceneState = 'fallback';
    if (fallback) fallback.hidden = false;
  };
  const select = (next, animate = true) => {
    if (!(next in MODES)) return;
    const changed = next !== mode;
    resetSummary();
    const target = MODES[next];
    if (blocks.length) fromPoints = blocks.map(block => block.position.toArray());
    fromRotation = [...currentRotation];
    mode = next;
    figure.dataset.companyMode = next;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.companyView === next)));
    if (title) title.textContent = target.title;
    if (copy) copy.textContent = target.copy;
    if (link) {
      link.href = target.href;
      link.setAttribute('aria-label', target.label);
      const text = link.querySelector('[data-company-link-label]');
      if (text) text.textContent = target.label;
      else if (!link.querySelector('svg, [data-icon]')) link.textContent = target.label;
    }
    transitionAt = performance.now();
    transitionDuration = animate && !reduced.matches ? 560 : 0;
    if (animate && changed) revealSummary();
    queue();
  };

  function paint(now) {
    frame = 0;
    if (!canPaint()) return;
    const delta = lastTime ? Math.min(50, now - lastTime) : 16;
    lastTime = now;
    const blend = reduced.matches ? 1 : 1 - Math.exp(-delta / 90);
    pointerNow.x += (pointer.x - pointerNow.x) * blend;
    pointerNow.y += (pointer.y - pointerNow.y) * blend;
    const progress = reduced.matches || !transitionDuration ? 1 : clamp((now - transitionAt) / transitionDuration, 0, 1);
    const amount = ease(progress);
    const target = MODES[mode];
    blocks.forEach((block, index) => {
      const start = fromPoints[index];
      const end = target.points[index];
      block.position.set(...end.map((value, axis) => start[axis] + (value - start[axis]) * amount));
      const rotation = mode === 'connections' ? index / 8 * Math.PI * 2 * .13 : mode === 'intelligence' ? .06 * (index % 2 ? 1 : -1) : 0;
      block.rotation.set(rotation * .3, rotation, rotation * .2);
    });
    currentRotation = target.rotation.map((value, axis) => fromRotation[axis] + (value - fromRotation[axis]) * amount);
    const intro = reduced.matches || !introDuration ? 1 : clamp((now - introAt) / introDuration, 0, 1);
    const introEase = ease(intro);
    sculpture.rotation.set(currentRotation[0] + pointerNow.y * .09, currentRotation[1] + pointerNow.x * .18 + (1 - introEase) * .32, currentRotation[2]);
    sculpture.position.y = .12 + (1 - introEase) * .18;
    sculpture.scale.setScalar(.94 + introEase * .06);
    ring.rotation.y = mode === 'connections' ? .3 : -.16;
    ring.rotation.z = mode === 'intelligence' ? .36 : -.22;
    satellites.forEach((satellite, index) => {
      const angle = index / satellites.length * Math.PI * 2 + .3;
      satellite.position.set(Math.cos(angle) * 2.42, Math.sin(angle) * 1.35, Math.sin(angle) * .6);
    });
    try {
      renderer.render(scene, camera);
      figure.dataset.sceneReady = 'true';
      const moving = progress < 1 || intro < 1 || Math.abs(pointerNow.x - pointer.x) + Math.abs(pointerNow.y - pointer.y) > .001;
      figure.dataset.sceneState = moving ? 'moving' : 'still';
      if (moving && !reduced.matches) queue();
    } catch {
      fallbackState();
    }
  }

  buttons.forEach(button => listen(button, 'click', () => select(button.dataset.companyView)));
  select('products', false);
  if (controls) controls.hidden = false;
  figure.dataset.companyControls = 'ready';
  canvas.setAttribute('aria-hidden', 'true');

  try {
    const context = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'low-power' });
    if (!context) throw new Error('No WebGL2 context');
    renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.setClearColor(0xf8fbff, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .9;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(32, 1, .1, 40);
    camera.position.set(4.3, 3.15, 7.8);
    camera.lookAt(0, .1, 0);
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    environment = pmrem.fromScene(room, .04);
    scene.environment = environment.texture;
    room.dispose();
    pmrem.dispose();
    const ambient = new THREE.HemisphereLight(0xeaf6ff, 0x9ab5d8, 1.3);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(-3, 9, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    key.shadow.camera.left = key.shadow.camera.bottom = -5;
    key.shadow.camera.right = key.shadow.camera.top = 5;
    key.shadow.normalBias = .035;
    key.shadow.bias = -.0003;
    key.shadow.radius = 4;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x74beff, 1.2);
    rim.position.set(4, 3, -4);
    scene.add(rim);
    sculpture = new THREE.Group();
    scene.add(sculpture);
    const blockGeometry = new RoundedBoxGeometry(.87, .87, .87, 3, .11);
    // A polished surface without transmission avoids extra scene-render passes.
    const blue = new THREE.MeshPhysicalMaterial({ color: 0x246bc0, metalness: .08, roughness: .2, clearcoat: 1, clearcoatRoughness: .16, envMapIntensity: .55 });
    const sky = new THREE.MeshPhysicalMaterial({ color: 0x75b6eb, metalness: .05, roughness: .19, clearcoat: 1, clearcoatRoughness: .12, envMapIntensity: .55 });
    const white = new THREE.MeshPhysicalMaterial({ color: 0xc8e5fa, metalness: .03, roughness: .2, clearcoat: 1, envMapIntensity: .45 });
    materials.push(blue, sky, white);
    geometries.push(blockGeometry);
    blocks = MODES.products.points.map((point, index) => {
      const block = new THREE.Mesh(blockGeometry, index === 0 || index === 3 || index === 6 ? blue : index === 2 || index === 5 ? white : sky);
      block.position.set(...point);
      block.castShadow = true;
      block.receiveShadow = true;
      sculpture.add(block);
      return block;
    });
    const ringGeometry = new THREE.TorusGeometry(2.47, .012, 8, 96);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x79b4eb, transparent: true, opacity: .62 });
    ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI * .37;
    ring.position.y = -.22;
    sculpture.add(ring);
    geometries.push(ringGeometry);
    materials.push(ringMaterial);
    const sphereGeometry = new THREE.SphereGeometry(.105, 20, 14);
    geometries.push(sphereGeometry);
    satellites = Array.from({ length: 3 }, (_, index) => {
      const satellite = new THREE.Mesh(sphereGeometry, index === 1 ? blue : sky);
      satellite.castShadow = true;
      sculpture.add(satellite);
      return satellite;
    });
    const floorGeometry = new THREE.PlaneGeometry(14, 14);
    const floorMaterial = new THREE.ShadowMaterial({ color: 0x3a73a7, opacity: .075 });
    geometries.push(floorGeometry);
    materials.push(floorMaterial);
    floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.63;
    floor.receiveShadow = true;
    scene.add(floor);
    available = true;
    introAt = performance.now();
  } catch {
    renderer?.dispose();
    fallbackState();
  }

  const resize = () => {
    if (!available || disposed) return;
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.fov = width / height < 1.05 ? 38 : 32;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    queue();
  };
  let intersection, resizeObserver;
  visible = boundsVisible();
  if ('IntersectionObserver' in window) {
    intersection = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) queue();
      else { cancel(); figure.dataset.sceneState = 'suspended'; }
    }, { threshold: .02 });
    intersection.observe(stage);
  }
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
  }
  listen(window, 'resize', resize, { passive: true });
  listen(stage, 'pointermove', event => {
    if (reduced.matches || !fine.matches || event.pointerType === 'touch' || !visible || document.hidden) return;
    const bounds = stage.getBoundingClientRect();
    pointer = { x: clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1), y: clamp((event.clientY - bounds.top) / bounds.height * 2 - 1, -1, 1) };
    queue();
  }, { passive: true });
  listen(stage, 'pointerleave', resetPointer);
  listen(stage, 'pointercancel', resetPointer);
  listen(figure, 'focusin', event => {
    resetPointer();
    if (event.target?.closest?.('.company-mode-summary')) resetSummary();
  });
  if (!intersection) listen(window, 'scroll', () => {
    visible = boundsVisible();
    if (!visible) cancel();
  }, { passive: true });
  listen(document, 'visibilitychange', () => { if (document.hidden) { cancel(); resetSummary(); } else queue(); });
  listen(window, 'pagehide', () => { cancel(); resetSummary(); });
  listen(window, 'pageshow', () => { visible = boundsVisible(); resize(); queue(); });
  listen(window, 'beforeprint', () => { printing = true; cancel(); resetSummary(); figure.dataset.sceneReady = 'print'; });
  listen(window, 'afterprint', () => { printing = false; queue(); });
  listen(reduced, 'change', () => { cancel(); resetSummary(); resetPointer(); introDuration = 0; transitionDuration = 0; queue(); });
  listen(fine, 'change', resetPointer);
  listen(canvas, 'webglcontextlost', event => { event.preventDefault(); fallbackState(); });
  listen(canvas, 'webglcontextrestored', () => { available = !!renderer; resize(); queue(); });
  resize();
  queue();

  disposeCurrent = () => {
    disposed = true;
    cancel();
    resetSummary();
    intersection?.disconnect();
    resizeObserver?.disconnect();
    cleanups.forEach(cleanup => cleanup());
    new Set(geometries).forEach(geometry => geometry.dispose());
    new Set(materials).forEach(material => material.dispose());
    environment?.dispose();
    renderer?.dispose();
    if (controls) controls.hidden = true;
    if (fallback) fallback.hidden = false;
    delete figure.dataset.sceneReady;
    delete figure.dataset.sceneState;
    delete figure.dataset.companyControls;
    disposeCurrent = undefined;
  };
  return disposeCurrent;
}
