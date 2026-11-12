import assert from 'node:assert/strict';
import { checkDailyKava, shouldRunAt, config } from '../netlify/functions/daily-kava-schedule.mjs';
const commit = 'a'.repeat(40);
const prior = 'b'.repeat(40);
const hook = 'https://api.netlify.com/build_hooks/testfixtureabc123';
const winter = new Date('2026-11-11T17:15:00Z');
const summer = new Date('2026-07-11T16:15:00Z');
assert.equal(config.schedule, '15 16,17 * * *');
assert.equal(shouldRunAt(winter), true);
assert.equal(shouldRunAt(summer), true);
assert.equal(shouldRunAt(new Date('2026-11-11T16:15:00Z')), false);
assert.equal(shouldRunAt(new Date('2026-07-11T17:15:00Z')), false);
assert.equal(shouldRunAt(new Date('2026-11-11T17:14:00Z')), false);
let calls = [];
function fakeFetch(deployedCommit, opts = {}) {
  return async (url, options = {}) => {
    calls.push({ url, method: options.method || 'GET' });
    if (url.includes('api.github.com/')) return {
      ok: opts.githubOk !== false, status: opts.githubOk === false ? 403 : 200,
      json: async () => ({ sha: commit })
    };
    if (url.includes('daily-kava-build-state.json')) return {
      ok: Boolean(deployedCommit), status: deployedCommit ? 200 : 404,
      json: async () => ({ source_commit: deployedCommit })
    };
    if (url === hook) return { ok: opts.hookOk !== false, status: opts.hookOk === false ? 503 : 200 };
    throw new Error('Unexpected external network request');
  };
}
let result = await checkDailyKava({
  now: winter, request: fakeFetch(prior), buildHookUrl: hook,
});
assert.equal(result.outcome, 'cloud-build-requested');
assert.equal(calls.length, 3);
assert.equal(calls[2].method, 'POST');
calls = [];
result = await checkDailyKava({ now: winter, request: fakeFetch(commit), buildHookUrl: hook });
assert.equal(result.outcome, 'already-current');
assert.equal(calls.length, 2);
calls = [];
result = await checkDailyKava({ now: winter, request: fakeFetch(null), buildHookUrl: hook });
assert.equal(result.outcome, 'cloud-build-requested');
calls = [];
result = await checkDailyKava({ now: winter, request: fakeFetch(prior), buildHookUrl: '' });
assert.equal(result.outcome, 'build-hook-secret-unavailable');
assert.equal(calls.length, 2);
calls = [];
result = await checkDailyKava({ now: winter, request: fakeFetch(prior, { githubOk: false }), buildHookUrl: hook });
assert.equal(result.outcome, 'github-unavailable');
assert.equal(calls.length, 1);
calls = [];
result = await checkDailyKava({ now: winter, request: fakeFetch(prior, { hookOk: false }), buildHookUrl: hook });
assert.equal(result.outcome, 'build-trigger-failed');
calls = [];
result = await checkDailyKava({ now: new Date('2026-11-11T16:15:00Z'), request: fakeFetch(prior), buildHookUrl: hook });
assert.equal(result.outcome, 'outside-eastern-noon-window');
assert.equal(calls.length, 0);
console.log('Daily Kava scheduled function tests passed: DST, no unnecessary builds, secret validation, provider errors.');
