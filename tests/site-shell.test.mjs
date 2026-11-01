import test from 'node:test';
import assert from 'node:assert/strict';
import { renderHeader, renderFooter } from '../frontend/js/site-shell.js';

test('the generated shared shell includes usable navigation without executing browser JavaScript', () => {
  const header = renderHeader('home');
  assert.match(header, /class="skip-link" href="#main-content"/);
  assert.match(header, /<header[^>]*data-site-header/);
  assert.match(header, /<details class="mobile-menu"><summary[^>]*class="menu-toggle"/);
  assert.match(header, /<nav class="mobile-nav"[^>]*>[^]*href="\/contact\.html"/);
  assert.doesNotMatch(header, /<nav class="mobile-nav"[^>]*\bhidden/);
  assert.match(renderFooter(2026), /href="\/privacy-policy\.html"/);
  assert.match(renderFooter(2026), /href="\/account-deletion\.html"/);
});

test('navigation current-page state is generated for desktop and native mobile navigation', () => {
  const header = renderHeader('journal', '/blog.html');
  const matches = header.match(/href="\/blog\.html" data-active="true" aria-current="page"/g) || [];
  assert.equal(matches.length, 2);
  assert.match(renderHeader('home'), /Built in Nepal\. Designed for everyday life/);
  assert.match(renderHeader('company'), /Better roads start with a voice/);
});

test('category highlighting never announces a different destination as the current page', () => {
  const services = renderHeader('services', '/services/ai.html');
  assert.match(services, /href="\/#services" data-active="true"/);
  assert.doesNotMatch(services, /href="\/#services"[^>]*aria-current/);
  const careers = renderHeader('careers', '/careers.html');
  assert.match(careers, /href="\/company\.html" data-active="true"/);
  assert.doesNotMatch(careers, /href="\/company\.html"[^>]*aria-current/);
  assert.match(careers, /href="\/careers\.html" aria-current="page"/);
  const article = renderHeader('journal', '/blog/2026-10-29-new-website.html');
  assert.match(article, /href="\/blog\.html" data-active="true"/);
  assert.doesNotMatch(article, /aria-current="page"/);
});
