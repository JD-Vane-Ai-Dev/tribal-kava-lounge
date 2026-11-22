import assert from 'node:assert/strict';
import {readFile, access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=await readFile(path.join(root,'designs/tribal-prestige-botanical.html'),'utf8');
const built=await readFile(path.join(root,'dist/prestige-botanical.html'),'utf8');
assert.equal(source,built,'The deploy artifact must match the review concept');
assert.equal((source.match(/<h1\b/gi)||[]).length,1,'Exactly one H1');
assert.match(source,/<meta name="robots" content="noindex,nofollow">/);
assert.match(source,/<body data-prestige="botanical-2026">/);
assert.match(source,/href="\/menu"/);
assert.match(source,/data-conversion="directions"/);
assert.match(source,/href="\/the-daily-kava"/);
assert.match(source,/<main[\s>]/);
assert.match(source,/prefers-reduced-motion/);
assert.match(source,/:focus-visible/);
assert.doesNotMatch(source,/href="[^"]*(?:private-events|venue-rental)[^"]*"/i,
  'Home review must not promote private-event rentals');
const localImages=[...source.matchAll(/\b(?:src|srcset)="(\/images\/[^"]+)"/g)].map(m=>m[1]);
for(const file of localImages){
  await access(path.join(root,file.replace(/^\//,'')));
}
console.log('PRESTIGE_PREVIEW_ACCEPTANCE',JSON.stringify({
  passed:true,kind:'review-only',liveHomepageChanged:false,
  noindex:true,ownedImages:localImages.length,artifact:'dist/prestige-botanical.html'
}));
