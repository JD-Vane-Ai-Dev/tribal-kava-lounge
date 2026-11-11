# The Daily Kava — original articles

Read [EDITORIAL.md](EDITORIAL.md) for the full editorial brief and manuscript
contract. Both kava and kratom belong across explainers, culture, history, humor,
first visits and practical lounge topics. Flavor is one part of that coverage.

## Existing publishing behavior, new content format

1. The former Azure scheduled writer is no longer assumed active after the
   Netlify hosting migration. The authoring schedule/provider must be
   reconnected before treating the blog as updated daily; manual drafting
   and held-draft review remain available.
2. It selects one unused complete manuscript from `manuscripts/`, copies its
   exact bytes into `drafts/`, checks the article and records it in the queue.
   A missing manuscript inventory produces an explicit message and no post.
3. The existing **Publish Passing Kava Drafts** workflow rechecks current bytes.
   Passing articles stage automatically; flagged content stays held. Previously
   staged content is rebuilt and rechecked, including on selected-file retries.
4. The site build checks the whole catalog. Original articles must match their
   checked manuscript, including SEO fields and FAQs. Tests must pass.
5. The workflow deploys the validated catalog and existing serverless
   functions to the existing Netlify production site. It verifies the exact
   live catalog hash before recording any article as published. Azure Static
   Web Apps is not used as a publisher.
6. The existing IndexNow step runs after verified deployment. Metadata, article
   HTML, visible FAQs, RSS and sitemap URLs are generated from the same catalog.

When `TRIBAL_WRITER_ENABLED=1`, the job writes one original article per UTC day
from `writer-ready` topic briefs (Foundry `gpt-5-mini`, Key Vault credential).
Empty `manuscripts/` is expected in that mode. The old headline fallback has
been removed. The legacy `fetch` command remains a research/discovery tool
only and is no longer part of the automatic draft run. Its 14-day news-source
filter does not apply to evergreen manuscripts.

## Local commands

```bash
python3 daily-engine/run_daily.py run
python3 daily-engine/run_daily.py check
python3 daily-engine/run_daily.py status
python3 -m unittest discover -s daily-engine -p 'test_*.py' -v
python3 daily-engine/auto_publish.py stage --manifest /tmp/daily-kava-manifest.json
npm test
```

Staging does not deploy. The GitHub workflow performs deployment. Never run
`finalize` without `verify-live` against the actual production origin.

A manual **Publish Passing Kava Drafts** run on `master` can retry deployment or
publish a tested site-only change. Leave the draft selector empty to process all
eligible items. It does not override holds. Deployment failures remain staged;
concurrent remote updates fail visibly rather than force-pushing.

## September 9 editorial migration

Three suitable evergreen articles were rewritten in place: first-visit FAQ,
kava taste, and group meetups. Three new articles cover kratom menu literacy,
kratom flavor, and everyday lounge etiquette. Eleven other useful original
articles retain their URLs. An outdated rotating-event claim was corrected.

The September 9 outbound digest was retired and redirected to the blog index.
Nine held legacy digests were retired with their source history preserved; the
previously withdrawn September 7 digest remains withdrawn. The dated migration
record is `editorial-migration.json`. A draft's former pass or approval never
bypasses the new original-article checks.

## Files

- `EDITORIAL.md`: authoring and sourcing instructions.
- `topic-plan.json`: distinct topic briefs; not publishable manuscripts.
- `manuscripts/`: complete articles waiting for the existing daily intake.
- `drafts/`: checked originals and historical withdrawn digests.
- `state/queue.json`: exact-content checks and publication state.
- `compliance.py`: article contract and editorial gates.
- `auto_publish.py`: stage, verify production, finalize.
- `test_*.py`: editorial and publication-boundary regression tests.

## Mac-based approved-post publisher (GitHub Actions fallback)

The project includes `scripts/daily-kava-local-publisher.sh`, which stages and checks
existing Daily Kava manuscripts in an isolated temporary Git worktree. If a passing,
unpublished draft exists, it runs the full site test suite, pushes a safe fast-forward
catalog update to the existing GitHub repository, publishes directly to the existing
Netlify site, verifies the exact live catalog hash, and only then acknowledges the
post as published. Held or withdrawn drafts cannot be forced through this path.

It uses the signed-in Mac user's existing Git and Netlify sessions. The local
LaunchAgent runs from an Application Support copy of the repository because macOS
privacy controls can deny background access to Documents. Its default schedule is
12:15 PM in the Mac's local timezone, plus a check when its login session starts.
The Mac must be powered on, connected, and signed into both services. The job
performs no deployment when there are no passing drafts.

**Important:** This replaces the publishing *executor*, not the old Azure model
writer or authoring schedule. No newly researched manuscripts are invented or
published when the editorial inventory is empty. The user must supply a validated
writer/provider before automatic *new article generation* is restored.
