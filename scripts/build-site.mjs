import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runInNewContext } from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
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
  '/the-daily-kava'
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
const seoDatabaseSource = appSource.slice(seoDatabaseStart, seoDatabaseEnd);
for (const match of seoDatabaseSource.matchAll(/\n {4}'[^']+':\s*\{\n {8}title:\s*'([^']+)',\n {8}description:\s*'([^']+)',[\s\S]*?\n {8}slug:\s*'([^']+)',/g)) {
  routeMetadata.set(match[3], { title: match[1], description: match[2] });
}

const eventDatabaseStart = appSource.indexOf('const eventDatabase = {');
const eventDatabaseEnd = appSource.indexOf('\n};', eventDatabaseStart);
const eventDatabaseSource = appSource.slice(eventDatabaseStart, eventDatabaseEnd);
for (const match of eventDatabaseSource.matchAll(/\n {4}'([^']+)':\s*\{\n {8}seoKey:[^\n]+\n {8}eyebrow:[^\n]+\n {8}title:\s*'([^']+)',\n {8}intro:\s*'([^']+)',/g)) {
  routeMetadata.set(`/events/${match[1]}`, {
    title: `${match[2]} | Tribal Kava Lounge West Palm Beach`,
    description: match[3]
  });
}

const nearbyDatabaseStart = appSource.indexOf('const nearbyAreaDatabase = {');
const nearbyDatabaseEnd = appSource.indexOf('\n};', nearbyDatabaseStart);
const nearbyDatabaseSource = appSource.slice(nearbyDatabaseStart, nearbyDatabaseEnd);
for (const match of nearbyDatabaseSource.matchAll(/\n {4}'([^']+)':\s*\{\n {8}seoKey:[^\n]+\n {8}areaName:[^\n]+\n {8}eyebrow:[^\n]+\n {8}title:\s*'([^']+)',\n {8}intro:[^\n]+\n {8}description:\s*'([^']+)',/g)) {
  routeMetadata.set(`/nearby/${match[1]}`, {
    title: `${match[2]} | Tribal Kava Lounge`,
    description: match[3]
  });
}

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
  const view = post ? 'the-daily-kava-article' : route === '/' ? 'home' : route.slice(1);
  // Serve the same readable content to visitors and crawlers before JS runs.
  // Keep all SPA views so client-side navigation still works after hydration.
  if (htmlTemplate.includes(`id="view-${view}"`)) {
    rendered = rendered.replace(/<div id="view-([^"]+)" class="spa-view"(?: style="[^"]*")?>/g,
      (_, name) => `<div id="view-${name}" class="spa-view" style="display: ${name === view ? 'block' : 'none'};">`);
  }
  if (post) {
    const faq = (post.faq || []).map(item => `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`).join('');
    const article = `<a class="daily-back" href="/the-daily-kava">← The Daily Kava</a>
      <p class="daily-card-meta">${escapeHtml(post.category)} · ${escapeHtml(post.date)}</p>
      <h1 class="daily-article-title">${escapeHtml(post.title)}</h1>
      <p class="daily-article-dek">${escapeHtml(post.dek)}</p>
      <div class="daily-article-body">${post.body}</div>
      ${faq ? `<section class="daily-faq"><h2>Quick answers</h2>${faq}</section>` : ''}
      <p><a href="/menu">Menu</a> · <a href="/visit">Visit Tribal</a> · <a href="/the-daily-kava">More stories</a></p>`;
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
