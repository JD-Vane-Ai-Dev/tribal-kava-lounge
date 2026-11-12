import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';

const manifestPath = process.argv[2];
if (!manifestPath) throw new Error('Approved-manifest path missing');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (!Array.isArray(manifest.posts) || !Array.isArray(manifest.held))
  throw new Error('Missing approval audit results');
const sourceCommit = (process.env.COMMIT_REF ||
  execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()).toLowerCase();
if (!/^[a-f0-9]{40}$/.test(sourceCommit))
  throw new Error('Build must have an exact Git commit SHA');
const articleSource = await readFile('dist/daily-kava.js');
const checksum = createHash('sha256').update(articleSource).digest('hex');
const info = {
  source_commit: sourceCommit,
  catalog_sha256: checksum,
  approved_in_build: manifest.posts.length,
  built_at: new Date().toISOString(),
};
await writeFile(path.join('dist', 'daily-kava-build-state.json'), JSON.stringify(info) + '\n');
console.log('Daily Kava build-state generated:', sourceCommit.slice(0, 12),
            'approved in build:', manifest.posts.length);
