// Dedicated staging packaging step. Never modifies the production dist/ tree.
import { cp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'dist');
const preview = path.join(root, 'dist-prestige-preview');
if (source === preview) throw new Error('Preview cannot overwrite production output');
await rm(preview, { recursive: true, force: true });
await cp(source, preview, { recursive: true });

const robots = '<meta name="robots" content="noindex,nofollow,noarchive">';
let pages = 0;
async function visit(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const dest = path.join(dir, entry.name);
    if (entry.isDirectory()) { await visit(dest); continue; }
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    const old = await readFile(dest, 'utf8');
    let next = old.replace(/<meta\s+name=["']robots["'][^>]*>/i, robots);
    if (next === old && !old.includes(robots)) {
      if (!/<\/head>/i.test(old)) throw new Error('Cannot add robots policy: ' + entry.name);
      next = old.replace(/<\/head>/i, robots + '\n</head>');
    }
    if (!next.includes(robots)) throw new Error('Preview robots policy missing: ' + entry.name);
    await writeFile(dest, next);
    pages++;
  }
}
await visit(preview);
if (!pages) throw new Error('No preview HTML pages built');
// Preserve any existing _headers rules and add a stronger preview-only response.
const headersPath = path.join(preview, '_headers');
const previous = await readFile(headersPath, 'utf8').catch(err => {
  if (err.code === 'ENOENT') return '';
  throw err;
});
await writeFile(headersPath,
  previous.trimEnd() + (previous ? '\n\n' : '') +
  '/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n');
await writeFile(path.join(preview, 'robots.txt'),
  'User-agent: *\nAllow: /\n# Preview is excluded by X-Robots-Tag and HTML meta robots.\n');
console.log(JSON.stringify({ preview: 'dist-prestige-preview', htmlPages: pages,
  robots: 'noindex,nofollow,noarchive', productionOutputModified: false }));
