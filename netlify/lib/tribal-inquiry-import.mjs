import { createHash } from 'node:crypto';

export const RENTAL_FORM = 'tribal-private-rental';
export const RENTAL_FORM_ID = '6af332e85a3f7db6647a22b2';
const ADDONS = {
  addon_furniture: 'Extra tables / chairs / linens',
  addon_tables: 'Additional rented tables',
  addon_chairs: 'Additional rented chairs',
  addon_lounge_seating: 'Custom lounge seating',
  addon_cake_gift_station: 'Cake / gift station',
  addon_decor: 'Decorations / balloons / backdrop',
  addon_favors: 'Party favors / branded gifts',
  addon_catering: 'Catering / food service',
  addon_bar: 'Non-alcoholic drinks',
  addon_dj: 'DJ / MC / sound',
  addon_media: 'Photography / video',
  addon_av: 'Projection / microphone',
  addon_staff: 'Event staff',
  addon_security: 'Security',
  addon_cleanup: 'Setup / cleanup',
  addon_custom: 'Custom request'
};
const clean = (value, max = 300) => typeof value === 'string'
  ? value.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '';
const isoDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const time24 = s => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

export function normalizeRentalSubmission(event, now = new Date()) {
  const data = event?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data))
    return { skip: 'invalid-event-data' };
  const name = event?.form?.name || event?.formName || data['form-name'] || data.form_name;
  const formId = event?.form?.id || event?.formId || event?.submission?.formId;
  const matches = name === RENTAL_FORM || formId === RENTAL_FORM_ID ||
    (data.source === 'events-venue' && 'preferred_date' in data &&
      'contact_name' in data && 'event_type' in data);
  if (!matches) return { skip: 'not-private-rental' };
  if (clean(data['bot-field'])) return { skip: 'honeypot-not-empty' };
  if (data.contact_consent !== 'yes') return { skip: 'missing-consent' };
  const email = clean(data.email, 220).toLowerCase();
  const date = clean(data.preferred_date, 24);
  const startTime = clean(data.start_time, 8);
  const guests = Number(data.guests);
  const nameText = clean(data.contact_name, 160);
  if (!nameText || !/^\S+@\S+\.\S+$/.test(email) || !isoDate(date) ||
      !time24(startTime) || !Number.isInteger(guests) || guests < 1 || guests > 75 ||
      !clean(data.event_type)) return { skip: 'incomplete-or-invalid-request' };

  const rawId = clean(event?.submission?.id || event?.submissionId || event?.id, 100);
  const fingerprint = createHash('sha256').update(JSON.stringify({
    form: RENTAL_FORM,
    name: nameText, email, date, time: startTime,
    guests, eventType: clean(data.event_type),
    notes: clean(data.notes, 2000)
  })).digest('hex');
  const id = [
    fingerprint.slice(0, 8), fingerprint.slice(8, 12),
    '5' + fingerprint.slice(13, 16), 'a' + fingerprint.slice(17, 20),
    fingerprint.slice(20, 32)
  ].join('-');
  const addons = Object.entries(ADDONS)
    .filter(([key]) => data[key] === 'yes').map(([, label]) => label);
  const noteParts = [
    'Submitted through the verified Tribal private-events form.',
    'Preferred start: ' + startTime,
    'Duration: ' + clean(data.duration, 60),
    'Layout: ' + clean(data.setup_style, 100),
    'Flexibility: ' + clean(data.date_flexibility, 100),
    clean(data.notes, 700) && 'Customer notes: ' + clean(data.notes, 700)
  ].filter(Boolean);
  const localDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);
  return { id, type: 'inquiry', name: nameText, email,
    phone: clean(data.phone, 40), contact: [email, clean(data.phone, 40)].filter(Boolean).join(' · '),
    eventType: clean(data.event_type, 100), date, guests: String(guests),
    startTime, duration: clean(data.duration, 60), setupStyle: clean(data.setup_style, 100),
    flexibility: clean(data.date_flexibility, 100),
    extras: addons.join(', ').slice(0, 350),
    notes: noteParts.join('\n').slice(0, 1500), status: 'new',
    followUp: localDate, quoteAmount: '', depositAmount: '', depositUrl: '',
    depositStatus: 'not_requested', depositReference: '', bookingConfirmed: '',
    source: 'Netlify verified quote form', externalSubmissionId: rawId,
    createdAt: now.toISOString(), updatedAt: now.toISOString(), importedAt: now.toISOString()
  };
}

export async function importRentalSubmission(event, store, { now = new Date() } = {}) {
  const record = normalizeRentalSubmission(event, now);
  if (record.skip) return { outcome: record.skip };
  const key = 'v1/inquiry/' + record.id;
  const existing = await store.get(key, { type: 'json' });
  if (existing) return { outcome: 'already-imported', id: record.id };
  await store.setJSON(key, record);
  return { outcome: 'created', id: record.id };
}
