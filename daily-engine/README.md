# The Daily Kava — original articles

Read [EDITORIAL.md](EDITORIAL.md) for the full editorial brief and manuscript
contract. Both kava and kratom belong across explainers, culture, history, humor,
first visits and practical lounge topics. Flavor is one part of that coverage.

## Existing publishing behavior, new content format

1. The existing Azure job runs `python3 run_daily.py run` at its existing schedule.
2. It selects one unused complete manuscript from `manuscripts/`, copies its
   exact bytes into `drafts/`, checks the article and records it in the queue.
   A missing manuscript inventory produces an explicit message and no post.
3. The existing **Publish Passing Kava Drafts** workflow rechecks current bytes.
   Passing articles stage automatically; flagged content stays held. Previously
   staged content is rebuilt and rechecked, including on selected-file retries.
4. The site build checks the whole catalog. Original articles must match their
   checked manuscript, including SEO fields and FAQs. Tests must pass.
5. The workflow deploys to the existing Azure Static Web App, verifies its exact
   catalog hash, and only then records the article as published.
6. The existing IndexNow step runs after verified deployment. Metadata, article
   HTML, visible FAQs, RSS and sitemap URLs are generated from the same catalog.

No API key is used by the drafting job. It consumes authored manuscripts; it
cannot research or write an unlimited supply of prose. The old headline fallback
has been removed. The legacy `fetch` command remains a research/discovery tool
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
