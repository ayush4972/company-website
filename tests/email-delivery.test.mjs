import test from 'node:test';
import assert from 'node:assert/strict';
import { deliverEmail } from '../backend/deliverEmail.js';

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
