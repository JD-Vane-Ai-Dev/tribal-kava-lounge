import { EVENT, HauntError, token, equal, validateCart, makeOrder, verifyPaid, redeem, staffPrincipal } from './haunt-core.js';
import { createHash } from 'node:crypto';

const ORIGIN = 'https://www.thetribalkavalounge.com';
const hash = s => createHash('sha256').update(s).digest('hex');
export const nameKey = name => hash(name.trim().toLowerCase().replace(/\s+/g, ' '));
export function createService({ store, stripe, mail, qr, env, now = () => Date.now() }) {
  const ready = () => env.HAUNT_PAYMENTS_ENABLED === 'true' && ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET', 'HAUNT_STORAGE_CONNECTION_STRING', 'HAUNT_TOKEN_SECRET', 'HAUNT_EMAIL_CONNECTION_STRING', 'HAUNT_EMAIL_FROM'].every(k => env[k]) && env.HAUNT_TOKEN_SECRET.length >= 32;
  const bearer = req => (req.headers.get('authorization') || '').replace(/^Bearer /, '');
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
    if (pi.status === 'succeeded') {
      verifyPaid(order, pi);
      // Refund/dispute invalidation is sticky; delayed success events cannot restore entry.
      if (order.status === 'pending') order = await mutate(id, o => { if (o.status === 'pending') o.status = 'paid'; });
    }
    return order;
  }
  async function sendReceipt(order) {
    if (order.status !== 'paid' || order.emailSent) return;
    // Deterministic ACS operation ID makes retries safe across concurrent webhook deliveries.
    const h = hash(order.id); const operationId = `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;
    const url = `${ORIGIN}/haunted-tribe/tickets/#${order.id}.${token(env.HAUNT_TOKEN_SECRET, order.id)}`;
    await mail.send({ operationId, email: order.email, subject: 'Your Haunted Tribe tickets', text: `Your payment is confirmed.\n\nOpen your tickets: ${url}\n\nOrder: ${order.id}\nAdmissions: ${order.tickets.length}\nFriday, October 30: 7–10 PM or 10:30 PM–1:30 AM. One walkthrough per ticket.\n770 S Military Trail, West Palm Beach, FL 33415. Free parking.\nBring your ticket QR code. Shirt bundles: one kava/tea BOGO redemption, 9 PM–midnight. You do not need to wear the shirt that night. Wear it on future visits for 15% off drink tabs through December 31.\nFlashing lights and strobes. Kids ages 5–12: admission only.\nSales are final except organizer-caused cancellation or failure to provide purchased admission/item.` });
    await mutate(order.id, o => { o.emailSent = true; });
  }
  async function publicOrder(order) {
    return { id: order.id, name: order.name, status: order.status, amount: order.amount, shirts: order.shirts,
      tickets: order.status === 'paid' ? await Promise.all(order.tickets.map(async t => ({ ...t,
        admission: Boolean(t.admission), shell: Boolean(t.shell), bogo: Boolean(t.bogo),
        code: `${order.id}.${t.index}.${token(env.HAUNT_TOKEN_SECRET, order.id, `ticket:${t.index}`)}`,
        qr: await qr(`${ORIGIN}/haunted-tribe/staff/#${order.id}.${t.index}.${token(env.HAUNT_TOKEN_SECRET, order.id, `ticket:${t.index}`)}`)
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
      const id = hash(`${EVENT}:${input.requestId}`).slice(0, 36);
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
      await mutate(id, o => { o.paymentIntent = pi.id; });
      return { orderId: id, accessToken: token(env.HAUNT_TOKEN_SECRET, id), clientSecret: pi.client_secret, amount: cart.amount };
    },
    async order(req, id) {
      if (!/^[a-f0-9]{36}$/.test(id) || !equal(bearer(req), token(env.HAUNT_TOKEN_SECRET, id))) throw new HauntError('Ticket access link not recognized.', 403);
      const order = await reconcile(id);
      return publicOrder(order);
    },
    async webhook(raw, signature) {
      let event;
      try { event = stripe.webhooks.constructEvent(raw, signature, env.STRIPE_WEBHOOK_SECRET); }
      catch { throw new HauntError('Invalid webhook signature.', 400); }
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
