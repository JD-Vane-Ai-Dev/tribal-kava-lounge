# Tribal Kava Lounge — Technical SEO and indexing audit
**Date:** 2026-11-11 (Eastern)
**Canonical website:** https://thetribalkavalounge.com
**Existing Netlify project:** tribal-kava-lounge-wpb — site 1296a8dc-a399-4fa4-9be8-13963f335311
**Verified production deploy:** 6af4dd3f99bfe0569db5f871
**Source commit:** 816a05e8d5ba

## Completed live verification
- Sitemap https://thetribalkavalounge.com/sitemap.xml: valid XML with 47 canonical URLs.
- All 47 sitemap URLs returned HTTP 200 in the live follow-up crawl.
- Each of the 47 sitemap pages declared a canonical on the real apex host; no canonical mismatches in the live follow-up crawl.
- Zero audited sitemap pages had an explicit noindex directive; all audited HTML JSON-LD scripts parsed.
- https://www.thetribalkavalounge.com/menu permanently redirects (HTTP 301) to https://thetribalkavalounge.com/menu.
- robots.txt allows crawlers and advertises the apex-host sitemap.
- Nonexistent page and nonexistent Daily Kava article both returned HTTP 404, with an on-brand noindex 404 page.
- Existing lounge homepage and private-events page remained live, with the owner-approved event room image and new REA venue UX intact.
- Existing first-party analytics frontend uses site-config.js firstPartyTracking:true to send events to the existing Netlify tribal-track function; Google Analytics tracking ID is currently blank, so GA4 is not claimed to be active.

## Implemented corrections
1. Aligned site generators, rendered HTML, social metadata, structured data, sitemap, robots.txt, first-party config, content-publisher verification origin and relevant owner documentation to the existing non-www primary domain.
2. Removed Netlify catch-all rewrite of unknown URLs to /index.html (an HTTP-200 soft-404 trap).
3. Added an SEO-safe, noindex 404 HTML page with useful navigation and build checks.
4. Shortened homepage and private-events meta descriptions.
5. Preserved all approved Daily Kava articles and events content; no draft was published to satisfy this audit.
6. Validated npm test including 38 API tests, preview-deployed and checked expected 200/404 routes, and production-deployed a freshly rebuilt merged source that includes the simultaneous REA venue improvements.

## Lower-priority on-page cleanup
- 14 rendered page titles exceed 65 characters. These are display recommendations, not an automatic penalty or index exclusion.
- 9 meta descriptions exceed 165 characters. Google may rewrite descriptions; no strict Google character limit.
- 45 HTML documents include multiple H1 elements because the old SPA bundle renders several hidden route panels within each server response. Google does not categorically prohibit multiple H1s, but reducing off-route markup would improve page semantics and crawl clarity. Treat as optional architectural refactor requiring hydration/regression tests.
- One shared logo image has intentionally empty alt text, replicated across 47 pages. Empty alt on redundant/decorative branding is valid accessibility practice; the crawler counted these but they are not necessarily missing descriptive text defects.

## Search Console / Google indexability: not independently verified
- GSC Wizard's connector returned `payment_required` / `subscription_required`: the trial has ended and no active subscription is present. Its site, sitemap, URL inspection and metrics calls are unavailable.
- The separately connected Composio Google Search Console account successfully listed `https://www.thetribalkavalounge.com/` with Google permission `siteUnverifiedUser`. Google refused its sitemap request with 403 insufficient site permission.
- The verified apex canonical property `https://thetribalkavalounge.com/` was not among the returned connected Search Console properties.
- A Google site-verification meta tag is present in the live homepage source, but whether its token belongs to the linked Google account cannot be determined from public HTML.
- **Therefore Google-indexed URL counts, exclusions, last crawl dates, Google-selected canonicals, and Search performance numbers remain UNKNOWN.** Do not infer them from HTTP 200, sitemap presence or a `site:` query.

## Smallest action to unblock Google URL Inspection
With the connected Google account, add or select the **URL-prefix property** `https://thetribalkavalounge.com/` at https://search.google.com/search-console and complete HTML-tag verification. The page already contains a site-verification meta tag; if Google supplies a different HTML tag for this account, obtain that tag and add it to the existing live site, then recheck. After Google shows verified ownership, the already connected Composio Google Search Console integration can retry list sitemaps, query traffic, inspect 5–10 representative URLs and assess true indexed/not-indexed causes without requiring a GSC Wizard paid subscription.

## Hosting architecture and usage
All articles are static routes of the existing Netlify site, not another site or server. The Daily Kava publisher presently executes as a macOS LaunchAgent and deploys to the same Netlify site. Migrating execution into existing-project Netlify Scheduled/Background Functions is technically supported, but it has **not** been implemented in this audit. Scheduled Functions have a 30-second limit and consume existing-team function compute and request usage; a full Python content-build-deploy job requires a deliberate backend redesign, not merely adding a cron declaration.

## Follow-up
1. Verify the apex Google Search Console URL-prefix property in the connected account.
2. Retrieve Google URL Inspection verdicts for homepage, menu, Daily Kava index, 2–3 articles, private-events and selected location pages.
3. Submit/resubmit the reachable apex-host sitemap after ownership is verified; submission requests crawling but does not ensure indexing.
4. Prioritize actual index coverage/canonical errors; later address verbose titles/metas and hidden SPA H1 markup as site maintenance.
