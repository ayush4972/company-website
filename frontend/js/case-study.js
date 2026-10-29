/* Progressive enhancements for the Sadak Sujhav case study. No external dependencies. */
(() => {
  'use strict';

  // Keep the section contents visible whether or not scroll observation is available.
  const caseNav = document.querySelector('[data-case-nav]');
  if (caseNav) {
    const items = [...caseNav.querySelectorAll('a[href^="#"]')].map(link => {
      let id;
      try { id = decodeURIComponent(link.getAttribute('href').slice(1)); }
      catch { return null; }
      const section = document.getElementById(id);
      return section?.matches('[data-case-section]') ? { link, section } : null;
    }).filter(Boolean);
    const markCurrent = id => {
      items.forEach(({ link, section }) => {
        const active = section.id === id;
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
        link.classList.toggle('is-active', active);
      });
    };
    const hashItem = () => {
      try { return items.find(({ section }) => section.id === decodeURIComponent(window.location.hash.slice(1))); }
      catch { return undefined; }
    };
    if (items.length) {
      markCurrent((hashItem() || items[0]).section.id);
      items.forEach(({ link, section }) => link.addEventListener('click', () => markCurrent(section.id)));
      window.addEventListener('hashchange', () => {
        const item = hashItem();
        if (item) markCurrent(item.section.id);
      });
      if ('IntersectionObserver' in window) {
        const contentSection = items.find(({ section }) => section.classList.contains('section'))?.section;
        const readingLine = () => Math.min(
          (document.querySelector('.site-header')?.getBoundingClientRect().height || 0) + caseNav.getBoundingClientRect().height + (contentSection ? parseFloat(getComputedStyle(contentSection).paddingTop) : 0) + 24,
          window.innerHeight * 0.65,
        );
        const updateCurrent = () => {
          const preceding = items.filter(({ section }) => section.getBoundingClientRect().top <= readingLine() + 1);
          markCurrent((preceding.at(-1) || items[0]).section.id);
        };
        let observer;
        const observeSections = () => {
          observer?.disconnect();
          observer = new IntersectionObserver(updateCurrent, { rootMargin: `-${Math.round(readingLine())}px 0px 0px 0px`, threshold: 0 });
          items.forEach(({ section }) => observer.observe(section));
          updateCurrent();
        };
        observeSections();
        let resizeFrame;
        window.addEventListener('resize', () => {
          cancelAnimationFrame(resizeFrame);
          resizeFrame = requestAnimationFrame(observeSections);
        }, { passive: true });
      }
    }
  }

  // All panels are readable in the HTML fallback; hide inactive panels only after validation.
  document.querySelectorAll('[data-case-tabs]').forEach((wrapper, groupIndex) => {
    const tablist = wrapper.querySelector('[role="tablist"]');
    if (!tablist) return;
    const tabs = [...tablist.querySelectorAll('button[role="tab"]')].filter(tab => !tab.disabled);
    const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
    if (tabs.length < 2 || panels.some(panel => !panel || !wrapper.contains(panel)) || new Set(panels).size !== panels.length) return;
    tabs.forEach((tab, index) => {
      if (!tab.id) tab.id = `case-view-${groupIndex + 1}-${index + 1}`;
      panels[index].setAttribute('role', 'tabpanel');
      panels[index].setAttribute('aria-labelledby', tab.id);
      if (!panels[index].hasAttribute('tabindex')) panels[index].tabIndex = 0;
    });
    const activate = (selected, moveFocus = false) => {
      tabs.forEach((tab, index) => {
        const active = index === selected;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        panels[index].hidden = !active;
      });
      if (moveFocus) tabs[selected].focus();
    };
    let hashPanel = -1;
    try { hashPanel = panels.findIndex(panel => panel.id === decodeURIComponent(window.location.hash.slice(1))); }
    catch { /* An invalid hash does not prevent the tab enhancement. */ }
    const selected = hashPanel >= 0 ? hashPanel : Math.max(0, tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true'));
    activate(selected);
    wrapper.dataset.tabsReady = 'true';
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(index));
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault();
        activate(next, true);
      });
    });
  });

  // These are the company's published field photographs, not live service data.
  const photoRoot = '/assets/images/blog/sadak-sujhav-two-months/';
  const roads = {
    samakhushi: {
      name: 'Samakhushi–Tokha', file: 'samakhushi-tokha-pothole', beforeSize: [880, 660], afterSize: [880, 660],
      before: 'Before: water-filled potholes across a bend on the Samakhushi Chowk–Tokha road',
      after: 'After: repaired asphalt at the same bend on the Samakhushi Chowk–Tokha road',
      note: 'Pothole repair example from Trasier’s October 16, 2026 company update, which attributes the road work to Kathmandu Division.',
    },
    maharajgunj: {
      name: 'Maharajgunj–Bansbari', file: 'maharajgunj-bansbari-footpath', beforeSize: [720, 540], afterSize: [720, 540],
      before: 'Before: loose, uneven footpath paving and a puddle along Maharajgunj–Bansbari',
      after: 'After: re-laid footpath paving along Maharajgunj–Bansbari',
      note: 'The October 16, 2026 company update documents footpath paving before and after the work and credits Kathmandu Division.',
    },
    baniyatar: {
      name: 'Baniyatar–Samakhushi', file: 'baniyatar-samakhusi-water-on-road', beforeSize: [1000, 750], afterSize: [650, 488],
      before: 'Before: standing water and a damaged patch at the edge of the Baniyatar–Samakhushi road',
      after: 'After: a resurfaced asphalt patch around the drain cover on the Baniyatar–Samakhushi road',
      note: 'The October 16, 2026 company update pairs a waterlogged roadside patch with resurfacing around the drain cover and attributes the work to Kathmandu Division.',
    },
    nagdhunga: {
      name: 'Nagdhunga–Tankeswor', file: 'nagdhunga-tankeswor-road-damage', beforeSize: [880, 660], afterSize: [960, 720],
      before: 'Before: broken asphalt and loose gravel on a sloping section of Nagdhunga–Tankeswor',
      after: 'After: fresh asphalt on Nagdhunga–Tankeswor, photographed at night with traffic cones in place',
      note: 'This asphalt repair pair appears in Trasier’s October 16, 2026 company update. The completion photograph was taken at night; the update credits Kathmandu Division.',
    },
    dandagaun: {
      name: 'Dandagaun–Gurjebhanjyang', file: 'dandagaun-gurjebhanjyang-road-damage', beforeSize: [1100, 825], afterSize: [760, 570],
      before: 'Before: broken asphalt and loose stones on Dandagaun–Gurjebhanjyang',
      after: 'After: a fresh asphalt patch over the damaged area on Dandagaun–Gurjebhanjyang',
      note: 'The October 16, 2026 company update shows this damaged area before and after asphalt patching and attributes the road work to Kathmandu Division.',
    },
  };
  document.querySelectorAll('select[data-road-selector]').forEach(select => {
    const scope = select.closest('[data-case-section]') || select.closest('section') || document;
    const comparison = scope.querySelector('[data-comparison]') || document.querySelector('[data-comparison]');
    const before = comparison?.querySelector('.comparison-before');
    const after = comparison?.querySelector('.comparison-after');
    if (!before || !after) return;
    const location = scope.querySelector('[data-road-location]');
    const note = scope.querySelector('[data-road-note]');
    const status = scope.querySelector('[data-road-status]');
    const showRoad = (key, announce = true) => {
      const road = roads[key];
      if (!road) return;
      before.src = `${photoRoot}${road.file}-before.jpg`;
      before.alt = road.before;
      [before.width, before.height] = road.beforeSize;
      after.src = `${photoRoot}${road.file}-after.jpg`;
      after.alt = road.after;
      [after.width, after.height] = road.afterSize;
      if (location) location.textContent = `${road.name}, Kathmandu`;
      if (note) note.textContent = road.note;
      if (status && announce) status.textContent = `Showing ${road.name} before and after.`;
      // Preserve the user's chosen comparison percentage; site.js owns the range.
    };
    showRoad(select.value, false);
    select.addEventListener('change', () => showRoad(select.value));
    select.disabled = false;
    const controls = select.closest('[data-road-controls]');
    if (controls) controls.hidden = false;
  });
})();
