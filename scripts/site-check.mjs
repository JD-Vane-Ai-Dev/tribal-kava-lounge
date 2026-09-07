import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runInNewContext } from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFile(path.join(root, file), 'utf8');

for (const file of ['app.js', 'daily-kava.js', 'site-config.js', 'analytics.js']) {
  execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'pipe' });
}

const [html, robots, sitemap, config, analytics, siteConfig, app, styles, dailyKava, workbookConfig, workbookBicep, socialProofCore, socialProofFunction, eventCalendar] = await Promise.all([
  read('index.html'), read('robots.txt'), read('dist/sitemap.xml'), read('staticwebapp.config.json'),
  read('analytics.js'), read('site-config.js'), read('app.js'), read('styles.css'), read('daily-kava.js'),
  read('infra/azure/conversion-workbook.json'), read('infra/azure/conversion-workbook.bicep'),
  read('api/src/social-proof-core.js'), read('api/src/functions/social-proof.js'), read('dist/events.ics')
]);
const logo = await readFile(path.join(root, 'images/tribal-logo-cutout.png'));
const communityPhoto = await readFile(path.join(root, 'images/tribal-community-game-night.webp'));
const barPhoto = await readFile(path.join(root, 'images/tribal-bar-game-night.webp'));
const racersPhoto = await readFile(path.join(root, 'images/tribal-mario-kart-racers.webp'));
const indexNowKey = await readFile(path.join(root, 'dist/34a68ae0477ea10ed9d8a543952e0cdb.txt'), 'utf8');
const preRenderedMenu = await readFile(path.join(root, 'dist/menu/index.html'), 'utf8');
const preRenderedLoteria = await readFile(path.join(root, 'dist/events/friday-loteria/index.html'), 'utf8');
const preRenderedLakeWorth = await readFile(path.join(root, 'dist/nearby/lake-worth/index.html'), 'utf8');
const preRenderedDaily = await readFile(path.join(root, 'dist/the-daily-kava/kava-bar-west-palm-beach-first-visit/index.html'), 'utf8');
const publishedImages = (await readdir(path.join(root, 'dist/images'))).sort();

