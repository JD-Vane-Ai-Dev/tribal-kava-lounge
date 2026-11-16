# Tribal Prestige independent benchmark — 2026-11-16

## Inputs and outputs

- Preview: https://tribal-prestige-preview-20261116.netlify.app/
- Production: https://thetribalkavalounge.com/
- Reproducible script: `node scripts/prestige-independent-benchmark.mjs`
- Working runtime: temporary Node.js environment in existing Floot Mission
  Control VM. No Railway and no paid model calls.
- Full browser run: https://agent.tinyfish.ai/runs/98f1da7d-9b7e-427e-8930-dd7252242742

## Independent HTTP and markup evidence

At baseline, both preview and production responded HTTP 200 to
`/`, `/menu`, `/visit`, `/new-here`, and `/the-daily-kava`.

Each passed all eight static SEO/markup checks: successful routes, a single
H1, nontrivial page title, viewport metadata, meta description, OpenGraph
image, JSON-LD, and a canonical URL pointing to the production domain.

Both fail the separately defined 350,000-byte primary-logo asset target:
`/images/tribal-logo-cutout.png` is **1,222,766 bytes**. This is an
asset-size failure, NOT a measured Lighthouse score or LCP metric.

The preview homepage itself includes 26 anchors and 8 image elements;
production includes 25 anchors and 6 images in the baseline static markup.
All 16 sampled internal routes/assets in the preview earlier returned 200.

## Browser visual acceptance and bug

TinyFish completed a public read-only visual audit: split dark-green homepage
hero with location headline, real lounge/game-night imagery, navigation,
menu/onboarding CTAs, weekly events, and floating Kava Guide. It observed
consistent visual structure and noted that CTA click success, interactive
filters, keyboard accessibility, mobile rendering, and contrast ratios were
NOT tested. Do not invent those results.

The browser reported a hard 404 at `/the-lounge`. Independent HTTP checks
confirmed both preview and production return HTTP 404 with
`Page Not Found | Tribal Kava Lounge`.

**Source-only fix staged**: in the existing site build script,
`dist/_redirects` now includes:

```
/the-lounge /#experience 301
/the-lounge/ /#experience 301
```

The source passed `node --check`, and the newline-separated redirect content
was validated. It has not been uploaded to Netlify. The existing Netlify
preview deploy is an API upload (not linked to this Git branch), so a GitHub
commit alone does **not** publish the fix. Current HTTP 404 remains until
a new artifact is uploaded and the redirect verified.

`/the-lounge` was added to the repeatable test route list so the next
benchmark reports this issue as failing until live deployment fixes it.

## Remaining acceptance

1. Regenerate and upload the existing preview artifact (not production).
2. Verify that `/the-lounge` returns a live 301 to `/#experience`, with
   the destination loading correctly.
3. Optimize the alpha-preserving logo PNG to WebP/AVIF and replace its
   references only after visual comparison, then remeasure asset transfer.
4. Test 390px iPhone viewport navigation, screenshots, overflow, CTA targets,
   and menu filters with a browser that supports viewport control.
5. Perform real Lighthouse/mobile, WCAG keyboard and color-contrast audits.
6. Compare equivalent Work, Codex, and JD OS implementations with consistent
   requirements, time, cost, human interventions and quality rubrics.
   These three-way comparative results do NOT yet exist.

## No production writes

This branch/PR does not update the active Netlify deployment or change the
production domain. Work is staged for review.
