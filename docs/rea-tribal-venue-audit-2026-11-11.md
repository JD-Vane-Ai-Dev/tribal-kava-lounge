# Tribal Private Events — REA design, build and psychology review
Audit date: 2026-11-11
Project: JD-Vane-Ai-Dev/tribal-kava-lounge
Page: https://thetribalkavalounge.com/private-events

## Constraints
Separate venue offering; the Tribal Kava Lounge homepage stays kava-bar focused.
Preserve owner-selected edited room photo, Netlify form action, all 16 add-on fields, valid location and actual existing venue amenities. The illustration is a styled setup concept, not an inventory guarantee.
Approved offer: $250 for 3 event hours on select off-peak dates; +$50 per 30 minutes where available; 50% non-refundable initial booking payment credited to rental, remaining 50% upon arrival before setup, separate $100 refundable damage deposit. Capacity 60 is a planning ceiling subject to legal occupancy/layout confirmation. Other services custom-quoted.

## Three design directions
- Chosen: botanical private venue — forest green, ivory and brass, real room imagery, distinct event-type entry points, visible quote CTA, clearly separated custom add-ons, WCAG-focused responsive fieldsets.
- Considered: airy ivory editorial gallery — more generic and inconsistent with Tribal's existing visual identity.
- Considered: purple flyer-first nightlife — distinctive but can overemphasize party-only use and $250 price rather than flexible event occasions.

## REA Psychological Intelligence public MCP results
Ran rea_psychological_formulation with publicly observable page features: choice framing and comprehension may influence perceived difficulty and completion; case support NOT TESTED, with alternative explanations including device, prior familiarity, acquisition source and seasonality.
Ran rea_experiment_plan: prospective test of legacy long-form structure versus four occasion shortcuts and grouped optional extras. Primary proposed outcome: genuine quote completions per qualifying page traffic, with consent-compatible measurement, not yet a live randomized experiment.
Ran rea_ui_geometry with four choices, hypothetical 100px distance and 180px target: ivory (#fff8eb) on forest green (#09170f) contrast 17.421:1. No inferred gaze, trust, feeling or timing; computations are not proof of conversion lift.

## External pattern checks (retrieved 2026-11-11)
- https://support.peerspace.com/en/articles/10119389-what-are-add-ons — optional services distinct from existing basic amenities.
- https://support.peerspace.com/en/articles/10119387-how-do-i-create-an-add-on — itemized categories and availability; do not invent supplier pricing.
- https://www.peerspace.com/resources/peerspace-vs-tagvenue/ — listing imagery, amenity detail, and layout choices; vendor-marketing source, not peer-reviewed science.
- https://summer.theivoryroomflorida.com/ — public venue example with extras and process visible, no copied art, text or prices.

## Implemented in existing source
Reworked headline to "Your event. Your space.", hero CTA and concise supporting copy. Added 4 interactive occasion shortcuts that populate existing event-type select. Made owner-selected image first on mobile and kept disclosure below image, without obscuring baked-in text. Added clear base-versus-extra offer explanation, eight focused add-on overview cards, four labeled groups preserving all 16 checkbox names, and five factually bounded FAQ items. Phone became optional while email, date/time, guest count and consent remain required. Original POST /rental-inquiry-received and Netlify form identity retained.
No new plugin, service, customer data collection, pricing, fake review or event availability.

## QA / release
Existing npm test suite: 38 API tests passing. Additional studio assertion suite covers submitted field identity and venue layout. Chromium/Playwright checked widths 360/390/768/1440px for horizontal overflow, image loading, form fields, 4 groups, 5 FAQs, occasion click->select, quote anchor, legacy route and main homepage separation. Responsive screenshots inspected, and initial caption overlay issue corrected.
Production submission not simulated with fake customer details; final signed-in booking response is not verified by mock tests.
Pending: commit, production Netlify deploy and live smoke checks. No claim of measured conversion improvement.
