import test from 'node:test';
import assert from 'node:assert/strict';
import { createMailer, emailReady } from '../src/haunt-mail.js';
const env = { HAUNT_EMAIL_PROVIDER: 'agentmail', HAUNT_AGENTMAIL_API_KEY: 'test-key', HAUNT_EMAIL_FROM: 'tribalkavalounge@agentmail.to' };
const message = { operationId: 'fixed-operation', email: 'jd@example.com', subject: 'Your tickets', text: 'Private ticket' };
test('AgentMail preserves recipient and uses the same idempotency key on retry', async () => {
  const requests = [];
  const mail = createMailer(env, async (url, options) => { requests.push({ url, ...options }); return { ok: true, json: async () => ({ message_id: 'message-1' }) }; });
  assert.deepEqual(await mail.send(message), { messageId: 'message-1' }); await mail.send(message);
  assert.equal(requests[0].headers['Idempotency-Key'], requests[1].headers['Idempotency-Key']);
  assert.deepEqual(JSON.parse(requests[0].body).to, ['jd@example.com']);
  assert.match(requests[0].url, /^https:\/\/api\.agentmail\.to\/v0\/inboxes\/tribalkavalounge%40agentmail\.to\/messages\/send$/);
});
test('AgentMail rejects missing credentials, unapproved sender, errors and ambiguous acceptance', async () => {
  for (const change of [{ HAUNT_AGENTMAIL_API_KEY: '' }, { HAUNT_EMAIL_FROM: 'other@agentmail.to' }, { HAUNT_EMAIL_PROVIDER: 'unknown' }]) assert.equal(emailReady({ ...env, ...change }), false);
  for (const response of [{ ok: false }, { ok: true, json: async () => ({}) }]) await assert.rejects(createMailer(env, async () => response).send(message));
});
