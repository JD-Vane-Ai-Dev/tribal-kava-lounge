// Native Netlify Scheduled Function, on Tribal's existing site.
// Compares the GitHub source with the last deployed validated build.
// The secret build hook URL is never stored in the public repository.
export const config = { schedule: '15 16,17 * * *' }; // 12:15 ET; double UTC window handles DST

const repoApi = 'https://api.github.com/repos/JD-Vane-Ai-Dev/tribal-kava-lounge/commits/master';
const deployedMetadata = 'https://thetribalkavalounge.com/daily-kava-build-state.json';
const validSha = value => typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value);

export function shouldRunAt(now) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const hour = Number(parts.find(p => p.type === 'hour')?.value);
  const minute = Number(parts.find(p => p.type === 'minute')?.value);
  return hour === 12 && minute === 15;
}

export async function checkDailyKava({
  now = new Date(), request = fetch,
  buildHookUrl = globalThis.Netlify?.env?.get?.('TRIBAL_DAILY_BUILD_HOOK_URL')
    || process.env.TRIBAL_DAILY_BUILD_HOOK_URL || '',
  baseUrl = deployedMetadata, githubUrl = repoApi,
} = {}) {
  if (!shouldRunAt(now)) return { outcome: 'outside-eastern-noon-window' };
  const timeout = () => AbortSignal.timeout(9000);
  const githubResponse = await request(githubUrl, {
    headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'TribalDailyKava/1.0' },
    signal: timeout(),
  });
  if (!githubResponse.ok) return { outcome: 'github-unavailable', status: githubResponse.status };
  const revision = (await githubResponse.json()).sha;
  if (!validSha(revision)) return { outcome: 'invalid-source-revision' };

  let published = null;
  try {
    const deployedResponse = await request(baseUrl, {
      headers: { 'Cache-Control': 'no-cache' }, signal: timeout()
    });
    if (deployedResponse.ok) published = await deployedResponse.json();
  } catch {
    // No metadata yet on earlier manual deploys: request one cloud build.
  }
  if (published?.source_commit === revision)
    return { outcome: 'already-current', sourceCommit: revision.slice(0, 12) };
  if (!/^https:\/\/api\.netlify\.com\/build_hooks\/[A-Za-z0-9]+$/.test(buildHookUrl))
    return { outcome: 'build-hook-secret-unavailable' };

  const response = await request(buildHookUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: 'daily-kava-netlify-scheduler' }),
    signal: timeout(),
  });
  if (!response.ok) return { outcome: 'build-trigger-failed', status: response.status };
  return { outcome: 'cloud-build-requested', sourceCommit: revision.slice(0, 12) };
}

export default async function handler() {
  try {
    const result = await checkDailyKava();
    console.log('Daily Kava scheduled check:', JSON.stringify(result));
  } catch (error) {
    // Never log the hook URL or other credentials.
    console.error('Daily Kava scheduled check failed:', error?.name || 'unknown error');
  }
}
