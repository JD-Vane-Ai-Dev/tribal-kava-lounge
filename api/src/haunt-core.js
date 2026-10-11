import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const EVENT = 'haunted-tribe-2026';
export const START = Date.parse('2026-10-30T19:00:00-04:00');
export const BREAK = Date.parse('2026-10-30T22:00:00-04:00');
export const RESUME = Date.parse('2026-10-30T22:30:00-04:00');
export const END = Date.parse('2026-10-31T01:30:00-04:00');
export const BOGO_START = Date.parse('2026-10-30T21:00:00-04:00');
export const BOGO_END = Date.parse('2026-10-31T00:00:00-04:00');
export const SIZES = ['S', 'M', 'L', 'XL'];
export class HauntError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
export function equal(a, b) {
  const x = Buffer.from(String(a || '')); const y = Buffer.from(String(b || ''));
  return x.length === y.length && timingSafeEqual(x, y);
}
export function token(secret, orderId, scope = 'order') {
  return createHmac('sha256', secret).update(`${EVENT}:${orderId}:${scope}`).digest('base64url');
}
export function validateCart(input, now = Date.now()) {
  if (now >= START) throw new HauntError('Presale has ended. Adult entry is $15 and kids ages 5–12 are $10 at the door.', 409);
  const quantity = (value) => {
    if (!Number.isInteger(value) || value < 0 || value > 20) throw new HauntError('Choose a quantity from 0 to 20.');
    return value;
  };
  const adult = quantity(input.adult); const child = quantity(input.child);
  if (!Array.isArray(input.shirts) || input.shirts.length > 20 || input.shirts.some(s => !SIZES.includes(s))) throw new HauntError('Choose S, M, L, or XL for every shirt.');
  const shirts = [...input.shirts];
  if (adult + child + shirts.length < 1 || adult + child + shirts.length > 20) throw new HauntError('Choose between 1 and 20 admissions per order.');
  const name = String(input.name || '').trim(); const email = String(input.email || '').trim().toLowerCase();
  if (name.length < 2 || name.length > 120 || /[\r\n\x00-\x1f]/.test(name)) throw new HauntError('Enter your full name.');
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HauntError('Enter a valid email address.');
  if (input.accepted !== true) throw new HauntError('Please acknowledge the event and sales terms.');
  return { adult, child, shirts, name, email, amount: adult * 1000 + child * 500 + shirts.length * 2500 };
}
export function makeOrder(cart, id) {
  const tickets = [];
  for (let i = 0; i < cart.adult; i++) tickets.push({ kind: 'adult' });
  for (let i = 0; i < cart.child; i++) tickets.push({ kind: 'child' });
  for (const size of cart.shirts) tickets.push({ kind: 'bundle', size });
  return { id, ...cart, created: new Date().toISOString(), status: 'pending', tickets: tickets.map((t, i) => ({ ...t, index: i, admission: null, shell: null, bogo: null })) };
}
export function verifyPaid(order, intent) {
  if (intent.status !== 'succeeded' || intent.currency !== 'usd' || intent.amount !== order.amount || intent.amount_received !== order.amount || intent.metadata?.haunt_order !== order.id || intent.metadata?.event !== EVENT || intent.id !== order.paymentIntent) throw new HauntError('Payment could not be verified.', 409);
}
export function redeem(order, index, perk, staffId, now = Date.now()) {
  if (order.status !== 'paid') throw new HauntError('This order is not valid for admission.', 409);
  const ticket = order.tickets[index];
  if (!ticket || !['admission', 'shell', 'bogo'].includes(perk)) throw new HauntError('Invalid ticket or redemption.');
  if (now < START || now >= END) throw new HauntError('Redemption is available during the event only.', 409);
  if (perk === 'admission' && now >= BREAK && now < RESUME) throw new HauntError('The haunt is on break until 10:30 PM.', 409);
  if (perk === 'shell' && ticket.kind === 'child') throw new HauntError('Kids tickets are admission only.', 409);
  if (perk === 'bogo' && (ticket.kind !== 'bundle' || now < BOGO_START || now >= BOGO_END)) throw new HauntError('Bundle BOGO is available 9 PM–midnight only.', 409);
  if (ticket[perk]) throw new HauntError('Already redeemed.', 409);
  ticket[perk] = { at: new Date(now).toISOString(), by: staffId };
  return order;
}
export function orderId() { return randomBytes(18).toString('hex'); }
export function staffPrincipal(header) {
  try {
    const p = JSON.parse(Buffer.from(header || '', 'base64').toString());
    return p.userRoles?.includes('haunted-staff') && p.userId ? p : null;
  } catch { return null; }
}
