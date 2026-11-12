import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeRentalSubmission, importRentalSubmission } from '../netlify/lib/tribal-inquiry-import.mjs';
import { validateInquiryBooking } from '../netlify/functions/tribal-ops.mjs';
import events from '../netlify/functions/tribal-form-events.mjs';

const sample = {
 source:'events-venue', 'form-name':'tribal-private-rental',
 'bot-field':'',contact_consent:'yes',
 contact_name:'Synthetic QA - Not a real booking',
 email:'qa@example.test', phone:'555-000-0000',
 preferred_date:'2026-12-18',start_time:'18:30',guests:'35',
 event_type:'Birthday / private party', duration:'3 hours',
 setup_style:'Lounge / existing setup',
 date_flexibility:'Exact date preferred',
 addon_tables:'yes',addon_favors:'yes',
 notes:'QA only. Do not book, charge, or contact anyone.'
};
const event={site:{id:'1296a8dc-a399-4fa4-9be8-13963f335311'},
 form:{name:'tribal-private-rental',id:'6af332e85a3f7db6647a22b2'},
 submission:{id:'sub_test_only_14'},data:sample};
const time=new Date('2026-11-12T16:45:00.000Z');
const normalized=normalizeRentalSubmission(event,time);
assert.equal(normalized.status,'new');
assert.equal(normalized.followUp,'2026-11-12');
assert.equal(normalized.quoteAmount,'');
assert.equal(normalized.depositStatus,'not_requested');
assert.equal(normalized.bookingConfirmed,'');
assert.equal(normalized.guests,'35');
assert.equal(normalized.startTime,'18:30');
assert.match(normalized.extras,/Additional rented tables/);
assert.match(normalized.extras,/Party favors/);
assert.match(normalized.notes,/QA only/);
assert.match(normalized.id,/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/);
assert.equal(normalizeRentalSubmission(event,time).id,normalized.id);
const fake=new Map();
const store={
 async get(key){return fake.get(key)||null;},
 async setJSON(key,value){fake.set(key,value);}
};
let result=await importRentalSubmission(event,store,{now:time});
assert.equal(result.outcome,'created');
assert.equal(fake.size,1);
fake.get('v1/inquiry/'+normalized.id).status='quoted';
result=await importRentalSubmission(event,store,{now:time});
assert.equal(result.outcome,'already-imported');
assert.equal(fake.size,1);
assert.equal(fake.get('v1/inquiry/'+normalized.id).status,'quoted',
 'repeat event must never overwrite an approved quote');

for(const [title,data,expected] of [
 ['missing consent',{...sample,contact_consent:''},'missing-consent'],
 ['spam honeypot',{...sample,'bot-field':'spam'},'honeypot-not-empty'],
 ['too many guests',{...sample,guests:'76'},'incomplete-or-invalid-request'],
 ['invalid email',{...sample,email:'bad'},'incomplete-or-invalid-request'],
 ['invalid time',{...sample,start_time:'25:40'},'incomplete-or-invalid-request'],
 ['missing date',{...sample,preferred_date:''},'incomplete-or-invalid-request']
]) {
 assert.equal(normalizeRentalSubmission({...event,data},time).skip,expected,title);
}
assert.equal(normalizeRentalSubmission({...event,form:{name:'tribal-vendor-interest'},
 data:{business:'Synthetic Vendor',email:'qa@example.test'}},time).skip,'not-private-rental');
assert.equal(normalizeRentalSubmission({data:sample},time).id,normalized.id);

const validBooking={
 status:'booked',quoteAmount:'250.00',date:'2026-12-18',startTime:'18:30',
 bookingConfirmed:'yes',depositStatus:'waived',depositReference:'',depositUrl:''
};
assert.equal(validateInquiryBooking(validBooking),'');
assert.equal(validateInquiryBooking({...validBooking,depositStatus:'paid_verified',depositReference:'pi_test_001'}),'');
assert.match(validateInquiryBooking({...validBooking,bookingConfirmed:''}),/owner confirmation/i);
assert.match(validateInquiryBooking({...validBooking,depositStatus:'awaiting_payment'}),/deposit/i);
assert.match(validateInquiryBooking({...validBooking,quoteAmount:''}),/priced/i);
assert.match(validateInquiryBooking({...validBooking,startTime:''}),/dated/i);
assert.match(validateInquiryBooking({...validBooking,depositStatus:'paid_verified',depositReference:''}),/receipt/i);
assert.match(validateInquiryBooking({...validBooking,depositUrl:'https://evil.example.com'}),/Stripe-hosted/i);
assert.equal(validateInquiryBooking({...validBooking,depositUrl:'https://buy.stripe.com/test_123'}),'');
assert.equal(typeof events.formSubmitted,'function');
await events.formSubmitted({site:{id:'some-other-site'},data:sample});
// UI and public form invariants.
const [studio,form,api]=await Promise.all([
 readFile('tribal-studio.html','utf8'),readFile('venue-rental.html','utf8'),
 readFile('netlify/functions/tribal-ops.mjs','utf8')
]);
assert.match(studio,/Verified submissions from the existing public Netlify rental form enter this secure tracker/);
assert.match(studio,/data-quote-email/);
assert.match(studio,/data-booking-email/);
assert.match(studio,/data-calendar/);
assert.match(studio,/edit-deposit-reference/);
assert.match(studio,/Paid status is owner-entered, not a Stripe webhook/);
assert.doesNotMatch(studio,/New submissions are <strong>not<\/strong> imported automatically/);
assert.match(form,/name="tribal-private-rental" method="POST"/);
assert.match(form,/data-netlify="true"/);
assert.match(api,/timingSafeEqual/);
assert.match(api,/validateInquiryBooking/);
console.log('Tribal booking checks passed: verified intake, honeypot, consent, 75-person limit, idempotency, owner-controlled deposit and booking workflow.');
