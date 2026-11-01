import test from 'node:test';
import assert from 'node:assert/strict';
import { deliverEmail } from '../backend/deliverEmail.js';
import { sendContactEmail, sendCareersEmail } from '../backend/mailer.js';

test('accepts a confirmed provider message ID', async () => {
  const message = { subject: 'Test only' };
  const client = { emails: { send: async received => { assert.equal(received, message); return { data: { id: 'test-id' }, error: null }; } } };
  assert.deepEqual(await deliverEmail(client, message), { id: 'test-id' });
});
test('rejects a resolved provider error rather than displaying false success', async () => {
  const client = { emails: { send: async () => ({ data: null, error: { message: 'Sender is not verified' } }) } };
  await assert.rejects(deliverEmail(client, {}), /Sender is not verified/);
});
test('rejects an unconfirmed provider response', async () => {
  const client = { emails: { send: async () => ({ data: null, error: null }) } };
  await assert.rejects(deliverEmail(client, {}), /did not confirm/);
});

test('passes provider idempotency options separately from email content', async () => {
  const message = { subject: 'Test only' };
  const options = { idempotencyKey: 'website/contact/test-only-hash' };
  const client = { emails: { send: async (received, receivedOptions) => {
    assert.equal(received, message);
    assert.equal(receivedOptions, options);
    return { data: { id: 'test-id' }, error: null };
  } } };
  assert.deepEqual(await deliverEmail(client, message, options), { id: 'test-id' });
});

test('installed Resend SDK serializes the verified sender, escaped content, and idempotency header (fetch mocked)', async () => {
  const originalFetch = globalThis.fetch;
  const previousKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.RESEND_FROM;
  const calls = [];
  try {
    // Dummy example-domain configuration belongs only to this isolated test.
    process.env.RESEND_API_KEY = 're_qa_never_sent';
    process.env.RESEND_FROM = 'QA Test <qa@example.com>';
    globalThis.fetch = async (url, options) => {
      assert.equal(String(url), 'https://api.resend.com/emails');
      calls.push({ headers: new Headers(options.headers), body: JSON.parse(options.body) });
      return new Response(JSON.stringify({ id: 'qa-mocked-message' }), { status: 200, headers: { 'content-type': 'application/json' } });
    };
    await sendContactEmail({ name: '<b>QA</b>', email: 'visitor@example.com', message: '<script>not HTML</script>\nSecond line' }, { idempotencyKey: 'website/contact/qa-only' });
    await sendCareersEmail({ name: 'QA', email: 'visitor@example.com', expertise: '<em>Example</em>', filename: 'resume.pdf', fileBase64: 'YQ==' }, { idempotencyKey: 'website/careers/qa-only' });
    assert.equal(calls.length, 2);
    assert.equal(calls[0].headers.get('idempotency-key'), 'website/contact/qa-only');
    assert.equal(calls[1].headers.get('idempotency-key'), 'website/careers/qa-only');
    assert.equal(calls[0].body.from, 'QA Test <qa@example.com>');
    assert.equal(calls[0].body.to, 'info@trasiertech.com.np');
    assert.equal(calls[0].body.reply_to, 'visitor@example.com');
    assert.match(calls[0].body.html, /&lt;b&gt;QA&lt;\/b&gt;/);
    assert.match(calls[0].body.html, /&lt;script&gt;not HTML&lt;\/script&gt;<br \/>Second line/);
    assert.match(calls[1].body.html, /&lt;em&gt;Example&lt;\/em&gt;/);
    assert.deepEqual(calls[1].body.attachments, [{ filename: 'resume.pdf', content: 'YQ==' }]);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previousKey;
    if (previousFrom === undefined) delete process.env.RESEND_FROM; else process.env.RESEND_FROM = previousFrom;
  }
});
