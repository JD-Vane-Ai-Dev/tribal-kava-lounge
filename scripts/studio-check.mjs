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
assert.match(site,/not<\/strong> imported automatically/i);
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
assert.match(publicQuoteForm,/<h1 id="hero-heading">A space for/);
assert.match(publicQuoteForm,/<img src="\/images\/tribal-private-events-room-edited\.jpeg"/);
assert.match(publicQuoteForm,/customizable|custom layout|custom venue/i);
assert.doesNotMatch(publicQuoteForm,/Not another empty banquet room|The lounge is already the vibe/);
assert.match(publicQuoteForm,/<link rel="canonical" href="https:\/\/www\.thetribalkavalounge\.com\/private-events"/);
assert.match(site,/YOUR VENUE/);
console.log('Tribal Studio build and homepage-separation checks passed');
assert.ok(!home.includes('href="/events"'));
assert.ok(!home.includes('id="whats-on"'));

// The owner-selected graphic must replace the old venue image without cropping its copy.
assert.match(publicQuoteForm,/hero-venue-photo"><img src="\/images\/tribal-private-events-room-edited\.jpeg"/);
assert.doesNotMatch(publicQuoteForm,/<span>THE REAL VENUE<\/span>/);
assert.match(publicQuoteForm,/object-fit:contain/);
assert.ok(build.includes("'tribal-private-events-room-edited.jpeg'"));
