/* The useful capability choices do not depend on a 3D renderer. */
const modes = {
  products: {
    title: 'Useful products. Thoughtfully engineered.',
    copy: 'Web and mobile experiences shaped around the people using them.',
    href: '/services/mobile.html',
    label: 'Explore digital products',
  },
  intelligence: {
    title: 'A clearer view of what comes next.',
    copy: 'Practical AI and data systems that turn information into useful decisions.',
    href: '/services/ai.html',
    label: 'Explore AI and intelligence',
  },
  connections: {
    title: 'The right pieces, working together.',
    copy: 'Connected tools, teams, and workflows, with less friction between them.',
    href: '/services/integration.html',
    label: 'Explore connected systems',
  },
};

export function initCompanyCapabilities(figure) {
  const controls = figure.querySelector('.company-scene-controls');
  const buttons = [...figure.querySelectorAll('[data-company-view]')];
  const title = figure.querySelector('[data-company-mode-title]');
  const copy = figure.querySelector('[data-company-mode-copy]');
  const link = figure.querySelector('[data-company-mode-link]');
  let selected = figure.dataset.companyMode || 'products';
  const select = mode => {
    const target = modes[mode];
    if (!target) return;
    selected = mode;
    figure.dataset.companyMode = mode;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.companyView === mode)));
    if (title) title.textContent = target.title;
    if (copy) copy.textContent = target.copy;
    if (link) {
      link.href = target.href;
      link.setAttribute('aria-label', target.label);
      const label = link.querySelector('[data-company-link-label]');
      if (label) label.textContent = target.label;
    }
  };
  const listeners = buttons.map(button => {
    const handler = () => select(button.dataset.companyView);
    button.addEventListener('click', handler);
    return () => button.removeEventListener('click', handler);
  });
  select(selected);
  if (controls) controls.hidden = false;
  figure.dataset.companyControls = 'ready';
  return {
    get mode() { return selected; },
    detach() { listeners.forEach(remove => remove()); },
  };
}