assert.match(html, /https:\/\/www\.thetribalkavalounge\.com\//, 'canonical domain must use www');
assert.match(html, /<meta name="google-site-verification" content="zXsp7qWCsUyKjaGf-yWfi92M_A_csa1mz6SO2WbTjP0">/, 'Google Search Console verification must remain in the public home page');
assert.match(html, /<meta name="msvalidate\.01" content="988E2FE2A28E101485C326DA89BB091C">/, 'Bing Webmaster verification must remain in the public home page');
assert.match(preRenderedMenu, /<link rel="canonical" href="https:\/\/www\.thetribalkavalounge\.com\/menu"/, 'menu must ship its own canonical before JavaScript runs');
assert.match(preRenderedMenu, /<title>Menu \| Kava Shells, Kratom Tea &amp; Crafted Drinks in West Palm Beach<\/title>/, 'menu must ship route-specific title metadata');
assert.match(preRenderedLoteria, /<link rel="canonical" href="https:\/\/www\.thetribalkavalounge\.com\/events\/friday-loteria"/, 'Lotería must ship its own canonical before JavaScript runs');
assert.match(preRenderedLakeWorth, /<link rel="canonical" href="https:\/\/www\.thetribalkavalounge\.com\/nearby\/lake-worth"/, 'Lake Worth page must ship its own canonical before JavaScript runs');
assert.match(preRenderedDaily, /<link rel="canonical" href="https:\/\/www\.thetribalkavalounge\.com\/the-daily-kava\/kava-bar-west-palm-beach-first-visit"/, 'Daily stories must ship their own canonicals before JavaScript runs');
assert.match(preRenderedDaily, /<div id="view-the-daily-kava-article" class="spa-view" style="display: block;">/, 'article content must be visible before JavaScript runs');
assert.match(preRenderedDaily, /<article id="daily-kava-article-root"[^>]*>[\s\S]*?<h1[^>]*>Looking for a Kava Bar in West Palm Beach\? Start Here\.<\/h1>/, 'article H1 must be in delivered HTML');
assert.match(preRenderedDaily, /<h2>What should a first-time guest expect\?<\/h2>/, 'article body must be in delivered HTML');
const preRenderedSchema = JSON.parse(preRenderedDaily.match(/<script id="seo-json-ld" type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
assert.equal(preRenderedSchema['@graph'][0]['@type'], 'BlogPosting');
assert.equal(preRenderedSchema['@graph'][1]['@type'], 'FAQPage');
assert.ok(preRenderedSchema['@graph'][1].mainEntity.every(item => preRenderedDaily.includes(item.name)), 'schema questions must match visible FAQ content');
const preRenderedIndex = await read('dist/the-daily-kava/index.html');
assert.match(preRenderedIndex, /<div id="daily-kava-grid"[^>]*>[\s\S]*?<a href="\/the-daily-kava\/kava-bar-west-palm-beach-first-visit">/, 'article discovery links must be in delivered HTML');
assert.match(preRenderedMenu, /<div id="view-menu" class="spa-view" style="display: block;">/, 'static menu must be visible without JavaScript');
assert.match(html, /daily-kava\.js/, 'public Daily Kava feed must be loaded');
assert.match(html, /analytics\.js/, 'conversion tracker must be loaded');
assert.match(html, /\/images\/tribal-logo-cutout\.png/, 'transparent Tribal logo must be used');
assert.doesNotMatch(html, /\/images\/tribal-logo\.jpg/, 'legacy logo photo must not be rendered');
assert.doesNotMatch(html, /\/images\/(?:lounge-interior|hero-placeholder)\.jpg/, 'inauthentic lounge placeholders must not be rendered');
assert.doesNotMatch(app, /\/images\/lounge-interior\.jpg/, 'inauthentic lounge image must not appear in schema');
assert.match(html, /\/images\/tribal-community-game-night\.webp/, 'authentic owned community photography must appear in the hero');
assert.match(html, /\/images\/tribal-bar-game-night\.webp/, 'authentic owned lounge photography must appear in the gallery');
assert.match(html, /\/images\/tribal-mario-kart-racers\.webp/, 'authentic owned event photography must appear in the gallery');
assert.ok(communityPhoto.length > 50000, 'owned community photo must be a real optimized image asset');
assert.ok(barPhoto.length > 50000, 'owned lounge photo must be a real optimized image asset');
assert.ok(racersPhoto.length > 50000, 'owned event photo must be a real optimized image asset');
assert.deepEqual(publishedImages, [
  'tribal-bar-game-night.webp',
  'tribal-community-game-night.webp',
  'tribal-logo-cutout.png',
  'tribal-mario-kart-racers.webp'
], 'production must publish only the verified Tribal media allowlist');
assert.match(html, /verified[\s\S]*@TribalKavaLounge post published August 18, 2026/, 'owned photography must retain visible source provenance');
assert.doesNotMatch(`${html}\n${app}\n${dailyKava}`, /Kava Clouds?|Kratom Refreshers?|Agua Frescas?|Viral Signatures?/, 'retired drink branding must not return');
assert.equal(logo[25], 6, 'Tribal logo PNG must contain an RGBA alpha channel');
assert.equal(indexNowKey.trim(), '34a68ae0477ea10ed9d8a543952e0cdb', 'IndexNow ownership key must ship at the site root');
assert.match(html, /js\.monitor\.azure\.com\/scripts\/b\/ai\.3\.gbl\.min\.js/, 'Application Insights browser SDK must be loaded');
assert.match(siteConfig, /applicationInsightsConnectionString:\s*'InstrumentationKey=/, 'Tribal Application Insights must be configured');
assert.match(analytics, /azureInsights\.trackEvent/, 'conversion events must be sent to Application Insights');
assert.match(analytics, /azureInsights\.trackPageView/, 'page views must be sent to Application Insights');
assert.match(analytics, /isProductionHost/, 'local previews must be excluded from production telemetry');
assert.match(analytics, /document\.readyState === 'complete'/, 'deferred analytics must wait for the router before its initial page-view fallback');
assert.match(workbookBicep, /Microsoft\.Insights\/workbooks@2023-06-01/, 'conversion workbook must be deployable');
assert.equal(JSON.parse(workbookConfig).items.filter(item => item.type === 3).length, 5, 'conversion workbook must contain five query panels');
assert.match(workbookConfig, /Visits → menu → directions\/calls → DoorDash/, 'dashboard must expose the requested conversion path');
assert.match(workbookConfig, /DoorDash checkout starts/, 'dashboard must count outbound checkout starts explicitly');
assert.match(workbookConfig, /Google, Instagram, QR, and direct action sources/, 'dashboard must separate the requested traffic sources');
assert.match(workbookConfig, /campaign_medium\) != 'qa'/, 'dashboard must exclude controlled QA traffic');
assert.doesNotMatch(app, /stay quiet on mobile/, 'the Kava Guide prompt must not be disabled on mobile');
assert.match(styles, /width:\s*min\(210px, calc\(100vw - 6\.75rem\)\)/, 'mobile Kava Guide prompt must fit the viewport');
assert.match(html, /id="floating-chat-bubble"[^>]*hidden/, 'the Kava Guide launcher must not compete with the initial hero');
assert.match(app, /new IntersectionObserver[\s\S]*?entry\.intersectionRatio >= 0\.18[\s\S]*?revealFloatingChat\(\)/, 'the Kava Guide launcher must reveal after the hero');
assert.match(app, /isMobileViewport \? 25000 : 30000/, 'the Kava Guide must remain available on mobile after a patient delay');
assert.match(styles, /\.floating-chat-bubble\.is-ready[\s\S]*?pointer-events:\s*auto;/, 'the delayed Kava Guide launcher must become interactive when revealed');
assert.doesNotMatch(html, /Joined VIP list!/, 'VIP path must not fake a successful signup');
assert.match(html, /data-conversion="directions"/, 'directions conversion must exist');
assert.match(html, /query_place_id=ChIJFe_zmzQp2YgRh1ooSVUot9Y/, 'Google review links must target the verified Tribal Business Profile');
assert.match(siteConfig, /destination_place_id=ChIJFe_zmzQp2YgRh1ooSVUot9Y/, 'global directions must target the verified Tribal place ID');
assert.match(socialProofCore, /query_place_id=ChIJFe_zmzQp2YgRh1ooSVUot9Y/, 'social-proof fallback must target the verified Tribal Business Profile');
assert.doesNotMatch(`${html}\n${app}\n${socialProofCore}`, /maps\/search\/\?api=1(?:&amp;|&)query=Tribal\+Kava\+Lounge\+770/, 'fuzzy Google Business searches must not return');
assert.match(html, /data-conversion="event_signup_form_open"/, 'event signup form must be available');
assert.match(html, /writereview\?placeid=ChIJFe_zmzQp2YgRh1ooSVUot9Y/, 'review requests must target the verified Tribal Business Profile');
assert.match(html, /data-conversion="order_online"/, 'DoorDash order conversion must exist');
assert.match(html, /doordash\.com\/store\/tribal-kava-bar-w\.p\.b-west-palm-beach-41073365\/98494168\/\?pickup=true/, 'Active DoorDash storefront must be linked');
assert.doesNotMatch(html, /order\.online\/store\/637148/, 'Inactive legacy DoorDash storefront must not be linked');
assert.equal((html.match(/data-online-menu-item=/g) || []).length, 6, 'all six live DoorDash items must be published');
assert.match(html, /18 live flavor choices/, 'all live DoorDash flavors must be summarized');
assert.match(html, /Boost \+\$6\.45 · 5 ml \+\$11\.34 · 10 ml \+\$22\.15/, 'DoorDash tea boost prices must be visible');
assert.match(html, /DoorDash marketplace prices are shown here separately from the in-lounge prices above/, 'DoorDash and in-lounge pricing must stay clearly separated');
assert.equal((html.match(/class="drink-finder-step"/g) || []).length, 3, 'drink finder must ask exactly three questions');
assert.match(app, /tribalTrack\?\.\('drink_recommendation'/, 'drink recommendations must be tracked');
assert.match(app, /available_online: availableOnline/, 'drink recommendation telemetry must distinguish DoorDash from in-lounge items');
assert.match(html, /id="drink-finder-primary-action"/, 'drink finder must expose a result-specific primary action');
assert.match(app, /Single Shell · French Vanilla[\s\S]*?\$6\.24 on DoorDash/, 'drink finder must recommend a specific purchasable DoorDash build');
assert.doesNotMatch(html, /quiz-card|data-recommendation/, 'legacy one-click drink quiz must be removed');
assert.match(styles, /\.hero-ctas \.btn:nth-child\(n \+ 3\)\s*\{\s*display:\s*none;/, 'mobile hero must prioritize two conversion actions');
assert.match(styles, /\.hero-badge\s*\{[\s\S]*?max-width:\s*100%;[\s\S]*?white-space:\s*normal;/, 'mobile hero badge must wrap instead of widening the viewport');
assert.match(styles, /grid-template-columns:\s*minmax\(0, 0\.92fr\) minmax\(0, 1\.08fr\);/, 'mobile hero CTA columns must not overflow and must give Directions enough room');
assert.equal((html.match(/href="\/events\/(?:two-dollar-tuesday|friday-loteria|karaoke|mario-kart|poker-night|art-club|sip-and-paint)"/g) || []).length, 7, 'all seven verified events must have shareable routes');
assert.equal((app.match(/embedUrl:\s*'https:\/\/www\.instagram\.com\/p\//g) || []).length, 5, 'five event pages must embed their official scheduling proof');
assert.match(html, /instagram\.com\/p\/DZC5nDruES3\/embed\/captioned/, 'official Instagram proof must be embedded');
assert.match(html, /href="\/events\.ics"[^>]*data-conversion="calendar_download"/, 'verified weekly events must offer a calendar subscription');
assert.match(app, /'two-dollar-tuesday':[\s\S]*?'@type': 'WebPage'/, 'the Tuesday price promotion must not be marked up as an Event');
assert.match(app, /'friday-loteria':[\s\S]*?startDate: nextFridayLoteria\.iso/, 'Friday Lotería must expose the next concrete occurrence to search engines');
assert.match(app, /function nextWeeklyOccurrence\(/, 'recurring event dates must refresh automatically');
assert.match(eventCalendar, /RRULE:FREQ=WEEKLY;BYDAY=TU/, 'calendar must repeat the verified Tuesday special');
assert.match(eventCalendar, /RRULE:FREQ=WEEKLY;BYDAY=FR/, 'calendar must repeat verified Friday Lotería');
assert.match(eventCalendar, /\r\n/, 'published iCalendar data must use RFC-compatible CRLF line endings');
assert.equal(JSON.parse(config).mimeTypes['.ics'], 'text/calendar', 'Azure must serve the calendar with the correct MIME type');
assert.match(html, /id="instagram-gallery"/, 'curated Instagram gallery mount must exist');
assert.match(app, /fetch\('\/api\/social-proof'/, 'frontend must refresh social proof through the same-origin API');
assert.match(app, /data-google-rating-summary/, 'Google rating summary must support live hydration');
assert.match(socialProofCore, /places\.googleapis\.com\/v1\/places/, 'social proof API must use Places API (New)');
assert.doesNotMatch(socialProofCore, /places:searchText/, 'the verified Tribal place ID must avoid an unnecessary Text Search request');
assert.match(socialProofCore, /GOOGLE_PLACE_ID = 'ChIJFe_zmzQp2YgRh1ooSVUot9Y'/, 'social proof must default to the verified Tribal place ID');
assert.match(socialProofCore, /X-Goog-FieldMask': 'rating,userRatingCount'/, 'Google social proof must request only fields used by the public contract');
assert.match(socialProofCore, /graph\.instagram\.com/, 'social proof API must use the official Instagram graph host');
assert.doesNotMatch(`${html}\n${app}`, /GOOGLE_PLACES_API_KEY|INSTAGRAM_ACCESS_TOKEN/, 'provider secret names must not appear in browser assets');
assert.match(socialProofFunction, /Cache-Control.*max-age=300, s-maxage=3600, stale-while-revalidate=86400/, 'social proof API must cache provider responses in browsers and shared caches');
assert.equal(JSON.parse(config).platform.apiRuntime, 'node:20', 'Azure managed API runtime must be pinned');
assert.match(html, /id="view-nearby"/, 'nearby-area search coverage page must exist');
assert.match(html, /id="view-nearby-detail"/, 'dedicated nearby-area route view must exist');
assert.equal((sitemap.match(/\/nearby\/(?:west-palm-beach|lake-worth|greenacres)/g) || []).length, 3, 'all three dedicated local-search pages must be indexed');
assert.equal((app.match(/seoKey: 'nearby-(?:west-palm-beach|lake-worth|greenacres)'/g) || []).length, 3, 'all three local-search pages must have distinct metadata');
assert.doesNotMatch(html, /Online ordering is also coming soon/, 'FAQ must not contradict the live DoorDash link');
assert.match(robots, /www\.thetribalkavalounge\.com\/sitemap\.xml/, 'robots sitemap must be canonical');
assert.doesNotMatch(sitemap, /kratom-regulation|botanical-drink-trends|kava-bars-across-america/, 'unsafe legacy Daily URLs must not be indexed');
assert.match(sitemap, /\/the-daily-kava\/crafted-kava-drinks/, 'new crafted-kava article URL must be indexed');
assert.doesNotMatch(sitemap, /\/the-daily-kava\/what-is-a-kava-cloud/, 'retired Cloud article URL must not be indexed');
const dailyPosts = runInNewContext(`${dailyKava}\n; dailyKavaPosts;`, Object.create(null), {
  timeout: 1000,
  contextCodeGeneration: { strings: false, wasm: false }
});
assert.ok(Array.isArray(dailyPosts) && dailyPosts.length >= 13, 'the 13 launch stories must remain alongside new Daily stories');
const catalogSlugs = Array.from(dailyPosts, (post) => post.slug).sort();
assert.equal(new Set(catalogSlugs).size, catalogSlugs.length, 'Daily catalog slugs must be unique');
const indexedDailySlugs = [...sitemap.matchAll(/<loc>https:\/\/www\.thetribalkavalounge\.com\/the-daily-kava\/([^<]+)<\/loc>/g)]
  .map((match) => match[1]).sort();
assert.deepEqual(indexedDailySlugs, catalogSlugs, 'every catalog story must have exactly one canonical sitemap URL');
assert.equal((sitemap.match(/<url>/g) || []).length, 25 + catalogSlugs.length, 'sitemap must include the 25 site routes and every catalog story');
for (const post of dailyPosts) {
  const rendered = await read(`dist/the-daily-kava/${post.slug}/index.html`);
  assert.ok(rendered.includes(`<link rel="canonical" href="https://www.thetribalkavalounge.com/the-daily-kava/${post.slug}"`), `${post.slug} must ship its canonical before JavaScript runs`);
}
assert.doesNotMatch(sitemap, /<loc>https:\/\/(?!www\.thetribalkavalounge\.com)/, 'sitemap URLs must use the canonical host');
assert.ok(JSON.parse(config).navigationFallback, 'Azure SPA fallback must be configured');
assert.equal(
  JSON.parse(config).routes.find(({ route }) => route === '/the-daily-kava/what-is-a-kava-cloud')?.statusCode,
  301,
  'retired Cloud article must redirect permanently'
);

console.log('Site checks passed.');
