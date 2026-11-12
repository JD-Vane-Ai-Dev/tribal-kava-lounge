import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const [site,build,config,home,api]=await Promise.all([
  readFile('tribal-studio.html','utf8'),
  readFile('scripts/build-site.mjs','utf8'),
  readFile('netlify.toml','utf8'),
  readFile('designs/tribal-botanical.html','utf8'),
  readFile('netlify/functions/tribal-ops.mjs','utf8')
]);
assert.match(config,/from = "\/studio"[\s\S]*?to = "\/tribal-studio\.html"/);
assert.ok(build.includes("'tribal-studio.html'"));
assert.match(site,/name="robots" content="noindex,nofollow"/);
assert.match(site,/verified submissions from the existing public Netlify rental form enter this secure tracker/i);
assert.match(site,/No automatic publishing|nothing is published automatically/i);
assert.match(site,/1080 × 1350/);
assert.match(site,/\$250/);
assert.match(site,/\$50/);
assert.match(site,/tribal-bar-game-night.webp/);
assert.match(api,/owner-workspace-v1/);
assert.match(api,/timingSafeEqual/);
assert.doesNotMatch(home,/\/events\/venue|\$250|private event rentals/i);
const publicQuoteForm = await readFile('venue-rental.html','utf8');
for (const item of ['addon_tables','addon_chairs','addon_lounge_seating','addon_cake_gift_station']) {
 assert.ok(publicQuoteForm.includes('name="'+item+'"'), 'Missing explicit quote option: '+item);
}
assert.match(config,/from = "\/private-events"[\s\S]*?to = "\/venue-rental\.html"[\s\S]*?force = true/);
assert.match(publicQuoteForm,/<h1 id="hero-heading">Your event\.<br><em>Your space\.<\/em>/);
assert.match(publicQuoteForm,/<img src="\/images\/tribal-private-events-green-gold-75\.png"/);
assert.match(publicQuoteForm,/customizable|custom layout|custom venue/i);
assert.doesNotMatch(publicQuoteForm,/Not another empty banquet room|The lounge is already the vibe/);
assert.match(publicQuoteForm,/<link rel="canonical" href="https:\/\/(?:www\.)?thetribalkavalounge\.com\/private-events"/);
assert.match(site,/YOUR VENUE/);
console.log('Tribal Studio build and homepage-separation checks passed');
assert.ok(!home.includes('href="/events"'));
assert.ok(!home.includes('id="whats-on"'));

// The owner-selected graphic must replace the old venue image without cropping its copy.
assert.match(publicQuoteForm,/hero-venue-photo"><img src="\/images\/tribal-private-events-green-gold-75\.png"/);
assert.doesNotMatch(publicQuoteForm,/<span>THE REAL VENUE<\/span>/);
assert.match(publicQuoteForm,/object-fit:contain/);
assert.ok(build.includes("'tribal-private-events-green-gold-75.png'"));

// REA quote UX: all existing submission field names, same Netlify endpoint and clear add-on groups.
assert.match(publicQuoteForm,/name="tribal-private-rental" method="POST" action="\/rental-inquiry-received" data-netlify="true"/);
for(const name of ['addon_furniture','addon_tables','addon_chairs','addon_lounge_seating','addon_cake_gift_station',
 'addon_decor','addon_favors','addon_catering','addon_bar','addon_dj','addon_media','addon_av',
 'addon_staff','addon_security','addon_cleanup','addon_custom']){
 assert.equal((publicQuoteForm.match(new RegExp('name="'+name+'"','g'))||[]).length,1,'Expected exactly one checkbox: '+name);
}
for(const category of ['Space & seating','Décor & hospitality','Entertainment & media','Event support']){
 assert.ok(publicQuoteForm.includes('<legend>'+category+'</legend>'),'Missing add-on grouping '+category);
}
assert.match(publicQuoteForm,/class="occasion-tile" data-event-type="Birthday \/ private party"/);
assert.match(publicQuoteForm,/id="form-heading"/);
assert.match(publicQuoteForm,/Common questions, clear answers/);
assert.match(publicQuoteForm,/No payment collected/);

// User-approved hero remains the actual green-and-gold 75-guest graphic.
import {createHash} from 'node:crypto';
const approvedHeroImage=await readFile('images/tribal-private-events-green-gold-75.png');
assert.equal(createHash('sha256').update(approvedHeroImage).digest('hex'),
  '5aa0b684793a1284a2a695d1c06abde2287777f3861131ec288256b424a6e916');
assert.match(publicQuoteForm,/id="qguests" type="number" min="1" max="75" required/);
assert.match(publicQuoteForm,/Maximum venue occupancy is 75|maximum occupancy of 75/);
assert.doesNotMatch(publicQuoteForm,/60-guest|max="60"|up to 60 guests/i);
assert.match(site,/Maximum venue occupancy is 75 guests/);
