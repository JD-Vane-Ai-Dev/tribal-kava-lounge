# DESIGN.md — Tribal Kava Lounge / Prestige Botanical Editorial
Date: 2026-11-22
Status: implementation only in a separate review branch; NOT production approved.
Baseline: origin/master 2c6b50c.

## Brand intent
Tribal is a kava bar and West Palm Beach third place, not a banquet/event-rental venue.
Preserve authentic on-location Tribal photos, existing Daily Kava, kava and drinks,
community, first-timer guidance, address, confirmed hours and menu prices.

## Reference decisions
Kava Culture: community-first beverage language; keep menu findable.
Decades Kava: first-visit and visit directions have explicit navigation.
Ritual Coffee: expressive product/editorial typography and photographic breathing room;
do not import its retail navigation or any copyrighted imagery.
Original Tribal baseline: mobile photograph appeared before headline and CTA. Correct this.

## Three rendered directions
A Botanical Editorial: cream/pine editorial split, large Fraunces headline, image framing.
B Night Garden: immersive plum evening panel and compact condensed typographic staging.
C Neighborhood Zine: printed-paper poster, angular photograph, bold and playful hierarchy.
All three render the same core information and the same menu/directions/first-visit actions.

## Selected visual system: Botanical Editorial
Color: forest #15392b, parchment #f5f0e2, deep pine #163b2c,
fresh citron #cbe98f, sage #5d805b, peach #e3a476.
Fraunces editorial headings (serif/italic), DM Sans body and utility labels.
Asymmetric cream-left, human-photo-right 48:52 layout with oversized editorial heading;
rounded inward photographic corner. Use real Tribal photo only, not generated venue imagery.
At phone widths 320–430, show headline, copy, menu and directions before photograph.
Minimum CTA size 44px. Compact mobile nav keeps Daily Kava and Find Us available.
Sections alternate: welcome on forest, discovery on green, lined-paper menu,
deep-forest Daily Kava story bulletin, cream Visit section. No generic SaaS cards.

## Motion and engineering budget
Keep actual 3-photo carousel with next/previous, dot, pause and accessible status.
No 3D or heavyweight animation; automatically stop for prefers-reduced-motion.
Retain SEO, schema, canonical, dynamic 3 Daily Kava cards, menu and age labels,
Google listing and directions, Netlify Forms, Studio, booking and analytics.
Do not modify production or automatically publish.

## Acceptance scope
Local full repository suite passes; Playwright verifies 320/390/768/1440 widths,
menu journey, keyboard focus, reduced motion, image HTTP 200, no script errors,
CTA contrast 10.87:1 and body contrast 5.47:1.
Netlify deploy-preview and branch-deploy build with noindex meta and X-Robots-Tag.
A separate independent visual reviewer, production deploy and field performance
are not complete and must not be reported as completed.
\n## Independent reviewer revision (2026-11-22)\nFirst independent blind critic rated hierarchy 3/5 because the mobile information row was crowded and detected similarity to a competing lounge headline. The selected page now uses an original local-identity headline Make it your place., removes the redundant mobile utility line, and uses a legible two-column address/hours strip. The after-fix independent review remains separate from the builder.\n

## Final refinement for independent visual QA
- New original editorial line: Make it your place.
- Information hierarchy consistent across phone/tablet/desktop: 12–13px address and opening hours, with separate PLAN YOUR VISIT label. Redundant microcaps removed.
- Photo carousel controls moved to lower image edge in one high-contrast cluster; decorative badge removed; caption separated.
- Existing owned Banana Pudding Cloud menu photo now features in drinks editorial section as an actual beverage still.
- Final local browser checks cover menu navigation, all media, keyboard access and carousel control placement at 320/390/768/1440.


## Accessibility fix after independent review 3
The independent critic correctly found dark-on-dark text in the drink-discovery section. A red browser regression reproduced the defect at 320, 390, 768 and 1440px. The final section uses an accessible pale-sage background with dark forest text, a distinct outlined menu action, and explicit computed-CSS contrast checks. Visit details also use larger text.
No fresh independent visual approval has yet been obtained for this latest revision. Formal acceptance stays pending, even though technical checks pass.
