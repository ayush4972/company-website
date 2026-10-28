import { sampleOrbit } from './vendor/hyperframes-orbit.js';

const clamp = value => Math.max(0, Math.min(1, value));
const labels = ['A person notices.', 'A place adds context.', 'A connection moves it forward.'];

// A seekable scene, driven by native scroll rather than a wall-clock render loop.
// Orbital/camera math is adapted from Hyperframes; see vendor source and notices.
export function initCreativeMotion() {
  const scene = document.querySelector('[data-signal-scene]');
  const story = document.querySelector('[data-signal-story]');
  const strip = document.querySelector('[data-kinetic-strip]');
  if (!scene && !story && !strip) return;
  const root = document.documentElement;
  if (root.dataset.creativeMotion === 'true') return;
  root.dataset.creativeMotion = 'true';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact = window.matchMedia('(max-width: 640px), (max-height: 700px)');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const world = scene?.querySelector('[data-scene-world]');
  const cards = scene ? [...scene.querySelectorAll('[data-orbit-card]')] : [];
  const hint = scene?.querySelector('[data-scene-hint]');
  const steps = story ? [...story.querySelectorAll('[data-story-step]')] : [];
  const visual = story?.querySelector('[data-story-visual]');
  const counter = story?.querySelector('[data-story-counter]');
  const indexLabel = story?.querySelector('[data-story-index]');
  const title = story?.querySelector('[data-story-title]');
  const track = strip?.querySelector('[data-kinetic-track]');
  const visibility = new Map([scene, story, strip].filter(Boolean).map(element => [element, true]));
  const disposers = [];
  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let printing = false;
  let stage = -1;
  let disposed = false;
  let staticJourney = reduce.matches || compact.matches;

  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    disposers.push(() => target.removeEventListener(type, handler, options));
  };
  const cancelFrame = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };
  const setStage = next => {
    if (!visual || stage === next) return;
    stage = next;
    visual.dataset.stage = String(next);
    const complete = next === 'all';
    const number = complete ? '01—03' : String(next + 1).padStart(2, '0');
    if (counter) counter.textContent = complete ? '01 → 03' : `${number} / 03`;
    if (indexLabel) indexLabel.textContent = number;
    if (title) title.textContent = complete ? 'One connected journey.' : labels[next];
    steps.forEach((element, index) => { element.dataset.active = String(complete || index === next); });
  };
  const resetScene = () => {
    pointerX = pointerY = 0;
    world?.style.removeProperty('--scene-rx');
    world?.style.removeProperty('--scene-ry');
    scene?.style.removeProperty('--phone-lift');
    cards.forEach(card => card.style.removeProperty('transform'));
    track?.style.removeProperty('--strip-x');
  };
  const paint = () => {
    frame = 0;
    if (disposed || reduce.matches || document.hidden || printing) return;
    const viewport = window.innerHeight;
    if (scene && world && visibility.get(scene)) {
      const bounds = scene.getBoundingClientRect();
      if (bounds.bottom > 0 && bounds.top < viewport) {
        const progress = clamp(-bounds.top / Math.max(1, bounds.height * .9));
        // Keep the repository's full orbit seekable, composing a short camera arc
        // here so the real product screenshot remains easy to recognise.
        const orbitProgress = .018 + progress * .13;
        const pose = sampleOrbit(orbitProgress, 0, Math.max(1, cards.length));
        world.style.setProperty('--scene-rx', `${(-5 + pose.rotationX * .45 - pointerY * 4).toFixed(3)}deg`);
        world.style.setProperty('--scene-ry', `${(-11 + pose.rotationY * .24 + pointerX * 7).toFixed(3)}deg`);
        scene.style.setProperty('--phone-lift', `${(-18 - (640 - pose.cameraZ) * .5).toFixed(2)}px`);
        cards.forEach((card, index) => {
          const item = sampleOrbit(orbitProgress, index, cards.length);
          const arc = progress * .16;
          const x = item.x * Math.cos(arc) - item.y * Math.sin(arc);
          const y = item.x * Math.sin(arc) + item.y * Math.cos(arc);
          const spread = index === 0 ? .82 : index === 1 ? 1.4 : 2;
          card.style.transform = `translate3d(calc(${(x * spread).toFixed(2)}px * var(--orbit-spread, 1)),${(y * 1.32).toFixed(2)}px,${item.z.toFixed(2)}px) rotateY(${(-pose.rotationY * .12).toFixed(2)}deg)`;
        });
      }
    }
    if (story && visual && !staticJourney && visibility.get(story)) {
      const bounds = story.getBoundingClientRect();
      const progress = clamp((viewport * .65 - bounds.top) / Math.max(1, bounds.height - viewport * .35));
      visual.style.setProperty('--journey-progress', progress.toFixed(4));
      let next = 0;
      steps.forEach((element, index) => { if (element.getBoundingClientRect().top < viewport * .57) next = index; });
      setStage(next);
    }
    if (strip && track && visibility.get(strip)) {
      const bounds = strip.getBoundingClientRect();
      const progress = clamp((viewport - bounds.top) / (viewport + bounds.height));
      track.style.setProperty('--strip-x', `${(-100 * progress).toFixed(2)}px`);
    }
  };
  const queue = () => {
    const hasVisibleMotion = [...visibility].some(([element, visible]) => visible && (element !== story || !staticJourney));
    if (!disposed && !frame && !reduce.matches && !document.hidden && !printing && hasVisibleMotion) {
      frame = requestAnimationFrame(paint);
    }
  };
  const resetPointer = () => { pointerX = pointerY = 0; queue(); };
  const preferenceChanged = () => {
    cancelFrame();
    resetScene();
    staticJourney = reduce.matches || compact.matches;
    setStage(staticJourney ? 'all' : 0);
    if (staticJourney) visual?.style.setProperty('--journey-progress', '1');
    else visual?.style.removeProperty('--journey-progress');
    if (hint) {
      hint.hidden = reduce.matches;
      hint.textContent = fine.matches ? 'Move to explore · scroll to shift perspective' : 'Scroll to shift perspective';
    }
    if (!reduce.matches) queue();
  };

  let observer;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => visibility.set(entry.target, entry.isIntersecting));
      if (![...visibility.values()].some(Boolean)) cancelFrame();
      else queue();
    }, { rootMargin: '80px 0px', threshold: 0 });
    visibility.forEach((_, element) => observer.observe(element));
  }
  if (scene) {
    listen(scene, 'pointermove', event => {
      if (!fine.matches || reduce.matches || document.hidden || event.pointerType === 'touch' || !visibility.get(scene)) return;
      const bounds = scene.getBoundingClientRect();
      pointerX = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1));
      pointerY = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1));
      queue();
    }, { passive: true });
    listen(scene, 'pointerleave', resetPointer);
    listen(scene, 'pointercancel', resetPointer);
    listen(scene, 'focusin', resetPointer);
  }
  listen(window, 'scroll', queue, { passive: true });
  listen(window, 'resize', queue, { passive: true });
  listen(window, 'pageshow', queue);
  listen(window, 'pagehide', () => { cancelFrame(); resetScene(); });
  listen(document, 'visibilitychange', () => {
    cancelFrame();
    if (document.hidden) resetScene(); else queue();
  });
  listen(window, 'beforeprint', () => { printing = true; cancelFrame(); resetScene(); });
  listen(window, 'afterprint', () => { printing = false; queue(); });
  listen(reduce, 'change', preferenceChanged);
  listen(compact, 'change', preferenceChanged);
  listen(fine, 'change', () => { resetPointer(); preferenceChanged(); });
  preferenceChanged();
  return () => {
    disposed = true;
    cancelFrame();
    observer?.disconnect();
    disposers.forEach(dispose => dispose());
    resetScene();
    if (hint) hint.hidden = true;
    delete root.dataset.creativeMotion;
  };
}
