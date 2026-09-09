# The Daily Kava — Content Engine

The existing pipeline discovers sources, writes an attributed headline roundup,
and checks the exact draft. Passing posts publish automatically to the live
Azure site. Flagged drafts stay in the queue for review; individual approval is
not required for passing posts.

## Automatic flow

1. The existing Azure Container Apps job keeps its 11:00 UTC schedule and pushes
   only `daily-engine/state/` and `daily-engine/drafts/` to `master`.
2. **Publish Passing Kava Drafts** runs on those pushes. A successful
   **Manual Kava Draft Fallback** run also triggers it through `workflow_run`.
3. The publisher checks current draft bytes, sources, freshness, and the editorial
   rules again. It holds excluded topics, stale or unverifiable sources,
   duplicates, and other flagged content.
   Each source headline must establish a kava, botanical-drink, or alcohol-free
   social connection; generic local food, arts, and event news does not qualify.
   Beer, brewery, wine, and other alcohol promotion is held. Explicitly
   alcohol-free drinks and kava/tea/coffee brews retain their intended meaning.
   Intake applies this same headline-level relevance check before drafting and
   prunes rejected, stale, or unattributed entries from the persisted candidate
   pool. Discovery requests the past 14 days, and sources must pass the same
   date check locally. Publisher pages must supply a
   current headline and a canonical article link on the matching publisher host;
   unresolved Google News wrappers, missing metadata, and failed source fetches
   are skipped. Publisher publication dates take precedence over RSS dates when
   available. A local location or a kava mention only in the snippet does not
   qualify an otherwise unrelated headline. Empty eligible pools create no draft.
4. Passing posts are staged in `daily-kava.js`. The site build generates their
   page metadata and sitemap entries, and the site and publisher tests must pass.
5. The workflow saves staged/held state, deploys to the existing Azure Static Web
   App, and verifies that production serves the exact catalog hash.
6. Only after live verification does the workflow record `published` status.

Every site build also runs `auto_publish.py check-catalog`, including site-only
deployments. This screens existing published entries as well as new additions.
Withdrawn records are terminal and retain their source history for deduplication;
they cannot be approved, staged, or restored to the deployed catalog by a retry.
On September 7, the unrelated BBQ/beer digest was withdrawn, removed from the
catalog and sitemap, and its former URL redirected to The Daily Kava index.

The publisher requires the repository Actions secret
`AZURE_STATIC_WEB_APPS_API_TOKEN`, containing the deployment token for the
existing `tribal-kava-lounge-site` Static Web App. If it is missing or deployment
fails, the workflow fails visibly and leaves posts staged for recovery. It does
not mark them published.

No GitHub schedule, new service, or external social posting is added. The
fallback and publishing workflows share one production concurrency group and
do not cancel a running publication.

## Local draft tools

Run from `daily-engine/`:

```bash
python3 run_daily.py fetch
python3 run_daily.py draft
python3 run_daily.py check
python3 run_daily.py status

# Full discovery → draft → check pipeline; does not deploy by itself.
python3 run_daily.py run
```

Drafts use linked, attributed source headlines. They do not invent article
summaries or takeaways from unseen full text. No LLM key is required.

## Held drafts and manual recovery

Review `hold_reason` and `compliance` in `state/queue.json`, edit the associated
`drafts/*.md` file, and commit the corrected draft to `master`. The publisher
rechecks it automatically; an old approval or passed status cannot bypass a
current failure.

To retry after a deployment/configuration failure, run **Publish Passing Kava
Drafts** on `master`. Leave `draft_file` blank to process all eligible drafts,
or enter a filename such as `digest-2026-09-07.md` to select one. Selection does
not override content checks. Existing unacknowledged staged entries are rechecked
and rebuilt before any deployment, including previously staged drafts outside a
manual selection. Entries that now fail checks are held and removed from the
pending catalog, so they cannot ride along with another passing post. If removing
pending content changes the catalog, the safe catalog is deployed even with no
new passing posts. A retry does not append duplicates.

A concurrent remote change causes a visible non-fast-forward failure. The
workflows do not force-push or auto-resolve queue conflicts. Rerun against
current `master`; if deployment succeeded but the final state push failed, the
post remains unacknowledged until it is rechecked and verified live on retry.

A manual publisher run also deploys the tested current site when no new draft
passes, so site repairs do not depend on publishing a new story. After a verified
deployment, the existing IndexNow helper submits the sitemap URLs. IndexNow
failure is reported separately and does not turn a verified publication into a
failed one.

## Search and referral visibility

The build includes article text, visible FAQs, matching BlogPosting/FAQ schema,
and article index links in the delivered HTML. These do not require JavaScript
or Search Console access to read. Metadata and sitemap entries remain dynamic.

Application Insights distinguishes organic-search referrals, recognized AI
referrals, campaigns, other referrals, and direct/unknown traffic. Explicit UTM
tags take priority, session attribution expires after inactivity, and obsolete
cross-session campaign storage is no longer reused. Referrer hostnames are
recorded without private paths or query strings.

These measurements start with deployment; old direct traffic cannot be
reclassified. A missing referrer does not prove a direct visit, and referral
counts do not measure AI citations or rankings. Google query/impression/indexing
reports still require Search Console access.

For local staging/verification from the repository root:

```bash
python3 daily-engine/auto_publish.py stage --manifest /tmp/daily-kava-manifest.json
npm test

# Run only after the staged build has actually been deployed to production.
python3 daily-engine/auto_publish.py verify-live \
  --manifest /tmp/daily-kava-manifest.json \
  --origin https://www.thetribalkavalounge.com
python3 daily-engine/auto_publish.py finalize --manifest /tmp/daily-kava-manifest.json
```

`stage` does not deploy. `finalize` refuses to acknowledge publication without
verification of the exact catalog and matching draft content.

## Layout

| Path | Purpose |
|------|---------|
| `sources.json` | RSS / Google News source list |
| `state/seen_urls.json` | Discovery deduplication |
| `state/queue.json` | Draft, passed, held, staged, and published state plus checks |
| `drafts/` | Draft source Markdown, including held content |
| `compliance.py` | Editorial, source, and publishability checks |
| `run_daily.py` | Discovery/drafting/checking CLI |
| `auto_publish.py` | Stage → verify-live → finalize CLI |
| `test_*.py` | Content and publication regression checks |
