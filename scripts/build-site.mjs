import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
// Every deployment, including unrelated site edits, checks the whole catalog.
execFileSync('python3', [path.join(root, 'daily-engine/auto_publish.py'), 'check-catalog'], { cwd: root, stdio: 'inherit' });
const files = [
  'index.html',
  'review-card.html',
  'styles.css',
  'app.js',
  'daily-kava.js',
  'site-config.js',
  'analytics.js',
  'events.ics',
  'favicon.svg',
  'robots.txt',
  'staticwebapp.config.json',
  '34a68ae0477ea10ed9d8a543952e0cdb.txt'
];
const imageFiles = [
  'tribal-bar-game-night.webp',
  'tribal-community-game-night.webp',
  'tribal-logo-cutout.png',
  'tribal-mario-kart-racers.webp'
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(files.map((file) => cp(path.join(root, file), path.join(output, file))));
await mkdir(path.join(output, 'images'), { recursive: true });
await Promise.all(imageFiles.map((file) => cp(path.join(root, 'images', file), path.join(output, 'images', file))));
const calendarSource = await readFile(path.join(root, 'events.ics'), 'utf8');
await writeFile(path.join(output, 'events.ics'), calendarSource.replace(/\r?\n/g, '\r\n'));

const origin = 'https://www.thetribalkavalounge.com';
const staticPaths = [
  '/', '/menu', '/new-here', '/kava-vs-kratom', '/what-is-kava', '/what-is-kratom',
  '/events', '/visit', '/plan-your-visit', '/private-events', '/press', '/gift-cards',
  '/faq', '/nearby', '/nearby/west-palm-beach', '/nearby/lake-worth', '/nearby/greenacres',
  '/events/two-dollar-tuesday', '/events/friday-loteria', '/events/karaoke',
  '/events/mario-kart', '/events/poker-night', '/events/art-club', '/events/sip-and-paint',
  '/the-daily-kava', '/tribal-kava-west-palm-beach'
];
const htmlTemplate = await readFile(path.join(root, 'index.html'), 'utf8');
const appSource = await readFile(path.join(root, 'app.js'), 'utf8');
const dailySource = await readFile(path.join(root, 'daily-kava.js'), 'utf8');
// This is the repository-owned static catalog, never draft/source JavaScript.
// Read the actual array so both the launch literals and generated JSON entries
// receive pre-rendered metadata and sitemap URLs.
const dailyPosts = runInNewContext(`${dailySource}\n; dailyKavaPosts;`, Object.create(null), {
  timeout: 1000,
  contextCodeGeneration: { strings: false, wasm: false }
});
if (!Array.isArray(dailyPosts)) throw new Error('Daily Kava catalog must be an array');
const catalogSlugs = new Set();
const dailyEntries = dailyPosts.map((post) => {
  if (!post || typeof post !== 'object' || typeof post.slug !== 'string'
      || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) {
    throw new Error('Daily Kava entry has an invalid slug');
  }
  if (catalogSlugs.has(post.slug)) throw new Error(`Duplicate Daily Kava slug: ${post.slug}`);
  catalogSlugs.add(post.slug);
  for (const field of ['title', 'seoTitle', 'metaDescription']) {
    if (typeof post[field] !== 'string' || !post[field].trim()) {
      throw new Error(`Daily Kava ${post.slug} is missing ${field}`);
    }
  }
  if (typeof post.modified !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(post.modified)
      || !Number.isFinite(Date.parse(`${post.modified}T00:00:00Z`))
      || new Date(`${post.modified}T00:00:00Z`).toISOString().slice(0, 10) !== post.modified) {
    throw new Error(`Daily Kava ${post.slug} has an invalid modified date`);
  }
  return {
    path: `/the-daily-kava/${post.slug}`,
    title: `${post.seoTitle} | Tribal Kava Lounge`,
    description: post.metaDescription,
    lastmod: post.modified
  };
});
const dailyPaths = dailyEntries.map((entry) => entry.path);
const dailyLastmod = new Map(dailyEntries.map((entry) => [entry.path, entry.lastmod]));
const urls = [...staticPaths, ...dailyPaths]
  .map((route) => {
    const changefreq = route.includes('events') || route.includes('two-dollar-kava') ? 'weekly' : 'monthly';
    const priority = route === '/' ? '1.0' : route === '/the-daily-kava' ? '0.9' : route.startsWith('/the-daily-kava/') ? '0.8' : '0.7';
    const lastmod = dailyLastmod.has(route) ? `<lastmod>${dailyLastmod.get(route)}</lastmod>` : '';
    return `  <url><loc>${origin}${route}</loc>${lastmod}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
  })
  .join('\n');
await writeFile(
  path.join(output, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
);

const routeMetadata = new Map();
const seoDatabaseStart = appSource.indexOf('const seoDatabase = {');
const seoDatabaseEnd = appSource.indexOf('\n};', seoDatabaseStart);
if (seoDatabaseStart < 0 || seoDatabaseEnd <= seoDatabaseStart) {
  throw new Error('Missing static SEO database');
}
// Ship each route's existing structured data before JavaScript runs.
// Read the same repository-owned definitions used by the SPA, without browser APIs.
const staticSeoDatabase = runInNewContext(
  `${appSource.slice(seoDatabaseStart, seoDatabaseEnd + 3)}\n; seoDatabase;`,
  { SITE_ORIGIN: origin },
  { timeout: 1000, contextCodeGeneration: { strings: false, wasm: false } }
);
for (const metadata of Object.values(staticSeoDatabase)) {
  routeMetadata.set(metadata.slug, metadata);
}

// Reuse the existing trusted page renderers so the initial document and SPA agree.
// This isolated build context has no network, timers, or browser side effects.
function sourceBetween(start, end) {
  const a = appSource.indexOf(start);
  const b = appSource.indexOf(end, a);
  if (a < 0 || b <= a) throw new Error(`Missing build source boundary: ${start}`);
  return appSource.slice(a, b);
}
const detailRoots = {
  'event-detail-root': { innerHTML: '' },
  'nearby-detail-root': { innerHTML: '' }
};
const detailPages = runInNewContext(`
  const seoDatabase = {};
  ${sourceBetween("const EVENT_TIME_ZONE =", "// AI Guide Knowledge Base Responses")}
  ${sourceBetween("function renderEventDetail(slug)", "function getDailyKavaSorted()")}
  // The server document remains true between builds; the browser adds the next date.
  eventDatabase['two-dollar-tuesday'].eyebrow = 'Every Tuesday · 2–5 PM';
  eventDatabase['friday-loteria'].eyebrow = 'Every Friday · 9 PM';
  const pages = [];
  for (const [slug, event] of Object.entries(eventDatabase)) {
    renderEventDetail(slug);
    const metadata = seoDatabase[event.seoKey];
    // Do not freeze a future event occurrence into a long-lived static document.
    if (metadata.schema['@type'] === 'Event') metadata.schema = {
      '@context': 'https://schema.org', '@type': 'WebPage',
      name: event.title, description: event.intro,
      url: SITE_ORIGIN + '/events/' + slug
    };
    pages.push({route: '/events/' + slug, view: 'event-detail',
      html: document.getElementById('event-detail-root').innerHTML, metadata});
  }
  for (const [slug, area] of Object.entries(nearbyAreaDatabase)) {
    renderNearbyArea(slug);
    pages.push({route: '/nearby/' + slug, view: 'nearby-detail',
      html: document.getElementById('nearby-detail-root').innerHTML,
      metadata: seoDatabase[area.seoKey]});
  }
  pages;
`, {
  SITE_ORIGIN: origin,
  document: { getElementById: id => detailRoots[id] },
  injectSEO: () => {}
}, { timeout: 1000, contextCodeGeneration: { strings: false, wasm: false } });
for (const page of detailPages) routeMetadata.set(page.route, page.metadata);

for (const entry of dailyEntries) {
  routeMetadata.set(entry.path, { title: entry.title, description: entry.description });
}

const missingMetadata = [...staticPaths, ...dailyPaths].filter((route) => !routeMetadata.has(route));
if (missingMetadata.length) {
  throw new Error(`Missing pre-render metadata for: ${missingMetadata.join(', ')}`);
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const articleActions = runInNewContext(
  sourceBetween('function dailyKavaActionsHTML(post)', 'function renderDailyKavaArticle(slug)') + '; dailyKavaActionsHTML;',
  { SITE_ORIGIN: origin },
  { timeout: 1000, contextCodeGeneration: { strings: false, wasm: false } }
);

function renderRouteHtml(route, metadata) {
  const title = escapeHtml(metadata.title);
  const description = escapeHtml(metadata.description);
  const canonical = `${origin}${route === '/' ? '/' : route}`;
  let rendered = htmlTemplate
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${description}">`)
    .replace(/<link rel="canonical" href="[^"]+" id="seo-canonical">/, `<link rel="canonical" href="${canonical}" id="seo-canonical">`)
    .replace(/<meta property="og:title" content="[^"]*" id="og-title">/, `<meta property="og:title" content="${title}" id="og-title">`)
    .replace(/<meta property="og:description" content="[^"]*" id="og-desc">/, `<meta property="og:description" content="${description}" id="og-desc">`)
    .replace(/<meta property="og:url" content="[^"]*" id="og-url">/, `<meta property="og:url" content="${canonical}" id="og-url">`);

  const post = dailyPosts.find(item => route === `/the-daily-kava/${item.slug}`);
  const detail = detailPages.find(page => page.route === route);
  const view = detail ? detail.view : post ? 'the-daily-kava-article' : route === '/' ? 'home' : route.slice(1);
  // Serve the same readable content to visitors and crawlers before JS runs.
  // Keep all SPA views so client-side navigation still works after hydration.
  if (htmlTemplate.includes(`id="view-${view}"`)) {
    rendered = rendered.replace(/<div id="view-([^"]+)" class="spa-view"(?: style="[^"]*")?>/g,
      (_, name) => `<div id="view-${name}" class="spa-view" style="display: ${name === view ? 'block' : 'none'};">`);
  }
  if (detail) {
    const marker = detail.view === 'event-detail'
      ? '<div id="event-detail-root" class="container event-detail-shell"></div>'
      : '<div class="container" id="nearby-detail-root" style="max-width: 1040px;"></div>';
    rendered = rendered.replace(marker, () => marker.replace('</div>', detail.html + '</div>'));
  }
  if (!post && metadata.schema) {
    const schema = JSON.stringify(metadata.schema).replaceAll('<', '\\u003c');
    rendered = rendered.replace('</head>', () => `<script id="seo-json-ld" type="application/ld+json">${schema}</script>\n</head>`);
  }
  if (post) {
    const faq = (post.faq || []).map(item => `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`).join('');
    const article = `<a class="daily-back" href="/the-daily-kava">← The Daily Kava</a>
      <p class="daily-card-meta">${escapeHtml(post.category)} · ${escapeHtml(post.date)}</p>
      <h1 class="daily-article-title">${escapeHtml(post.title)}</h1>
      <p class="daily-article-dek">${escapeHtml(post.dek)}</p>
      <div class="daily-article-body">${post.body}</div>
      ${faq ? `<section class="daily-faq"><h2>Quick answers</h2>${faq}</section>` : ''}
      ${articleActions(post)}
      <p><a href="/the-daily-kava">More stories</a></p>`;
    rendered = rendered.replace('<article id="daily-kava-article-root" class="daily-article"></article>',
      () => `<article id="daily-kava-article-root" class="daily-article">${article}</article>`);
    const graph = [{
      '@type': 'BlogPosting', headline: post.title, description: post.metaDescription,
      datePublished: post.date, dateModified: post.modified,
      author: {'@type': 'Organization', name: 'Tribal Kava Lounge'},
      publisher: {'@type': 'Organization', name: 'Tribal Kava Lounge', url: origin},
      mainEntityOfPage: canonical, url: canonical, articleSection: post.category,
      keywords: (post.keywords || post.tags || []).join(', '),
      isPartOf: {'@type': 'Blog', name: 'The Daily Kava', url: `${origin}/the-daily-kava`}
    }];
    if (post.faq?.length) graph.push({'@type': 'FAQPage', mainEntity: post.faq.map(item => ({
      '@type': 'Question', name: item.question, acceptedAnswer: {'@type': 'Answer', text: item.answer}
    }))});
    const schema = JSON.stringify({'@context': 'https://schema.org', '@graph': graph}).replaceAll('<', '\\u003c');
    rendered = rendered.replace('</head>', () => `<script id="seo-json-ld" type="application/ld+json">${schema}</script>\n</head>`)
      .replace(/<meta property="og:type" content="[^"]*" id="og-type">/, '<meta property="og:type" content="article" id="og-type">');
  }
  const cards = dailyPosts.map(item => `<article class="daily-card"><h2 class="daily-card-title"><a href="/the-daily-kava/${item.slug}">${escapeHtml(item.title)}</a></h2><p>${escapeHtml(item.dek)}</p></article>`).join('\n');
  rendered = rendered.replace('<div id="daily-kava-grid" class="daily-grid"></div>', () => `<div id="daily-kava-grid" class="daily-grid">${cards}</div>`);
  return rendered;
}

