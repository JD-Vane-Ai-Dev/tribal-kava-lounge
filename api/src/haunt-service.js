import { EVENT, HauntError, token, equal, validateCart, makeOrder, verifyPaid, redeem, staffPrincipal } from './haunt-core.js';
import { createHash } from 'node:crypto';
import { emailReady } from './haunt-mail.js';

const PRODUCTION_ORIGIN = 'https://www.thetribalkavalounge.com';
export function paymentEnvironment(env) {
  const mode = env.HAUNT_PAYMENT_MODE;
  if (!['test', 'live'].includes(mode)) return null;
  const origin = env.HAUNT_PUBLIC_ORIGIN;
  try {
    const url = new URL(origin);
    if (url.origin !== origin || url.protocol !== 'https:') return null;
    if (mode === 'live' ? origin !== PRODUCTION_ORIGIN : !url.hostname.endsWith('.azurestaticapps.net')) return null;
  } catch { return null; }
  if (!new RegExp(`^(sk|rk)_${mode}_`).test(env.STRIPE_SECRET_KEY || '') || !String(env.STRIPE_PUBLISHABLE_KEY || '').startsWith(`pk_${mode}_`)) return null;
  return { mode, origin, table: mode === 'live' ? 'HauntedTribeOrders' : 'HauntedTribeTestOrders' };
}
const hash = s => createHash('sha256').update(s).digest('hex');
export const nameKey = name => hash(name.trim().toLowerCase().replace(/\s+/g, ' '));
export function createService({ store, stripe, mail, qr, env, now = () => Date.now() }) {
  const ready = () => env.HAUNT_PAYMENTS_ENABLED === 'true' && paymentEnvironment(env) && emailReady(env) && ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET', 'HAUNT_STORAGE_CONNECTION_STRING', 'HAUNT_TOKEN_SECRET'].every(k => env[k]) && env.HAUNT_TOKEN_SECRET.length >= 32;
  const origin = () => { const config = paymentEnvironment(env); if (!config) throw new HauntError('Ticket environment is not configured.', 503); return config.origin; };
  const checkMode = object => { const config = paymentEnvironment(env); if (!config || object.livemode !== (config.mode === 'live')) throw new HauntError('Payment environment does not match.', 409); };
  // Static Web Apps reserves Authorization for its own backend authentication.
  const buyerAccess = req => req.headers.get('x-haunt-ticket-token') || '';
  const requireStaff = req => {
    const p = staffPrincipal(req.headers.get('x-ms-client-principal'));
    if (!p) throw new HauntError('Staff sign-in required.', 403);
    return p;
  };
  async function mutate(id, operation) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const { order, etag } = await store.get(id);
      operation(order);
      try { await store.replace(order, etag); return order; }
      catch (error) { if (error.statusCode !== 412) throw error; }
    }
    throw new HauntError('Another staff member updated this ticket. Refresh and try again.', 409);
  }
  async function reconcile(id) {
    let { order } = await store.get(id);
    if (!order.paymentIntent) return order;
    const pi = await stripe.paymentIntents.retrieve(order.paymentIntent);
    checkMode(pi);
    if (pi.status === 'succeeded') {
      verifyPaid(order, pi);
      // Refund/dispute invalidation is sticky; delayed success events cannot restore entry.
      if (order.status === 'pending') order = await mutate(id, o => { if (o.status === 'pending') o.status = 'paid'; });
    }
    return order;
  }
  async function sendReceipt(order) {
    if (order.status !== 'paid' || order.emailAcceptedAt || order.emailSent) return;
    // Persist the first attempt before sending. AgentMail retains idempotency keys for
    // 24 hours; uncertain deliveries beyond that window need reconciliation, not resend.
    if (env.HAUNT_EMAIL_PROVIDER === 'agentmail') {
      order = await mutate(order.id, o => {
        if (!o.emailAttemptedAt) o.emailAttemptedAt = new Date(now()).toISOString();
      });
      if (order.emailAcceptedAt || order.emailSent) return;
      if (now() - Date.parse(order.emailAttemptedAt) >= 23 * 60 * 60 * 1000) throw new Error('Email delivery requires reconciliation');
    }
    // Deterministic provider operation ID protects concurrent webhook deliveries.
    const h = hash(order.id); const operationId = `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;
    const url = `${origin()}/haunted-tribe/tickets/#${order.id}.${token(env.HAUNT_TOKEN_SECRET, order.id)}`;
    const test = env.HAUNT_PAYMENT_MODE === 'test';
    const subject = `${test ? '[TEST — NOT VALID FOR ADMISSION] ' : ''}Your Haunted Tribe tickets`;
    // A transactional receipt: event details and private access, without promotional copy.
    const text = `${test ? 'This is a test purchase. These tickets are not valid for admission.' : 'Your payment is confirmed.'}\n\nOpen your tickets: ${url}\n\nOrder: ${order.id}\nAdmissions: ${order.tickets.length}\nFriday, October 30, 2026: 7–10 PM or 10:30 PM–1:30 AM Eastern.\nOne walkthrough per ticket.\n770 S Military Trail, West Palm Beach, FL 33415.\n\nKeep this private link safe. Show your ticket QR code at check-in. Your ticket page contains your purchased items and event details.`;
    let acceptance;
    try {
      acceptance = await mail.send({ operationId, email: order.email, subject, text });
    } catch (error) {
      await mutate(order.id, o => {
        o.emailStatus = 'submission_failed';
        o.emailOperationId = operationId;
      });
      throw error; // Let Stripe retry; an email error never changes paid entitlements.
    }
    await mutate(order.id, o => {
      o.emailStatus = 'accepted';
      o.emailOperationId = operationId;
      o.emailProvider = env.HAUNT_EMAIL_PROVIDER || 'acs';
      if (acceptance?.messageId) o.emailMessageId = acceptance.messageId;
      o.emailAcceptedAt = new Date(now()).toISOString();
      // Provider acceptance is NOT recipient delivery; verify in the receiving mailbox.
    });
  }
  async function publicOrder(order) {
    return { id: order.id, name: order.name, status: order.status, amount: order.amount, shirts: order.shirts,
      tickets: order.status === 'paid' ? await Promise.all(order.tickets.map(async t => ({ kind: t.kind, index: t.index, ...(t.size ? { size: t.size } : {}),
        admission: Boolean(t.admission),
        code: `${order.id}.${t.index}.${token(env.HAUNT_TOKEN_SECRET, order.id, `ticket:${t.index}`)}`,
        qr: await qr(`${origin()}/haunted-tribe/staff/#${order.id}.${t.index}.${token(env.HAUNT_TOKEN_SECRET, order.id, `ticket:${t.index}`)}`)
      }))) : [] };
  }
  function parseTicket(code) {
    const [id, index, signature, extra] = String(code || '').split('.');
    if (extra || !/^[a-f0-9]{36}$/.test(id || '') || !/^\d{1,2}$/.test(index || '') || !equal(signature, token(env.HAUNT_TOKEN_SECRET, id, `ticket:${index}`))) throw new HauntError('Ticket code not recognized.', 404);
    return { id, index: Number(index) };
  }
  return {
    async config() { return { enabled: Boolean(ready() && now() < Date.parse('2026-10-30T19:00:00-04:00')), publishableKey: ready() ? env.STRIPE_PUBLISHABLE_KEY : null }; },
    async checkout(input) {
      if (!ready()) throw new HauntError('Online presale is not open yet. Please check back soon.', 503);
      const cart = validateCart(input, now());
      if (!/^[a-f0-9-]{36}$/.test(input.requestId || '')) throw new HauntError('Refresh the checkout and try again.');
      const id = hash(`${EVENT}:${env.HAUNT_PAYMENT_MODE}:${input.requestId}`).slice(0, 36);
      let order = makeOrder(cart, id);
      const fingerprint = hash(JSON.stringify(cart)); order.fingerprint = fingerprint;
      try { await store.create(order); }
      catch (e) {
        if (e.statusCode !== 409) throw e;
        order = (await store.get(id)).order;
        if (order.fingerprint !== fingerprint) throw new HauntError('Your cart changed. Start a new checkout.', 409);
      }
      const pi = order.paymentIntent ? await stripe.paymentIntents.retrieve(order.paymentIntent) : await stripe.paymentIntents.create({
        amount: cart.amount, currency: 'usd', automatic_payment_methods: { enabled: true }, receipt_email: cart.email,
        description: 'Haunted House Entry — The Haunted Tribe',
        metadata: { event: EVENT, haunt_order: id }
      }, { idempotencyKey: `${EVENT}:${id}` });
      checkMode(pi);
      await mutate(id, o => { o.paymentIntent = pi.id; });
      return { orderId: id, accessToken: token(env.HAUNT_TOKEN_SECRET, id), clientSecret: pi.client_secret, amount: cart.amount };
    },
    async order(req, id) {
      if (!/^[a-f0-9]{36}$/.test(id) || !equal(buyerAccess(req), token(env.HAUNT_TOKEN_SECRET, id))) throw new HauntError('Ticket access link not recognized.', 403);
      const order = await reconcile(id);
      return publicOrder(order);
    },
    async webhook(raw, signature) {
      let event;
      try { event = stripe.webhooks.constructEvent(raw, signature, env.STRIPE_WEBHOOK_SECRET); }
      catch { throw new HauntError('Invalid webhook signature.', 400); }
      checkMode(event);
      const object = event.data.object;
      if (event.type === 'payment_intent.succeeded' && object.metadata?.event === EVENT) {
        const order = await reconcile(object.metadata.haunt_order);
        await sendReceipt(order);
      }
      if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created') {
        let intentId = object.payment_intent;
        if (!intentId && object.charge) intentId = (await stripe.charges.retrieve(object.charge)).payment_intent;
        if (intentId) {
          const pi = await stripe.paymentIntents.retrieve(intentId);
          if (pi.metadata?.event === EVENT) await mutate(pi.metadata.haunt_order, o => { o.status = 'review'; });
        }
      }
      return { received: true };
    },
    async staffLookup(req, input) {
      requireStaff(req);
      if (input.code) {
        const { id, index } = parseTicket(input.code);
        const order = await reconcile(id);
        if (!order.tickets[index]) throw new HauntError('Ticket not found.', 404);
        return { orders: [await publicOrder(order)], selectedIndex: index };
      }
      const query = String(input.query || '').trim();
      if (query.length < 2 || query.length > 120) throw new HauntError('Enter the buyer’s full name or order number.');
      const orders = /^[a-f0-9]{36}$/.test(query) ? [(await store.get(query)).order] : await store.byName(nameKey(query));
      return { orders: await Promise.all(orders.map(publicOrder)) };
    },
    async staffRedeem(req, input) {
      const staff = requireStaff(req); const { id, index } = parseTicket(input.code);
      await reconcile(id);
      const order = await mutate(id, o => redeem(o, index, input.perk, staff.userId, now()));
      return publicOrder(order);
    }
  };
}
