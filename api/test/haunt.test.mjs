import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { EVENT, START, BREAK, RESUME, END, validateCart, makeOrder, redeem, verifyPaid, token } from '../src/haunt-core.js';
import { createService, paymentEnvironment } from '../src/haunt-service.js';

const input = { adult: 2, child: 2, shirts: ['S', 'XL'], name: 'JD Harris', email: 'jd@example.com', accepted: true, requestId: 'abcdef12-1234-1234-1234-123456789012' };
const cart = () => validateCart(input, START - 1000);
const order = () => ({ ...makeOrder(cart(), 'a'.repeat(36)), status: 'paid', paymentIntent: 'pi_test' });
const paid = o => ({ id: 'pi_test', status: 'succeeded', amount: o.amount, amount_received: o.amount, currency: 'usd', metadata: { event: EVENT, haunt_order: o.id } });
test('server computes price and one admission for each shirt', () => { assert.equal(cart().amount, 8000); assert.equal(order().tickets.length, 6); assert.deepEqual(order().shirts, ['S', 'XL']); });
test('client amount and perk claims do not change trusted prices', () => { assert.equal(validateCart({ ...input, amount: 1, bogo: true }, START - 1).amount, 8000); });
test('rejects fractional, negative, oversized and empty quantities', () => { for (const adult of [-1, .5, 21, '2']) assert.throws(() => validateCart({ ...input, adult }, START - 1)); assert.throws(() => validateCart({ ...input, adult: 0, child: 0, shirts: [] }, START - 1)); });
test('each shirt needs a supported S–XL size', () => { for (const size of ['', 'XXL', '3XL', 'XS']) assert.throws(() => validateCart({ ...input, shirts: [size] }, START - 1)); });
test('requires name, email and explicit terms acceptance', () => { for (const change of [{ name: '' }, { email: 'bad' }, { accepted: false }]) assert.throws(() => validateCart({ ...input, ...change }, START - 1)); });
test('presale closes exactly at 7 PM Eastern', () => { assert.doesNotThrow(() => validateCart(input, START - 1)); assert.throws(() => validateCart(input, START)); });
test('both entry windows work, break and out of hours do not', () => { for (const time of [START, BREAK - 1, RESUME, END - 1]) assert.doesNotThrow(() => redeem(order(), 0, 'admission', 'staff', time)); for (const time of [START - 1, BREAK, RESUME - 1, END]) assert.throws(() => redeem(order(), 0, 'admission', 'staff', time)); });
test('one walkthrough total across both windows', () => { const o = order(); redeem(o, 0, 'admission', 'staff', START); assert.throws(() => redeem(o, 0, 'admission', 'staff', RESUME), /Already/); });
test('unpaid or refunded tickets cannot be admitted', () => { for (const status of ['pending', 'review']) assert.throws(() => redeem({ ...order(), status }, 0, 'admission', 'staff', START)); });
test('payment verification requires matching amount, intent, event, currency and paid state', () => { const o = order(); assert.doesNotThrow(() => verifyPaid(o, paid(o))); for (const change of [{ amount: 1 }, { amount_received: 1 }, { status: 'processing' }, { id: 'pi_other' }, { currency: 'eur' }, { metadata: { event: 'other', haunt_order: o.id } }]) assert.throws(() => verifyPaid(o, { ...paid(o), ...change })); });

