import { app } from '@azure/functions';
import Stripe from 'stripe';
import { TableClient } from '@azure/data-tables';
import { createMailer } from '../haunt-mail.js';
import QRCode from 'qrcode';
import { createService, nameKey, paymentEnvironment } from '../haunt-service.js';
import { EVENT, HauntError } from '../haunt-core.js';

let cached;
function service() {
  if (cached) return cached;
  const env = process.env;
  const environment = paymentEnvironment(env);
  const table = env.HAUNT_STORAGE_CONNECTION_STRING && environment ? TableClient.fromConnectionString(env.HAUNT_STORAGE_CONNECTION_STRING, environment.table) : null;
  const entity = order => ({ partitionKey: EVENT, rowKey: order.id, buyerNameKey: nameKey(order.name), document: JSON.stringify(order) });
  const store = {
    async get(id) { const e = await table.getEntity(EVENT, id); return { order: JSON.parse(e.document), etag: e.etag }; },
    async create(order) { await table.createEntity(entity(order)); },
    async replace(order, etag) { await table.updateEntity(entity(order), 'Replace', { etag }); },
    async byName(key) { const rows = []; for await (const e of table.listEntities({ queryOptions: { filter: `PartitionKey eq '${EVENT}' and buyerNameKey eq '${key}'` } })) { rows.push(JSON.parse(e.document)); if (rows.length >= 20) break; } return rows; }
  };
  cached = createService({ env, store, stripe: env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null,
    qr: text => QRCode.toDataURL(text, { width: 300, margin: 2, errorCorrectionLevel: 'M' }),
    mail: createMailer(env)
  });
  return cached;
}
function route(name, methods, path, action) {
  app.http(name, { methods, authLevel: 'anonymous', route: path, handler: async (req, context) => {
    try {
      const result = await action(service(), req);
      return { jsonBody: result, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } };
    } catch (e) {
      if (!(e instanceof HauntError)) context.error('Haunt request failed', e.name, e.statusCode || 'internal');
      const status = e instanceof HauntError ? e.status : e.statusCode === 404 ? 404 : 503;
      return { status, jsonBody: { error: e instanceof HauntError ? e.message : status === 404 ? 'Order not found.' : 'Tickets are temporarily unavailable. Please try again shortly.' }, headers: { 'Cache-Control': 'no-store' } };
    }
  } });
}
async function body(req) { const raw = await req.text(); if (raw.length > 12000) throw new HauntError('Request too large.', 413); try { return JSON.parse(raw); } catch { throw new HauntError('Invalid request.'); } }
route('hauntConfig', ['GET'], 'haunt/config', s => s.config());
route('hauntCheckout', ['POST'], 'haunt/checkout', async (s, r) => s.checkout(await body(r)));
route('hauntOrder', ['GET'], 'haunt/orders/{id}', (s, r) => s.order(r, r.params.id));
route('hauntWebhook', ['POST'], 'haunt/webhook', async (s, r) => s.webhook(await r.text(), r.headers.get('stripe-signature')));
route('hauntStaffLookup', ['POST'], 'haunt/staff/lookup', async (s, r) => s.staffLookup(r, await body(r)));
route('hauntStaffRedeem', ['POST'], 'haunt/staff/redeem', async (s, r) => s.staffRedeem(r, await body(r)));
