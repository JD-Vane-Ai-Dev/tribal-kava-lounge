# Tribal Kava Lounge owner launch handoff

The site is deployed. Complete these account-owner steps without sharing passwords or private keys.

## A. GoDaddy — make the branded domain live

1. Open [GoDaddy Domain Portfolio](https://dcc.godaddy.com/control/portfolio).
2. Follow the two record changes in [DNS_SETUP.md](DNS_SETUP.md).
3. Reply “DNS done” so the Azure custom hostname and SSL binding can be verified.

## B. Google Analytics 4 — connect measurement

1. Open [Google Analytics setup](https://analytics.google.com/analytics/web/provision/).
2. Create or select the Tribal Kava Lounge property.
3. Create a **Web** data stream for `https://thetribalkavalounge.com`.
4. Copy the Measurement ID that starts with `G-` and send only that ID back. It is not a secret.
5. In **Admin → Events**, mark these as key events after they first arrive:
   - `phone_call`
   - `directions`
   - `event_inquiry`
   - `event_interest`
   - `vip_sms`
   - `vip_email`
   - `generate_lead`

The site already captures campaign source/medium/name and emits the conversion events. Adding the `G-` ID activates delivery to Google Analytics.

## C. Google Search Console — verify and submit

1. Open [Search Console](https://search.google.com/search-console/welcome).
2. Choose **Domain** and enter `thetribalkavalounge.com`.
3. Copy Google’s TXT verification record into GoDaddy DNS.
4. After verification, open **Sitemaps** and submit:
   `https://thetribalkavalounge.com/sitemap.xml`

Use a Domain property, not only a URL-prefix property, so both root and `www` are covered.

## D. Google Business Profile — claim and connect

1. Open [Add or claim a Business Profile](https://business.google.com/add).
2. Use this exact identity:
   - **Name:** Tribal Kava Lounge
   - **Address:** 770 S Military Trail, Unit A1, West Palm Beach, FL 33415
   - **Phone:** (561) 355-0561
   - **Hours:** Sun–Thu 8 AM–12 AM; Fri–Sat 8 AM–1 AM
3. Use this tracked website URL:
   `https://thetribalkavalounge.com/?utm_source=google&utm_medium=organic&utm_campaign=google_business_profile`
4. Add the menu URL:
   `https://thetribalkavalounge.com/menu?utm_source=google&utm_medium=organic&utm_campaign=google_business_profile`
5. Upload current exterior, entrance, interior, signature-drink, team, and parking photos.

Do not select amenities or accessibility attributes until someone at the lounge confirms them in person.

## E. Weekly owner check

Every Monday, record:

- Google Business Profile calls, website clicks, and direction requests
- GA4 calls, directions, event interest, VIP joins, and source/medium
- In-store redemptions or “How did you hear about us?” counts
- The top Daily Kava landing pages

The goal is not traffic alone. Keep promotions that create calls, directions, event interest, and real visits.

## F. Azure conversion dashboard — already connected

Application Insights and the **Tribal Kava Conversion Dashboard** are live in
the `tribal-kava-site-rg` resource group. It reports visits, menu sessions,
directions/calls, DoorDash checkout starts, campaign sources, and drink-finder
recommendations. Controlled QA traffic is excluded. DoorDash checkout starts
measure outbound checkout intent, not a confirmed DoorDash purchase.
