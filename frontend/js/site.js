/* Shared navigation and progressively enhanced interactions. */
import { renderHeader, renderFooter, icon as svg } from './site-shell.js';
import { createSubmissionIds } from './submission-id.js';
import { validateCareerFile } from './career-file.js';
import { initDeferredCompanyScene } from './company-scene-loader.js';

(() => {
  'use strict';
  const page = document.body.dataset.page;
  // Generated pages already contain their shell. Older source still gets a fallback.
  const header = document.querySelector('[data-site-header]');
  if (header && !document.querySelector('.site-header')) {
    header.innerHTML = renderHeader(page, window.location.pathname);
    header.replaceWith(...header.childNodes);
  }
  const footer = document.querySelector('[data-site-footer]');
  if (footer && !document.querySelector('.site-footer')) {
    footer.innerHTML = renderFooter();
    footer.replaceWith(...footer.childNodes);
  }
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = svg(el.dataset.icon); });
  if (!document.querySelector('link[rel="icon"]')) {
    const favicon = document.createElement('link');
    favicon.rel = 'icon'; favicon.type = 'image/png'; favicon.href = '/favicon.png';
    document.head.appendChild(favicon);
  }

  // Native details navigation works before JavaScript and gains convenient dismissal.
  const disclosure = document.querySelector('.mobile-menu');
  const menu = disclosure?.querySelector('.menu-toggle');
  const syncMenu = () => {
    if (!menu || !disclosure) return;
    menu.setAttribute('aria-label', disclosure.open ? 'Close navigation' : 'Open navigation');
    menu.innerHTML = svg(disclosure.open ? 'close' : 'menu');
  };
  const closeMenu = (returnFocus = false) => {
    if (!disclosure) return;
    disclosure.open = false;
    syncMenu();
    if (returnFocus) menu?.focus();
  };
  disclosure?.addEventListener('toggle', syncMenu);
  disclosure?.querySelectorAll('nav a').forEach(link => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && disclosure?.open) closeMenu(true);
  });
  document.addEventListener('click', event => {
    if (disclosure?.open && !event.target.closest('.site-header')) closeMenu();
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', event => { if (event.matches) closeMenu(); });
  syncMenu();

  // Journal category filters never remove the underlying article links.
  const filterButtons = [...document.querySelectorAll('[data-journal-filter]')];
  const articles = [...document.querySelectorAll('[data-journal-category]')];
  const count = document.querySelector('[data-journal-count]');
  const empty = document.querySelector('[data-journal-empty]');
  filterButtons.forEach(button => button.addEventListener('click', () => {
    const selected = button.dataset.journalFilter;
    filterButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    let visible = 0;
    articles.forEach(article => {
      const categories = article.dataset.journalCategory.split(/[,\s]+/);
      const show = selected === 'all' || categories.includes(selected);
      article.hidden = !show;
      if (show) visible++;
    });
    if (count) count.textContent = `${visible} ${visible === 1 ? 'story' : 'stories'}`;
    if (empty) empty.hidden = visible !== 0;
  }));

  // An optional case-study comparison slider is keyboard accessible by default.
  document.querySelectorAll('[data-comparison]').forEach(comparison => {
    const range = comparison.querySelector('input[type="range"]');
    const update = () => comparison.style.setProperty('--comparison', `${range.value}%`);
    if (range) { range.addEventListener('input', update); update(); }
  });

  const interest = document.querySelector('[name="service"]');
  const requestedService = new URLSearchParams(window.location.search).get('service');
  if (interest && requestedService) {
    const match = [...(interest.options || [])].find(option => option.value.toLowerCase() === requestedService.toLowerCase() || option.textContent.toLowerCase().includes(requestedService.toLowerCase()));
    if (match) interest.value = match.value;
  }
  async function submitRequest(endpoint, payload) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if ([404, 405, 501].includes(response.status)) throw new Error('The email service is unavailable in this preview. Please email info@trasiertech.com.np directly; your form has been kept so you can copy it.');
        throw new Error(result.error || 'Your message could not be sent. Please try again or email info@trasiertech.com.np.');
      }
      if (result.ok !== true) throw new Error('The email service did not confirm delivery. Please try again or email info@trasiertech.com.np.');
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('The request timed out. Please try again or email info@trasiertech.com.np.');
      if (error instanceof TypeError) throw new Error('We could not connect. Check your connection, or email info@trasiertech.com.np. Your form has been kept.');
      throw error;
    } finally { clearTimeout(timeout); }
  }
  const fileBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('The file could not be read. Please choose it again.'));
    reader.readAsDataURL(file);
  });
  ['contact', 'careers'].forEach(type => {
    const form = document.getElementById(`${type}-form`);
    const status = document.getElementById(`${type}-form-status`);
    const submit = form?.querySelector('[type="submit"]');
    const fieldset = form?.querySelector('[data-form-fields]');
    const fallback = form?.querySelector('[data-form-fallback]');
    if (!form || !status || !submit || typeof fetch !== 'function' || typeof FormData !== 'function') return;
    const submissionIds = createSubmissionIds();
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!form.reportValidity() || form.dataset.submitting === 'true') return;
      const focusedControl = form.contains(document.activeElement) ? document.activeElement : null;
      const originalLabel = submit.innerHTML;
      const fields = new FormData(form);
      // Preserve exactly the submitted snapshot while file reads and delivery are pending.
      // Otherwise a successful reset could erase new edits made during the request.
      if (fieldset) fieldset.disabled = true;
      form.setAttribute('aria-busy', 'true');
      status.textContent = '';
      status.dataset.state = 'pending';
      // Lock before asynchronous file reads so a second click cannot send twice.
      form.dataset.submitting = 'true';
      submit.disabled = true;
      submit.textContent = 'Preparing…';
      try {
        const payload = { name: String(fields.get('name') || '').trim(), email: String(fields.get('email') || '').trim(), website: String(fields.get('website') || '').trim() };
        if (!payload.name || !payload.email) throw new Error('Please enter your name and email address.');
        if (type === 'contact') {
          const message = String(fields.get('message') || '').trim();
          if (!message) throw new Error('Please tell us a little about your project.');
          const service = String(fields.get('service') || '').trim();
          payload.message = service ? `Interest: ${service}\n\n${message}` : message;
        } else {
          payload.expertise = String(fields.get('expertise') || '').trim();
          if (!payload.expertise) throw new Error('Please tell us about your expertise.');
          const file = fields.get('cv');
          if (file instanceof File && validateCareerFile(file)) {
            payload.filename = file.name;
            payload.fileBase64 = await fileBase64(file);
          }
        }
        payload.submissionId = submissionIds.forPayload(payload);
        submit.textContent = 'Sending…';
        status.textContent = 'Sending securely. This may take a moment.';
        await submitRequest(`/api/${type}`, payload);
        status.dataset.state = 'success';
        status.textContent = type === 'contact' ? 'Thanks for getting in touch. Your message has been sent to the Trasier team.' : 'Thanks for introducing yourself. Your details have been sent to the Trasier team.';
        form.reset();
        submissionIds.reset();
      } catch (error) {
        status.dataset.state = 'error';
        status.textContent = error.message;
      } finally {
        if (fieldset) fieldset.disabled = false;
        form.removeAttribute('aria-busy');
        submit.disabled = false;
        submit.innerHTML = originalLabel;
        form.dataset.submitting = 'false';
        // Restore keyboard position only if the visitor has not moved elsewhere.
        if (focusedControl && (!document.activeElement || document.activeElement === document.body)) {
          focusedControl.focus({ preventScroll: true });
        }
      }
    });
    // An unenhanced form stays disabled with a visible email fallback. Enable only
    // after its JSON submit handler is attached, so a module failure cannot leak a GET.
    if (fieldset) fieldset.disabled = false;
    if (fallback) fallback.hidden = true;
    form.dataset.enhanced = 'true';
  });
  // Optional enhancement: a loading failure never prevents navigation or readable content.
  import('./motion.js').then(({ initMotion }) => initMotion()).catch(() => {});
  import('./creative-buttons.js').then(({ initCreativeButtons }) => initCreativeButtons()).catch(() => {});
  if (document.querySelector('[data-signal-scene], [data-signal-story], [data-kinetic-strip]')) {
    import('./creative-motion.js').then(({ initCreativeMotion }) => initCreativeMotion()).catch(() => {});
  }
  if (document.querySelector('[data-depth-scene]')) {
    import('./depth-scenes.js').then(({ initDepthScenes }) => initDepthScenes()).catch(() => {});
  }
  if (document.querySelector('[data-company-scene]')) {
    initDeferredCompanyScene();
  }
  if (document.querySelector('[data-hero-motion]')) {
    import('./hero-motion.js').then(({ initHeroMotion }) => initHeroMotion()).catch(() => {});
  }
})();