for (const route of [...staticPaths, ...dailyPaths]) {
  const routeFile = route === '/'
    ? path.join(output, 'index.html')
    : path.join(output, route.slice(1), 'index.html');
  await mkdir(path.dirname(routeFile), { recursive: true });
  await writeFile(routeFile, renderRouteHtml(route, routeMetadata.get(route)));
}

console.log(`Built ${files.length} files, ${imageFiles.length} verified images, ${dailyPaths.length} Daily Kava URLs, and ${routeMetadata.size} pre-rendered routes into ${output}`);

const feedItems = [...dailyPosts].sort((a, b) => b.date.localeCompare(a.date)).map(post => {
  const url = `${origin}/the-daily-kava/${post.slug}`;
  return `<item><title>${escapeHtml(post.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${new Date(post.date + 'T12:00:00Z').toUTCString()}</pubDate><description>${escapeHtml(post.dek)}</description></item>`;
}).join('\n');
await writeFile(path.join(output, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>The Daily Kava — Tribal Kava Lounge</title><link>${origin}/the-daily-kava</link>
<description>Local guides, lounge events, and first-visit answers from West Palm Beach.</description>
<language>en-us</language><atom:link href="${origin}/feed.xml" rel="self" type="application/rss+xml"/>
${feedItems}</channel></rss>\n`);
