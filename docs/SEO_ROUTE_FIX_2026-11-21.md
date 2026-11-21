# Tribal route SEO repair — 2026-11-21

- Repository: JD-Vane-Ai-Dev/tribal-kava-lounge, production branch master.
- Hosting: existing Netlify project tribal-kava-lounge-wpb, site ID 1296a8dc-a399-4fa4-9be8-13963f335311.
- Public origin: https://thetribalkavalounge.com.
- Prior production commit: c9851780eb673a65048ecbe62bbacb183fcaf88b.
- Search Console: verified siteOwner access for the non-www HTTPS property.
- Observed: homepage indexed; /menu unknown; /events, /the-daily-kava and /kava-bars-west-palm-beach discovered but not indexed. This does not prove a specific cause.
- Repair: emit only each requested view, with existing unique title, canonical, schema and readable content. Cross-document links use browser navigation; same-view detail routing remains interactive. Preserve the existing homepage and add a footer link to the local kava-bar guide.
- Validation: npm test passed (site, studio, booking, publishing schedule, analytics and all 38 API tests); all 47 sitemap routes have exactly one initial H1 and one view; seven representative routes initialize without DOM errors.
- Next acceptance: confirm production deployment, test live routes/navigation, submit existing sitemap through Search Console and inspect priority URLs again. Google controls crawl and indexing timing.
