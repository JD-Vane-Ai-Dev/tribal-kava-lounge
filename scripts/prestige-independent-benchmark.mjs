#!/usr/bin/env node
/**
 * Independent, zero-model-cost Tribal Kava benchmark.
 * Does NOT claim Lighthouse, visual/browser or conversion verification.
 * Uses only GET/HEAD against public Netlify sites, never publishes anything.
 */
const targets = [
  { name: 'prestige_preview', url: 'https://tribal-prestige-preview-20261116.netlify.app' },
  { name: 'production', url: 'https://thetribalkavalounge.com' },
];
const routes = ['/', '/menu', '/visit', '/new-here', '/the-daily-kava'];
const deadlineMs = 12000;

function count(html, pattern) { return (html.match(pattern) || []).length; }
async function request(url, method = 'GET') {
  const started = Date.now();
  const r = await fetch(url, { method, redirect: 'follow',
    signal: AbortSignal.timeout(deadlineMs),
    headers: { 'User-Agent': 'JD-Prestige-Independent-QA/1.0' } });
  const text = method === 'HEAD' ? '' : await r.text();
  return { status: r.status, finalUrl: r.url, elapsedMs: Date.now() - started,
    bytes: Number(r.headers.get('content-length')) || Buffer.byteLength(text),
    contentType: r.headers.get('content-type') || '', text };
}

function inspect(markup) {
  const title = (markup.match(/<title[^>]*>([^<]+)/i) || [])[1] || '';
  const canonical = (markup.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i) || [])[1] || null;
  const viewport = /name=["']viewport["']/i.test(markup);
  const description = /name=["']description["']/i.test(markup);
  return { title, canonical, viewport, description,
    h1Count: count(markup, /<h1[ >]/gi),
    links: count(markup, /<a[ >]/gi), images: count(markup, /<img[ >]/gi),
    openGraph: /property=["']og:image["']/i.test(markup),
    structuredData: /application\/ld\+json/i.test(markup),
    noindex: /<meta[^>]*noindex/i.test(markup) };
}

async function audit(target) {
  const report = { target: target.name, baseUrl: target.url,
    checkedAt: new Date().toISOString(), routes: [], checks: [], assets: [] };
  let homepage;
  for (const path of routes) {
    try {
      const result = await request(target.url + path);
      report.routes.push({ path, status: result.status, bytes: result.bytes,
        ms: result.elapsedMs, contentType: result.contentType });
      if (path === '/') homepage = result.text;
    } catch (error) {
      report.routes.push({ path, error: String(error.message).slice(0,120) });
    }
  }
  if (homepage) {
    report.seo = inspect(homepage);
    const checks = [
      ['routes_http_200', report.routes.every(r => r.status === 200)],
      ['single_h1', report.seo.h1Count === 1],
      ['title', report.seo.title.length > 18],
      ['viewport', report.seo.viewport],
      ['description', report.seo.description],
      ['open_graph', report.seo.openGraph],
      ['structured_data', report.seo.structuredData],
      ['canonical_to_live_domain', !!report.seo.canonical &&
        report.seo.canonical.startsWith('https://thetribalkavalounge.com')],
    ];
    report.checks = checks.map(([name, passed]) => ({ name, passed }));
    const assetPaths = ['/favicon.svg', '/images/tribal-logo-cutout.png'];
    for (const path of assetPaths) {
      try {
        const asset = await request(target.url + path, 'HEAD');
        report.assets.push({ path, status: asset.status, bytes: asset.bytes });
      } catch (error) {
        report.assets.push({ path, error: String(error.message).slice(0,120) });
      }
    }
    const logo = report.assets.find(a => a.path.endsWith('.png'));
    report.checks.push({ name: 'primary_logo_under_350kb',
      passed: !!logo && logo.status === 200 && logo.bytes > 0 && logo.bytes <= 350000 });
  }
  report.score = {
    checksPassed: report.checks.filter(x => x.passed).length,
    checksTotal: report.checks.length,
    category: 'HTTP and static markup only; NOT visual, Lighthouse or business-quality score',
  };
  return report;
}

async function main() {
  const results = [];
  for (const target of targets) results.push(await audit(target));
  console.log(JSON.stringify({ benchmark: 'tribal-prestige-static-v1',
    modelCalls: 0, publicationChanges: 0, results }, null, 2));
  if (results.some(r => r.routes.some(x => x.status !== 200) ||
      r.checks.some(x => !x.passed))) process.exitCode = 1;
}
main().catch(e => { console.error('Benchmark error:', e.message); process.exitCode = 2; });
