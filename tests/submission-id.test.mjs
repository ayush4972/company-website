import test from 'node:test';
import assert from 'node:assert/strict';
import { createSubmissionIds } from '../frontend/js/submission-id.js';

test('a lost-response retry reuses the identity of the unchanged message', () => {
  let count = 0;
  const submissions = createSubmissionIds(() => `request-${++count}`);
  const first = submissions.forPayload({ name: 'Test', email: 'test@example.com', website: '', message: 'Hello' });
  const retry = submissions.forPayload({ name: 'Test', email: 'test@example.com', website: '', message: 'Hello' });
  assert.equal(first, retry);
  assert.equal(count, 1);
  assert.notEqual(submissions.forPayload({ name: 'Test', email: 'test@example.com', website: '', message: 'Changed message' }), first);
});

test('changed CV content receives a new identity even when its filename is unchanged', () => {
  let count = 0;
  const submissions = createSubmissionIds(() => `request-${++count}`);
  const application = { name: 'Test', email: 'test@example.com', expertise: 'Engineering', filename: 'cv.pdf', fileBase64: 'first' };
  assert.notEqual(submissions.forPayload(application), submissions.forPayload({ ...application, fileBase64: 'updated' }));
});

test('a confirmed submission is followed by a new identity even if its content is repeated', () => {
  let count = 0;
  const submissions = createSubmissionIds(() => `request-${++count}`);
  const first = submissions.forPayload({ message: 'Hello' });
  submissions.reset();
  assert.notEqual(submissions.forPayload({ message: 'Hello' }), first);
});

test('browser-generated submission identities are UUIDs', () => {
  const value = createSubmissionIds().forPayload({ message: 'Test only; never sent' });
  assert.match(value, /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i);
});
