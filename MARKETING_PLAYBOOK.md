# Tribal traffic activation

Status checked September 7, 2026. Website improvements can be deployed from this repository. External profile edits still require the account that manages that profile.

## Ready-to-use tracked links

The short links redirect to the matching site page with channel attribution. Each path uses a temporary redirect so its destination can be maintained.

| Placement | Short link | Destination |
|---|---|---|
| Google website | https://www.thetribalkavalounge.com/go/google | Home |
| Google menu | https://www.thetribalkavalounge.com/go/google-menu | Menu |
| Instagram bio | https://www.thetribalkavalounge.com/go/instagram | Home |
| Facebook website | https://www.thetribalkavalounge.com/go/facebook | Home |
| Instagram event story | https://www.thetribalkavalounge.com/go/instagram-events | Current events |
| Facebook event promotion | https://www.thetribalkavalounge.com/go/facebook-events | Current events |
| HappyKava website | https://www.thetribalkavalounge.com/go/happykava | First-visit guide |
| HappyKava menu | https://www.thetribalkavalounge.com/go/happykava-menu | Menu |
| Local partner | https://www.thetribalkavalounge.com/go/partner | First-visit guide |
| Review counter card | https://www.thetribalkavalounge.com/go/counter | Reviews + review request |

For directories that require a direct URL, use the redirect's full destination from staticwebapp.config.json. For an individual event listing, use its actual matching event page with the listing platform as utm_source, referral as utm_medium, and weekly_events as utm_campaign. Never send an event-specific listing to a different event. Give each active partner a distinct utm_source before evaluating partner performance.

## Verified gaps

| Channel | Observed state | Next action |
|---|---|---|
| Google Business Profile | Missing website submitted as a suggested edit; receipt confirmed, pending Google review. Tribal is absent from this account's managed businesses | Manager access still needed for remaining profile fields |
| Facebook | Public page website still tribalkavabar.com; this browser is logged out | Replace website with tracked current site under page management |
| Instagram | No authenticated management session verified | Set bio and event story links after sign-in |
| HappyKava | No website/menu; listing says 8 AM–2 AM daily, unlike current official site | Claim/manage existing listing or request a correction; verify hours with owner |
| HappyKava story | Tribal section lacks website link | Request website link on the existing mention |
| BestKavaBar/Mapcarta | Search still surfaces 404 S Military Trail entries | Correct existing entries to current location; distinguish current operator at former location |
| Email list | Published Google Form with required validated email and explicit consent; private responses | Form linked from site. Sending campaigns still requires a sender/workflow; do not count form opens as subscriptions |

Sources checked: https://www.facebook.com/TRIBALKAVA/ ; https://happykava.app/kava-bars/tribal-kava-bar-33415 ; https://happykava.app/stories/new-kava-bars-2026 ; https://mapcarta.com/W433869418

## HappyKava correction request, prepared and unsent

Public support contact on HappyKava: support@happykava.app

Subject: Tribal Kava Lounge website and menu links

Hi HappyKava team,

I'm helping update Tribal Kava Lounge's current online information. Thank you for featuring the lounge in your 2026 openings and relocations story. Please add our website and menu to the existing Tribal listing and a website link to the Tribal section of the story:

Website: https://www.thetribalkavalounge.com/?utm_source=happykava&utm_medium=referral&utm_campaign=directory
Menu: https://www.thetribalkavalounge.com/menu?utm_source=happykava&utm_medium=referral&utm_campaign=directory
Current location: 770 S Military Trail, Unit A1, West Palm Beach, FL 33415
Phone: (561) 355-0561

Existing listing: https://happykava.app/kava-bars/tribal-kava-bar-33415
Story: https://happykava.app/stories/new-kava-bars-2026

Your listing currently shows 8 AM–2 AM daily, while our current website shows Sun–Thu 8 AM–midnight and Fri–Sat 8 AM–1 AM. Please flag that discrepancy for confirmation with the lounge. The event descriptions and displayed start times also differ on Game Night and Loteria; please check the local timezone display against the organizer's original details.

Thanks,
JD

## Weekly operating rhythm

1. Confirm this week's events with the lounge, then share the corresponding page through social and event listings. Do not infer a recurring schedule from old marketing documents.
2. Share one useful local Daily Kava guide with a matching invitation: first visit, date night, group visit, or current event.
3. Keep the review card at checkout and ask every guest neutrally. No reward or positive-rating requirement.
4. Send event emails only to people who explicitly subscribed, honor removals, and include an unsubscribe method. Do not import customer phone numbers or addresses from orders as marketing consent.
5. Review real outcomes by source: menu views, directions, call clicks, and DoorDash clicks. Ask new in-store visitors “How did you hear about us?” and tally their answer.

## Measurement

Azure Application Insights is the active analytics system. GA4 is not configured. The website records campaign attribution and organic/AI referrers where a browser supplies them; it does not prove a purchase, completed phone call, published review, or AI citation. Review clicks are separate from directions. Email/text compose clicks are separate from recorded subscriptions and leads. Exclude campaign_medium=qa from business reporting.

Daily Kava articles are an acquisition channel: useful local answers can be found in search, shared on social, and linked by partners. Generic news volume is not a substitute for relevant visitors or outcomes. Check which article landing pages lead to menu, directions, calls, and orders before expanding publishing volume.

## Event email list

Public signup: https://docs.google.com/forms/d/e/1FAIpQLSeAs0kMJJ-7rFgeaewR6Qv4i_bLuHLcq99f8KQhRU-aO9vxCg/viewform?usp=publish-editor

Owner form: https://docs.google.com/forms/d/1dFzDuXK6Zlzv6H3mJxb0bw-IalDeGo8LNypZg8JwegQ/edit#settings

Google Forms stores responses with timestamp, email, and the required consent answer. Responses are private; no public results summary or Google sign-in requirement. Form opening is tracked as event_signup_form_open, not a completed signup. Use the private Responses tab for actual subscriptions. No automatic campaign sending is configured. Before sending, remove opt-outs and exclude QA records, include the lounge identity and unsubscribe instructions, and never expose the list in a public spreadsheet or bulk To/CC field.
