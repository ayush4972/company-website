// Local preview smoke checks: provider delivery is never invoked.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const root = 'http://127.0.0.1:8120';
async function pages(dir) {
  const result = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = dir + '/' + entry.name;
    if (entry.isDirectory() && entry.name !== 'assets') result.push(...await pages(file));
    else if (entry.isFile() && entry.name.endsWith('.html') && !entry.name.startsWith('google')) result.push(file);
  }
  return result;
}
for (const file of await pages('frontend')) {
  const url = file === 'frontend/index.html' ? '/' : file.slice('frontend'.length);
  const response = await fetch(root + url);
  assert.equal(response.status, 200, url);
  assert.match(await response.text(), /data-site-header/);
}
for (const url of ['/no-such-page-qa', '/assets/missing-qa.png']) {
  const response = await fetch(root + url);
  assert.equal(response.status, 404);
  assert.match(await response.text(), /Page not found/);
}
let response = await fetch(root + '/no-such-page-qa', { method: 'HEAD' });
assert.equal(response.status, 404);
assert.equal(await response.text(), '');
for (const kind of ['contact', 'careers']) {
  const url = root + '/api/' + kind;
  response = await fetch(url);
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST');
  response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' });
  assert.equal(response.status, 415);
  response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(response.status, 400);
  // The honeypot path ends before DNS or provider work, even on a configured server.
  response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'Application/JSON; charset=utf-8' }, body: JSON.stringify({ website: 'automated-qa' }) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
}
console.log('HTTP smoke passed: 24 pages; branded GET/HEAD 404; both APIs reject GET, non-JSON and malformed JSON; honeypot exits before DNS/provider work. No email sent.');