function harness(send) {
  const rows = new Map(); const intents = new Map(); const sent = [];
  const env = Object.fromEntries(['STRIPE_SECRET_KEY','STRIPE_PUBLISHABLE_KEY','STRIPE_WEBHOOK_SECRET','HAUNT_STORAGE_CONNECTION_STRING','HAUNT_EMAIL_CONNECTION_STRING','HAUNT_EMAIL_FROM'].map(k => [k, 'configured']));
  env.HAUNT_PAYMENT_MODE = 'test'; env.HAUNT_PUBLIC_ORIGIN = 'https://haunt-test.azurestaticapps.net'; env.STRIPE_SECRET_KEY = 'rk_test_fake'; env.STRIPE_PUBLISHABLE_KEY = 'pk_test_fake'; env.HAUNT_PAYMENTS_ENABLED = 'true'; env.HAUNT_TOKEN_SECRET = 'secret'.repeat(8); env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  let time = START - 1; let creates = 0;
  const conflict = () => Object.assign(new Error('conflict'), { statusCode: 412 });
  const store = {
    async create(o) { if (rows.has(o.id)) throw Object.assign(new Error(), { statusCode: 409 }); rows.set(o.id, { order: structuredClone(o), etag: 1 }); },
    async get(id) { if (!rows.has(id)) throw Object.assign(new Error(), { statusCode: 404 }); return structuredClone(rows.get(id)); },
    async replace(o, etag) { if (rows.get(o.id).etag !== etag) throw conflict(); rows.set(o.id, { order: structuredClone(o), etag: etag + 1 }); },
    async byName() { return [...rows.values()].map(r => structuredClone(r.order)); }
  };
  const sdk = new Stripe('sk_test_fake');
  const stripe = { webhooks: sdk.webhooks, paymentIntents: {
    async create(p, options) { creates++; const pi = { ...p, livemode: false, id: 'pi_test', status: 'requires_payment_method', amount_received: 0, client_secret: 'pi_secret' }; intents.set(pi.id, pi); assert.match(options.idempotencyKey, /^haunted-tribe-2026:/); return pi; },
    async retrieve(id) { return intents.get(id); }
  } };
  const service = createService({ store, stripe, env, now: () => time, qr: async text => text, mail: { send: send || (async m => sent.push(m)) } });
  const req = (access, staff) => ({ headers: new Headers({ ...(access ? { 'x-haunt-ticket-token': access } : {}), ...(staff ? { 'x-ms-client-principal': Buffer.from(JSON.stringify({ userId: 'staff1', userRoles: ['haunted-staff'] })).toString('base64') } : {}) }) });
  const settle = () => { const pi = intents.get('pi_test'); pi.status = 'succeeded'; pi.amount_received = pi.amount; };
  const webhook = async (type, object) => { const raw = JSON.stringify({ id: 'evt_test', livemode: false, type, data: { object } }); const signature = sdk.webhooks.generateTestHeaderString({ payload: raw, secret: env.STRIPE_WEBHOOK_SECRET }); return service.webhook(raw, signature); };
  return { rows, intents, sent, env, service, req, settle, webhook, setTime: t => time = t, creates: () => creates };
}
test('checkout fails closed until all activation settings exist', async () => { const h = harness(); delete h.env.HAUNT_EMAIL_FROM; assert.equal((await h.service.config()).enabled, false); await assert.rejects(h.service.checkout(input), /not open/); });
test('retry reuses existing intent and rejects changed cart', async () => { const h = harness(); const a = await h.service.checkout(input); const b = await h.service.checkout(input); assert.equal(a.orderId, b.orderId); assert.equal(h.creates(), 1); await assert.rejects(h.service.checkout({ ...input, adult: 1 }), /cart changed/); });
test('ticket retrieval rejects wrong token and never issues unpaid tickets', async () => { const h = harness(); const a = await h.service.checkout(input); await assert.rejects(h.service.order(h.req('bad'), a.orderId), /access/); const o = await h.service.order(h.req(a.accessToken), a.orderId); assert.equal(o.tickets.length, 0); h.settle(); assert.equal((await h.service.order(h.req(a.accessToken), a.orderId)).tickets.length, 6); });
test('signed webhook issues confirmation and duplicate delivery does not resend', async () => { const h = harness(); await h.service.checkout(input); h.settle(); await h.webhook('payment_intent.succeeded', h.intents.get('pi_test')); await h.webhook('payment_intent.succeeded', h.intents.get('pi_test')); assert.equal(h.sent.length, 1); assert.match(h.sent[0].text, /tickets\/#/); });
test('invalid signature has no fulfillment side effects', async () => { const h = harness(); const a = await h.service.checkout(input); await assert.rejects(h.service.webhook('{}', 'bad'), /signature/); assert.equal(h.rows.get(a.orderId).order.status, 'pending'); });
test('staff role required even with a valid ticket code', async () => { const h = harness(); const a = await h.service.checkout(input); h.settle(); const o = await h.service.order(h.req(a.accessToken), a.orderId); await assert.rejects(h.service.staffLookup(h.req(), { code: o.tickets[0].code }), /sign-in/); await assert.rejects(h.service.staffRedeem(h.req(), { code: o.tickets[0].code, perk: 'admission' }), /sign-in/); });
test('forged ticket signature is rejected', async () => { const h = harness(); await assert.rejects(h.service.staffLookup(h.req(null, true), { code: `${'a'.repeat(36)}.0.forged` }), /not recognized/); });
test('concurrent admission requests succeed exactly once', async () => { const h = harness(); const a = await h.service.checkout(input); h.settle(); h.setTime(START); const o = await h.service.order(h.req(a.accessToken), a.orderId); const results = await Promise.allSettled([1, 2].map(() => h.service.staffRedeem(h.req(null, true), { code: o.tickets[0].code, perk: 'admission' }))); assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); });
test('refund review is sticky after delayed payment success', async () => { const h = harness(); const a = await h.service.checkout(input); h.settle(); await h.webhook('charge.refunded', { payment_intent: 'pi_test' }); await h.webhook('payment_intent.succeeded', h.intents.get('pi_test')); const o = await h.service.order(h.req(a.accessToken), a.orderId); assert.equal(o.status, 'review'); assert.equal(o.tickets.length, 0); });
test('per-ticket signatures are distinct from buyer access', () => { const secret = 's'.repeat(32); assert.notEqual(token(secret, 'a', 'ticket:0'), token(secret, 'a')); assert.notEqual(token(secret, 'a', 'ticket:0'), token(secret, 'a', 'ticket:1')); });

test('test receipts and QR links stay on the preview and test orders use a separate table', async () => {
  const h = harness(); const a = await h.service.checkout(input); h.settle();
  await h.webhook('payment_intent.succeeded', h.intents.get('pi_test'));
  assert.match(h.sent[0].subject, /TEST/);
  assert.ok(h.sent[0].text.includes(`${h.env.HAUNT_PUBLIC_ORIGIN}/haunted-tribe/tickets/#${a.orderId}.${a.accessToken}`));
  const result = await h.service.order(h.req(a.accessToken), a.orderId);
  assert.ok(result.tickets[0].qr.startsWith(`${h.env.HAUNT_PUBLIC_ORIGIN}/haunted-tribe/staff/#`));
  assert.equal(paymentEnvironment(h.env).table, 'HauntedTribeTestOrders');
});
test('mixed keys, wrong origins and missing mode fail closed', async () => {
  for (const change of [{ STRIPE_SECRET_KEY: 'sk_live_fake' }, { STRIPE_PUBLISHABLE_KEY: 'pk_live_fake' }, { HAUNT_PAYMENT_MODE: '' }, { HAUNT_PUBLIC_ORIGIN: 'https://www.thetribalkavalounge.com' }, { HAUNT_PUBLIC_ORIGIN: 'https://evil.example' }, { HAUNT_PUBLIC_ORIGIN: 'https://haunt-test.azurestaticapps.net/path' }]) {
    const h = harness(); Object.assign(h.env, change);
    assert.equal((await h.service.config()).enabled, false);
    await assert.rejects(h.service.checkout(input), /not open/);
  }
  const h = harness(); Object.assign(h.env, { HAUNT_PAYMENT_MODE: 'live', STRIPE_SECRET_KEY: 'rk_live_fake', STRIPE_PUBLISHABLE_KEY: 'pk_live_fake', HAUNT_PUBLIC_ORIGIN: 'https://www.thetribalkavalounge.com' });
  assert.equal(paymentEnvironment(h.env).table, 'HauntedTribeOrders');
  h.env.HAUNT_PUBLIC_ORIGIN = 'https://haunt-test.azurestaticapps.net';
  assert.equal(paymentEnvironment(h.env), null);
});
test('wrong-mode payment cannot issue tickets or send email', async () => {
  const h = harness(); const a = await h.service.checkout(input); h.settle(); h.intents.get('pi_test').livemode = true;
  await assert.rejects(h.service.order(h.req(a.accessToken), a.orderId), /environment/);
  await assert.rejects(h.webhook('payment_intent.succeeded', h.intents.get('pi_test')), /environment/);
  assert.equal(h.sent.length, 0); assert.equal(h.rows.get(a.orderId).order.status, 'pending');
});
test('correctly signed wrong-mode webhook is rejected', async () => {
  const h = harness(); const raw = JSON.stringify({ livemode: true, type: 'charge.refunded', data: { object: {} } });
  const signature = new Stripe('sk_test_fake').webhooks.generateTestHeaderString({ payload: raw, secret: h.env.STRIPE_WEBHOOK_SECRET });
  await assert.rejects(h.service.webhook(raw, signature), /environment/);
});


test('buyer capability survives platform Authorization replacement and remains mandatory', async () => {
  const h = harness(); const a = await h.service.checkout(input); h.settle();
  const req = h.req(a.accessToken);
  req.headers.set('authorization', 'Bearer platform-internal-token');
  assert.equal((await h.service.order(req, a.orderId)).tickets.length, 6);
  req.headers.delete('x-haunt-ticket-token');
  req.headers.set('authorization', `Bearer ${a.accessToken}`);
  await assert.rejects(h.service.order(req, a.orderId), /access/);
  req.headers.set('x-haunt-ticket-token', 'forged');
  await assert.rejects(h.service.order(req, a.orderId), /access/);
});


test('provider acceptance is recorded separately from delivery, without ticket tokens in email metadata', async () => {
  const h = harness(); const a = await h.service.checkout(input); h.settle();
  await h.webhook('payment_intent.succeeded', h.intents.get('pi_test'));
  const o = h.rows.get(a.orderId).order;
  assert.equal(o.emailStatus, 'accepted'); assert.ok(o.emailAcceptedAt);
  assert.match(o.emailOperationId, /^[a-f0-9-]{36}$/);
  assert.equal(o.emailSent, undefined); assert.equal(o.emailDeliveredAt, undefined);
  assert.match(h.sent[0].text, /not valid for admission/);
});
test('submission failure preserves paid tickets and retry uses the same operation id', async () => {
  const attempts = []; let fail = true;
  const h = harness(async m => { attempts.push(m); if (fail) throw new Error('provider unavailable'); });
  const a = await h.service.checkout(input); h.settle();
  await assert.rejects(h.webhook('payment_intent.succeeded', h.intents.get('pi_test')), /provider unavailable/);
  assert.equal(h.rows.get(a.orderId).order.emailStatus, 'submission_failed');
  assert.equal((await h.service.order(h.req(a.accessToken), a.orderId)).tickets.length, 6);
  fail = false; await h.webhook('payment_intent.succeeded', h.intents.get('pi_test'));
  await h.webhook('payment_intent.succeeded', h.intents.get('pi_test'));
  assert.equal(attempts.length, 2); assert.equal(attempts[0].operationId, attempts[1].operationId);
  assert.equal(h.rows.get(a.orderId).order.emailStatus, 'accepted');
});
test('declined, canceled and processing intents cannot issue email or tickets even on a signed success event', async () => {
  for (const status of ['requires_payment_method', 'canceled', 'processing']) {
    const h = harness(); const a = await h.service.checkout(input); h.intents.get('pi_test').status = status;
    await h.webhook('payment_intent.succeeded', h.intents.get('pi_test'));
    assert.equal(h.sent.length, 0);
    assert.equal((await h.service.order(h.req(a.accessToken), a.orderId)).tickets.length, 0);
  }
});
test('legacy provider-accepted orders are not blindly resent or reclassified as delivered', async () => {
  const h = harness(); const a = await h.service.checkout(input); h.settle();
  h.rows.get(a.orderId).order.emailSent = true;
  await h.webhook('payment_intent.succeeded', h.intents.get('pi_test'));
  assert.equal(h.sent.length, 0); assert.equal(h.rows.get(a.orderId).order.emailDeliveredAt, undefined);
});


test('new tickets have admission only and all ticket types reject removed drink redemptions', () => {
  const o = order();
  for (const t of o.tickets) {
    assert.equal(Object.hasOwn(t, 'shell'), false); assert.equal(Object.hasOwn(t, 'bogo'), false);
    for (const perk of ['shell', 'bogo']) assert.throws(() => redeem(o, t.index, perk, 'staff', START), /Invalid/);
  }
});
test('legacy test-order drink fields are neither exposed nor redeemable', async () => {
  const h = harness(); const a = await h.service.checkout(input); h.settle(); h.setTime(START);
  for (const t of h.rows.get(a.orderId).order.tickets) Object.assign(t, { shell: null, bogo: null });
  const result = await h.service.order(h.req(a.accessToken), a.orderId);
  for (const t of result.tickets) {
    assert.equal(Object.hasOwn(t, 'shell'), false); assert.equal(Object.hasOwn(t, 'bogo'), false);
    for (const perk of ['shell', 'bogo']) await assert.rejects(h.service.staffRedeem(h.req(null, true), { code: t.code, perk }), /Invalid/);
  }
});

test('AgentMail records provider acceptance and prevents retry beyond provider deduplication window', async () => {
  const h = harness(); Object.assign(h.env, { HAUNT_EMAIL_PROVIDER: 'agentmail', HAUNT_AGENTMAIL_API_KEY: 'test-key', HAUNT_EMAIL_FROM: 'tribalkavalounge@agentmail.to' });
  delete h.env.HAUNT_EMAIL_CONNECTION_STRING;
  assert.equal((await h.service.config()).enabled, true);
  const a = await h.service.checkout(input); h.settle();
  await h.webhook('payment_intent.succeeded', h.intents.get('pi_test'));
  const o = h.rows.get(a.orderId).order;
  assert.ok(o.emailAttemptedAt); assert.equal(o.emailProvider, 'agentmail');
  delete o.emailAcceptedAt; h.setTime(START + 24 * 60 * 60 * 1000);
  await assert.rejects(h.webhook('payment_intent.succeeded', h.intents.get('pi_test')), /reconciliation/);
  assert.equal(h.sent.length, 1);
});
